'use client';

import { useState, useCallback } from 'react';
import { UploadCloud, File, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export default function UploadDropzone({ onUploadSuccess, isAr = false }: { onUploadSuccess: (jobId: string) => void, isAr?: boolean }) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'application/pdf') {
        setFile(droppedFile);
        setError(null);
      } else {
        setError('Only PDF files are supported.');
      }
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === 'application/pdf') {
        setFile(selectedFile);
        setError(null);
      } else {
        setError('Only PDF files are supported.');
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    // In a real app, append user ID from session
    formData.append('userId', 'anonymous-user-id');

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      onUploadSuccess(data.jobId);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during upload.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-8">
      <div 
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
          isDragging ? 'border-blue-500 bg-blue-50/50' : 'border-gray-300 hover:border-gray-400 bg-gray-50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {!file ? (
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-2">
              <UploadCloud size={32} />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">{isAr ? 'رفع الجريدة الرسمية' : 'Upload Official Gazette'}</h3>
            <p className="text-gray-500 max-w-sm">
              {isAr ? 'قم بسحب وإفلات ملف PDF هنا، أو انقر لاختيار ملف. سيقوم النظام آلياً باستخراج وتصنيف المستندات.' : 'Drag and drop a PDF file here, or click to browse. The system will automatically extract and classify documents.'}
            </p>
            <label className="mt-4 px-6 py-2.5 bg-gray-900 text-white rounded-lg cursor-pointer hover:bg-gray-800 transition-colors font-medium">
              {isAr ? 'اختر ملف PDF' : 'Select PDF File'}
              <input type="file" className="hidden" accept="application/pdf" onChange={handleFileChange} />
            </label>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className="flex items-center p-4 bg-white rounded-lg shadow-sm border border-gray-200 w-full max-w-md">
              <File className="text-red-500 mr-4" size={32} />
              <div className="flex-1 text-left overflow-hidden">
                <p className="text-sm font-semibold text-gray-900 truncate">{file.name}</p>
                <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button 
                onClick={() => setFile(null)}
                className="text-gray-400 hover:text-gray-600 ml-4 p-1"
                disabled={uploading}
              >
                ✕
              </button>
            </div>
            
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="flex items-center px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-sm"
            >
              {uploading ? (
                <>
                  <Loader2 className="animate-spin mr-2 ml-2" size={20} />
                  {isAr ? 'جاري الرفع والمعالجة...' : 'Uploading & Starting Process...'}
                </>
              ) : (
                isAr ? 'بدء المعالجة' : 'Start Processing'
              )}
            </button>
          </div>
        )}
      </div>
      
      {error && (
        <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-start border border-red-100">
          <AlertCircle className="mr-3 flex-shrink-0 mt-0.5" size={20} />
          <p className="text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
