'use client';

import { use } from 'react';
import BatchUploadManager from '@/components/gazette/BatchUploadManager';

export default function UploadCenterPage({ params }: { params: Promise<{ locale: string }> }) {
  const resolvedParams = use(params);
  const isAr = resolvedParams.locale === 'ar';

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            {isAr ? 'مركز الرفع والمعالجة' : 'Centre de téléversement'}
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            {isAr
              ? 'قم برفع الأعداد الجديدة من الجريدة الرسمية. سيقوم النظام باستخراج النصوص وتصنيفها آلياً بشكل متتابع.'
              : 'Téléversez les nouveaux numéros du Journal Officiel. Le système extraira et classifiera automatiquement les textes de manière séquentielle.'}
          </p>
        </div>

        <BatchUploadManager isAr={isAr} />
      </div>
    </div>
  );
}
