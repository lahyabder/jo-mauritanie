'use client';

import { useState, useCallback, useEffect } from 'react';
import { UploadCloud, File, AlertCircle, Loader2, Link2, FileText, Hash } from 'lucide-react';

type Mode = 'file' | 'url';

export default function UploadDropzone({ onUploadSuccess, isAr = false }: { onUploadSuccess: (jobId: string) => void; isAr?: boolean }) {
  const [mode, setMode] = useState<Mode>('file');
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState('');
  const [language, setLanguage] = useState<'ar' | 'fr'>('ar');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [issueNumber, setIssueNumber] = useState<string>('');
  const [showWarning, setShowWarning] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  // Attempt to extract issue number from filename or URL
  useEffect(() => {
    const textToSearch = mode === 'file' && file ? file.name : mode === 'url' ? pdfUrl : '';
    if (textToSearch && !issueNumber) {
      const textWithoutYears = textToSearch.replace(/\b(19|20)\d{2}\b/g, '');
      const match = textWithoutYears.match(/(?:jo[_\-]?|number[_\-]?|numero[_\-]?|عدد[_\-]?)?(\d{3,5})/i);
      if (match && match[1]) {
        setIssueNumber(match[1]);
      }
    }
  }, [file, pdfUrl, mode]);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile?.type === 'application/pdf') { setFile(droppedFile); setError(null); }
    else setError(isAr ? 'الملفات المدعومة فقط: PDF' : 'Only PDF files are supported.');
  }, [isAr]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f?.type === 'application/pdf') { setFile(f); setError(null); }
    else setError(isAr ? 'الملفات المدعومة فقط: PDF' : 'Only PDF files are supported.');
  };

  const canSubmit = mode === 'file' ? !!file : pdfUrl.trim().toLowerCase().endsWith('.pdf');

  const handleUpload = async (forceOverwrite = false) => {
    if (!canSubmit) return;
    
    // Check if issue exists
    if (!forceOverwrite && issueNumber) {
      setIsChecking(true);
      setError(null);
      try {
        const checkRes = await fetch(`/api/check-issue?issueNumber=${issueNumber}`);
        const checkData = await checkRes.json();
        setIsChecking(false);
        if (checkData.exists) {
          setShowWarning(true);
          return;
        }
      } catch (err) {
        setIsChecking(false);
        console.error('Failed to check issue:', err);
        // Continue anyway if check fails
      }
    }

    setShowWarning(false);
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('language', language);
    if (issueNumber) {
      formData.append('issueNumber', issueNumber);
    }

    if (mode === 'file' && file) {
      formData.append('file', file);
    } else {
      formData.append('pdfUrl', pdfUrl.trim());
    }

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      onUploadSuccess(data.jobId);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-8 space-y-4">
      {/* Mode Tabs */}
      <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-gray-50 p-1 gap-1">
        {([
          { key: 'file', labelAr: 'رفع ملف PDF', labelFr: 'Téléverser un PDF', icon: FileText },
          { key: 'url', labelAr: 'رابط PDF مباشر', labelFr: 'Lien PDF direct', icon: Link2 },
        ] as { key: Mode; labelAr: string; labelFr: string; icon: any }[]).map(({ key, labelAr, labelFr, icon: Icon }) => (
          <button
            key={key}
            onClick={() => { setMode(key); setError(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              mode === key
                ? 'bg-white shadow-sm text-gray-900 border border-gray-200'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {isAr ? labelAr : labelFr}
          </button>
        ))}
      </div>

      {/* File Drop Zone */}
      {mode === 'file' && (
        <div
          className={`border-2 border-dashed rounded-xl p-10 text-center transition-all ${
            isDragging ? 'border-blue-500 bg-blue-50/50' : 'border-gray-300 hover:border-gray-400 bg-gray-50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {!file ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                <UploadCloud size={28} />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{isAr ? 'اسحب ملف PDF هنا' : 'Glissez un PDF ici'}</p>
                <p className="text-sm text-gray-500 mt-1">{isAr ? 'أو انقر لاختيار ملف' : 'ou cliquez pour sélectionner'}</p>
              </div>
              <label className="px-5 py-2 bg-gray-900 text-white rounded-lg cursor-pointer hover:bg-gray-800 transition-colors font-medium text-sm">
                {isAr ? 'اختر ملف PDF' : 'Choisir un PDF'}
                <input type="file" className="hidden" accept="application/pdf" onChange={handleFileChange} />
              </label>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-5">
              <div className="flex items-center p-4 bg-white rounded-xl shadow-sm border border-gray-200 w-full">
                <File className="text-red-500 flex-shrink-0" size={28} />
                <div className="flex-1 min-w-0 mx-4 text-start">
                  <p className="text-sm font-semibold text-gray-900 truncate">{file.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button onClick={() => setFile(null)} className="text-gray-400 hover:text-gray-600 p-1" disabled={uploading}>✕</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* URL Input */}
      {mode === 'url' && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {isAr ? 'رابط PDF المباشر (من msgg.gov.mr أو غيره)' : 'Lien direct vers le PDF'}
          </label>
          <input
            type="url"
            value={pdfUrl}
            onChange={(e) => setPdfUrl(e.target.value)}
            placeholder="https://msgg.gov.mr/.../jo_1234.pdf"
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition font-mono"
            dir="ltr"
          />
          {pdfUrl && !pdfUrl.toLowerCase().endsWith('.pdf') && (
            <p className="text-xs text-amber-600 mt-2">{isAr ? '⚠️ الرابط يجب أن ينتهي بـ .pdf' : '⚠️ Le lien doit se terminer par .pdf'}</p>
          )}
        </div>
      )}

      {/* Language Selector */}
      {/* Language and Issue Selector */}
      {(file || mode === 'url') && !showWarning && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isAr ? 'لغة العدد (الأساسية)' : 'Langue (principale)'}
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'ar' | 'fr')}
                className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="ar">{isAr ? 'العربية' : 'Arabe'}</option>
                <option value="fr">{isAr ? 'الفرنسية' : 'Français'}</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isAr ? 'رقم العدد' : 'Numéro du journal'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 rtl:right-0 ltr:left-0 rtl:pr-3 ltr:pl-3 flex items-center pointer-events-none">
                  <Hash className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={issueNumber}
                  onChange={(e) => setIssueNumber(e.target.value)}
                  placeholder={isAr ? 'مثال: 1605' : 'Ex: 1605'}
                  className="w-full rtl:pl-3 rtl:pr-10 ltr:pl-10 ltr:pr-3 border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {isAr ? 'اختياري: سيتم استخراجه تلقائياً إذا تُرك فارغاً' : 'Optionnel: sera extrait automatiquement si vide'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Warning Alert */}
      {showWarning && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <AlertCircle className="w-8 h-8 text-amber-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-amber-800">
                {isAr ? 'تنبيه: العدد موجود مسبقاً' : 'Attention: Numéro déjà existant'}
              </h3>
              <p className="mt-2 text-amber-700 text-sm leading-relaxed">
                {isAr 
                  ? `العدد رقم ${issueNumber} موجود بالفعل في قاعدة البيانات. المتابعة ستؤدي إلى حذف البيانات القديمة (القوانين، التعيينات، الخ) واستخراجها من جديد. هل أنت متأكد أنك تريد المتابعة؟` 
                  : `Le numéro ${issueNumber} existe déjà dans la base de données. Continuer remplacera les données existantes. Êtes-vous sûr de vouloir continuer ?`}
              </p>
              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => handleUpload(true)}
                  disabled={uploading}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2"
                >
                  {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isAr ? 'نعم، أعد استخراج البيانات' : 'Oui, ré-extraire les données'}
                </button>
                <button
                  onClick={() => setShowWarning(false)}
                  disabled={uploading}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg font-medium transition-colors"
                >
                  {isAr ? 'إلغاء الأمر' : 'Annuler'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submit/Error Area */}
      {error && (
        <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {!showWarning && (
        <button
          onClick={() => handleUpload(false)}
          disabled={!canSubmit || uploading || isChecking}
          className={`w-full py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
            canSubmit && !uploading && !isChecking
              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {uploading || isChecking ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{isAr ? 'جاري التحضير...' : 'Préparation...'}</span>
            </>
          ) : (
            <span>{isAr ? 'بدء التحليل والاستخراج' : 'Démarrer l\'analyse'}</span>
          )}
        </button>
      )}
    </div>
  );
}

