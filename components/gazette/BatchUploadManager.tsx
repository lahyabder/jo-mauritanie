'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { UploadCloud, File as FileIcon, AlertCircle, Loader2, FileText, CheckCircle, XCircle } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

type QueueStatus = 'pending' | 'checking' | 'warning' | 'uploading' | 'processing' | 'completed' | 'error';

interface QueueItem {
  id: string;
  file: File;
  status: QueueStatus;
  issueNumber: string;
  jobId?: string;
  error?: string;
  progress?: number; // 0-100 based on steps
}

const STEPS = 5;

export default function BatchUploadManager({ isAr = false }: { isAr?: boolean }) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [language, setLanguage] = useState<'ar' | 'fr'>('ar');
  
  const supabase = createClient();
  const channelRef = useRef<any>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
    addFilesToQueue(droppedFiles);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).filter(f => f.type === 'application/pdf');
      addFilesToQueue(selectedFiles);
    }
  };

  const addFilesToQueue = (files: File[]) => {
    const newItems: QueueItem[] = files.map(file => {
      // Try to auto-extract issue number from filename
      let issueNumber = '';
      const textWithoutYears = file.name.replace(/\b(19|20)\d{2}\b/g, '');
      const match = textWithoutYears.match(/(?:jo[_\-]?|number[_\-]?|numero[_\-]?|عدد[_\-]?)?(\d{3,5})/i);
      if (match && match[1]) {
        issueNumber = match[1];
      }
      return {
        id: Math.random().toString(36).substring(7),
        file,
        status: 'pending',
        issueNumber
      };
    });
    setQueue(prev => [...prev, ...newItems]);
  };

  const updateQueueItem = (id: string, updates: Partial<QueueItem>) => {
    setQueue(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const removeQueueItem = (id: string) => {
    setQueue(prev => prev.map(item => item.id === id ? { ...item, status: 'error', error: 'Removed' } : item).filter(item => item.id !== id));
  };

  const processNextInQueue = async (currentQueue: QueueItem[]) => {
    const nextItem = currentQueue.find(item => item.status === 'pending' || item.status === 'warning');
    if (!nextItem) {
      setIsProcessingQueue(false);
      return;
    }

    // Process this item
    try {
      // 1. Check if issue exists (unless it's already a warning, which means user confirmed)
      if (nextItem.status !== 'warning' && nextItem.issueNumber) {
        updateQueueItem(nextItem.id, { status: 'checking' });
        const checkRes = await fetch(`/api/check-issue?issueNumber=${nextItem.issueNumber}&language=${language}`);
        const checkData = await checkRes.json();
        
        if (checkData.exists) {
          // Pause queue for confirmation
          updateQueueItem(nextItem.id, { status: 'warning', error: isAr ? 'هذا العدد موجود مسبقاً.' : 'Ce numéro existe déjà.' });
          setIsProcessingQueue(false); // Stop the queue until user confirms
          return;
        }
      }

      // 2. Upload
      updateQueueItem(nextItem.id, { status: 'uploading' });
      const formData = new FormData();
      formData.append('language', language);
      if (nextItem.issueNumber) formData.append('issueNumber', nextItem.issueNumber);
      formData.append('file', nextItem.file);

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      
      const jobId = data.jobId;
      updateQueueItem(nextItem.id, { status: 'processing', jobId, progress: 20 });

      // 3. Poll Supabase for job completion
      pollJobStatus(nextItem.id, jobId);

    } catch (err: any) {
      console.error(err);
      updateQueueItem(nextItem.id, { status: 'error', error: err.message || 'Unknown error' });
      // Continue to next item even if error
      setTimeout(() => triggerNext(), 1000);
    }
  };

  const triggerNext = () => {
    setQueue(prev => {
      setTimeout(() => processNextInQueue(prev), 100);
      return prev;
    });
  };

  const pollJobStatus = (itemId: string, jobId: string) => {
    // We subscribe to realtime changes for this job
    const channel = supabase
      .channel(`sync_log_${jobId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sync_logs', filter: `id=eq.${jobId}` },
        (payload) => {
          const updated = payload.new as any;
          const s = updated.status;
          
          let progress = 20;
          if (updated.documents_extracted > 0) progress = 60;
          if (updated.persons_extracted > 0 || updated.institutions_extracted > 0) progress = 80;

          if (s === 'completed' || s === 'done') {
            updateQueueItem(itemId, { status: 'completed', progress: 100 });
            supabase.removeChannel(channel);
            triggerNext();
          } else if (s === 'error' || s === 'failed') {
            updateQueueItem(itemId, { status: 'error', error: updated.error_message || 'Processing failed', progress: 100 });
            supabase.removeChannel(channel);
            triggerNext();
          } else {
            updateQueueItem(itemId, { progress });
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
  };

  const startQueue = () => {
    setIsProcessingQueue(true);
    triggerNext();
  };

  // Cleanup channels on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [supabase]);

  return (
    <div className="w-full max-w-4xl mx-auto mt-8 space-y-6">
      
      {/* Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-10 text-center transition-all ${
          isDragging ? 'border-blue-500 bg-blue-50/50' : 'border-gray-300 hover:border-gray-400 bg-gray-50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
            <UploadCloud size={28} />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{isAr ? 'اسحب ملفات PDF هنا' : 'Glissez les fichiers PDF ici'}</p>
            <p className="text-sm text-gray-500 mt-1">{isAr ? 'يمكنك تحديد أكثر من ملف دفعة واحدة' : 'Vous pouvez sélectionner plusieurs fichiers'}</p>
          </div>
          <label className="px-5 py-2 bg-gray-900 text-white rounded-lg cursor-pointer hover:bg-gray-800 transition-colors font-medium text-sm">
            {isAr ? 'اختر ملفات PDF' : 'Choisir des fichiers PDF'}
            <input type="file" className="hidden" accept="application/pdf" multiple onChange={handleFileChange} />
          </label>
        </div>
      </div>

      {/* Global Settings */}
      {queue.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">
              {isAr ? 'لغة الملفات (الأساسية):' : 'Langue des fichiers:'}
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'ar' | 'fr')}
              disabled={isProcessingQueue}
              className="border-gray-300 rounded-lg shadow-sm text-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="ar">{isAr ? 'العربية' : 'Arabe'}</option>
              <option value="fr">{isAr ? 'الفرنسية' : 'Français'}</option>
            </select>
          </div>
          
          <button
            onClick={startQueue}
            disabled={isProcessingQueue || queue.every(q => q.status === 'completed' || q.status === 'error')}
            className={`px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-all ${
              !isProcessingQueue && queue.some(q => q.status === 'pending' || q.status === 'warning')
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isProcessingQueue ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> {isAr ? 'جاري معالجة الطابور...' : 'Traitement en cours...'}</>
            ) : (
              isAr ? 'بدء معالجة الطابور' : 'Démarrer le traitement'
            )}
          </button>
        </div>
      )}

      {/* Queue List */}
      {queue.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-gray-50 border-b border-gray-200 px-5 py-3">
            <h3 className="font-semibold text-gray-800">{isAr ? 'طابور الملفات' : 'File d\'attente'} ({queue.length})</h3>
          </div>
          <ul className="divide-y divide-gray-100">
            {queue.map(item => (
              <li key={item.id} className="p-5 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    {item.status === 'completed' ? <CheckCircle className="text-green-500 w-8 h-8" /> :
                     item.status === 'error' ? <XCircle className="text-red-500 w-8 h-8" /> :
                     item.status === 'warning' ? <AlertCircle className="text-amber-500 w-8 h-8" /> :
                     (item.status === 'uploading' || item.status === 'processing' || item.status === 'checking') ? <Loader2 className="text-blue-500 w-8 h-8 animate-spin" /> :
                     <FileIcon className="text-gray-400 w-8 h-8" />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate" dir="ltr">{item.file.name}</p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                      <span>{(item.file.size / 1024 / 1024).toFixed(2)} MB</span>
                      <div className="flex items-center gap-1">
                        <span>{isAr ? 'رقم العدد:' : 'Numéro:'}</span>
                        <input 
                          type="text" 
                          value={item.issueNumber} 
                          onChange={(e) => updateQueueItem(item.id, { issueNumber: e.target.value })}
                          disabled={item.status !== 'pending' && item.status !== 'warning'}
                          className="border border-gray-200 rounded px-1.5 py-0.5 w-16 text-center text-gray-800 bg-white disabled:bg-transparent disabled:border-transparent"
                        />
                      </div>
                    </div>
                    
                    {/* Status Text & Progress */}
                    <div className="mt-2">
                      {item.status === 'pending' && <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{isAr ? 'في الانتظار' : 'En attente'}</span>}
                      {item.status === 'checking' && <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{isAr ? 'جاري التحقق...' : 'Vérification...'}</span>}
                      {item.status === 'uploading' && <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{isAr ? 'جاري الرفع...' : 'Téléversement...'}</span>}
                      {item.status === 'processing' && (
                        <div className="w-full">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-blue-600">{isAr ? 'جاري تحليل الذكاء الاصطناعي...' : 'Analyse IA en cours...'}</span>
                            <span className="text-gray-500">{item.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-500" style={{ width: `${item.progress}%` }}></div>
                          </div>
                        </div>
                      )}
                      {item.status === 'completed' && <span className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded">{isAr ? 'اكتملت المعالجة بنجاح' : 'Terminé avec succès'}</span>}
                      
                      {item.status === 'warning' && (
                        <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <p className="text-xs text-amber-800 mb-2 font-medium">{item.error || 'هذا العدد موجود مسبقاً. المتابعة ستحذف البيانات القديمة.'}</p>
                          <div className="flex gap-2">
                            <button onClick={() => {
                              updateQueueItem(item.id, { status: 'pending' }); // Reset to pending
                              startQueue(); // Resume queue
                            }} className="px-3 py-1 bg-amber-600 text-white text-xs rounded font-medium hover:bg-amber-700">{isAr ? 'تأكيد ومتابعة' : 'Confirmer'}</button>
                            <button onClick={() => removeQueueItem(item.id)} className="px-3 py-1 bg-white border border-gray-300 text-gray-700 text-xs rounded font-medium hover:bg-gray-50">{isAr ? 'تخطي وإلغاء' : 'Ignorer'}</button>
                          </div>
                        </div>
                      )}
                      
                      {item.status === 'error' && (
                        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-xs text-red-800 mb-2 font-medium">{item.error || 'حدث خطأ'}</p>
                          <div className="flex gap-2">
                            <button onClick={() => {
                              updateQueueItem(item.id, { status: 'pending', error: undefined, progress: 0 });
                              startQueue();
                            }} className="px-3 py-1 bg-red-600 text-white text-xs rounded font-medium hover:bg-red-700">{isAr ? 'إعادة المحاولة' : 'Réessayer'}</button>
                            <button onClick={() => removeQueueItem(item.id)} className="px-3 py-1 bg-white border border-gray-300 text-gray-700 text-xs rounded font-medium hover:bg-gray-50">{isAr ? 'إزالة' : 'Supprimer'}</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  {item.status === 'pending' && (
                    <button onClick={() => removeQueueItem(item.id)} className="text-gray-400 hover:text-red-500 p-2">
                      <XCircle size={20} />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
