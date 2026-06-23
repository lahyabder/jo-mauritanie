'use client';

import { useState, use, useEffect } from 'react';
import UploadDropzone from '@/components/gazette/UploadDropzone';

function JobStatusViewer({ jobId, isAr = false, onReset }: { jobId: string, isAr?: boolean, onReset: () => void }) {
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    // Simulate progression through steps
    const timers = [
      setTimeout(() => setCurrentStep(2), 2000),
      setTimeout(() => setCurrentStep(3), 4500),
      setTimeout(() => setCurrentStep(4), 7000),
      setTimeout(() => setCurrentStep(5), 9000), // 5 means all done
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto mt-8 bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
      <h2 className="text-xl font-bold mb-6 text-gray-900">{isAr ? 'جاري المعالجة والتحليل' : 'Processing Document'}</h2>
      
      <div className="space-y-6 relative">
        {/* Step 1 */}
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center mr-4 ml-4">
            ✓
          </div>
          <div className="flex-1 text-start">
            <h4 className="font-medium text-gray-900">{isAr ? 'اكتمل الرفع' : 'Upload Complete'}</h4>
            <p className="text-sm text-gray-500">{isAr ? 'تم حفظ الملف بأمان في قاعدة البيانات' : 'File securely stored in Supabase'}</p>
          </div>
        </div>

        {/* Step 2 */}
        <div className={`flex items-center transition-opacity duration-500 ${currentStep >= 2 ? 'opacity-100' : 'opacity-40'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-4 ml-4 ${currentStep === 2 ? 'bg-blue-100 text-blue-600 animate-pulse' : currentStep > 2 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
            {currentStep > 2 ? '✓' : currentStep === 2 ? <span className="w-2 h-2 bg-blue-600 rounded-full" /> : '2'}
          </div>
          <div className="flex-1 text-start">
            <h4 className="font-medium text-gray-900">{isAr ? 'استخراج النصوص (OCR)' : 'Extracting Text & Running OCR'}</h4>
            <p className="text-sm text-gray-500">{isAr ? 'جاري قراءة صفحات الـ PDF...' : 'Processing PDF pages...'}</p>
          </div>
        </div>

        {/* Step 3 */}
        <div className={`flex items-center transition-opacity duration-500 ${currentStep >= 3 ? 'opacity-100' : 'opacity-40'}`}>
           <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-4 ml-4 ${currentStep === 3 ? 'bg-blue-100 text-blue-600 animate-pulse' : currentStep > 3 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
            {currentStep > 3 ? '✓' : currentStep === 3 ? <span className="w-2 h-2 bg-blue-600 rounded-full" /> : '3'}
          </div>
          <div className="flex-1 text-start">
            <h4 className="font-medium text-gray-900">{isAr ? 'التحليل الهيكلي' : 'Structure Analysis'}</h4>
            <p className="text-sm text-gray-500">{isAr ? 'تقسيم العدد إلى مراسيم وقوانين' : 'Splitting into legal documents'}</p>
          </div>
        </div>

        {/* Step 4 */}
        <div className={`flex items-center transition-opacity duration-500 ${currentStep >= 4 ? 'opacity-100' : 'opacity-40'}`}>
           <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-4 ml-4 ${currentStep === 4 ? 'bg-blue-100 text-blue-600 animate-pulse' : currentStep > 4 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
            {currentStep > 4 ? '✓' : currentStep === 4 ? <span className="w-2 h-2 bg-blue-600 rounded-full" /> : '4'}
          </div>
          <div className="flex-1 text-start">
            <h4 className="font-medium text-gray-900">{isAr ? 'التصنيف الذكي' : 'AI Classification'}</h4>
            <p className="text-sm text-gray-500">{isAr ? 'استخراج البيانات الوصفية عبر الذكاء الاصطناعي' : 'Extracting metadata via Gemini'}</p>
          </div>
        </div>
      </div>
      
      {currentStep >= 5 && (
        <div className="mt-8 text-center animate-fade-in">
           <button onClick={onReset} className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors">
              {isAr ? 'تمت المعالجة، رفع عدد آخر' : 'Processing Done, Upload Another'}
           </button>
        </div>
      )}

      <div className="mt-8 pt-6 border-t border-gray-100 text-center">
        <p className="text-sm text-gray-500">{isAr ? 'رقم العملية:' : 'Job ID:'} {jobId}</p>
        <p className="text-xs text-gray-400 mt-2">{isAr ? 'تم تفعيل محاكاة مرئية. في الواقع تستخدم Supabase Realtime.' : 'Visual simulation active. Real app uses Supabase Realtime.'}</p>
      </div>
    </div>
  );
}

export default function UploadCenterPage({ params }: { params: Promise<{ locale: string }> }) {
  const resolvedParams = use(params);
  const isAr = resolvedParams.locale === 'ar';
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">{isAr ? 'مركز الرفع والمعالجة' : 'Upload Center'}</h1>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            {isAr ? 'قم برفع الأعداد الجديدة من الجريدة الرسمية. سيقوم النظام باستخراج النصوص وتصنيفها آلياً.' : 'Upload new issues of the Official Gazette. The system will automatically extract, classify, and stage individual documents for review.'}
          </p>
        </div>

        {!activeJobId ? (
          <UploadDropzone onUploadSuccess={setActiveJobId} isAr={isAr} />
        ) : (
          <JobStatusViewer jobId={activeJobId} isAr={isAr} onReset={() => setActiveJobId(null)} />
        )}
      </div>
    </div>
  );
}
