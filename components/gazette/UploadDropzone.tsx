'use client';

import { useState, useCallback } from 'react';
import { UploadCloud, File, AlertCircle, Loader2, Link2, FileText } from 'lucide-react';

type Mode = 'file' | 'url';

export default function UploadDropzone({ onUploadSuccess, isAr = false }: { onUploadSuccess: (jobId: string) => void; isAr?: boolean }) {
  const [mode, setMode] = useState<Mode>('file');
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleUpload = async () => {
    if (!canSubmit) return;
    setUploading(true);
    setError(null);

    const formData = new FormData();
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

      {/* Submit Button */}
      <button
        onClick={handleUpload}
        disabled={uploading || !canSubmit}
        className="w-full flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold shadow-sm"
      >
        {uploading ? (
          <><Loader2 className="animate-spin" size={20} /> {isAr ? 'جاري الرفع والمعالجة…' : 'Envoi et traitement…'}</>
        ) : (
          <><UploadCloud size={20} /> {isAr ? 'بدء المعالجة' : 'Lancer le traitement'}</>
        )}
      </button>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl flex items-start gap-3 border border-red-100">
          <AlertCircle className="flex-shrink-0 mt-0.5" size={18} />
          <p className="text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}

