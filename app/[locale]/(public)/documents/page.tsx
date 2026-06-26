'use client';

import { use, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { FileText, Calendar, BookOpen, Search, ArrowLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function DocumentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const isAr = locale === 'ar';
  const searchParams = useSearchParams();
  const issueId = searchParams.get('issue');
  
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchDocuments() {
      setLoading(true);
      let req = supabase
        .from('documents')
        .select('*, issues(issue_number)')
        .order('document_date', { ascending: false });
        
      if (issueId) {
        req = req.eq('issue_id', issueId);
      }
      
      const { data } = await req.limit(50);
      if (data) setDocuments(data);
      setLoading(false);
    }
    fetchDocuments();
  }, [issueId]);

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 sm:px-6" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <FileText className="w-8 h-8 text-indigo-600" />
            {isAr ? 'الوثائق القانونية' : 'Legal Documents'}
          </h1>
          <p className="mt-2 text-gray-500 max-w-2xl">
            {isAr ? 'تصفح الوثائق والمراسيم المستخرجة من الجريدة الرسمية' : 'Browse documents and decrees extracted from the Official Gazette'}
          </p>
        </div>
        
        <div className="w-full md:w-auto">
          <Link href={`/${locale}/search`} className="flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 px-6 py-2.5 rounded-xl shadow-sm hover:bg-gray-50 transition-colors w-full">
            <Search size={18} />
            <span className="font-medium text-sm">{isAr ? 'بحث متقدم' : 'Advanced Search'}</span>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center p-12 text-gray-500 border border-dashed rounded-xl bg-gray-50">
          {isAr ? 'لا توجد وثائق متاحة.' : 'No documents available.'}
        </div>
      ) : (
        <div className="space-y-4">
          {documents.map((doc) => (
            <div key={doc.id} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow group flex flex-col">
              <h3 className="text-xl font-bold text-indigo-900 group-hover:text-indigo-600 transition-colors mb-3">
                <Link href={`/${locale}/documents/${doc.id}`}>
                  {isAr ? doc.title_ar : (doc.title_fr || doc.title_ar)}
                </Link>
              </h3>
              <div className="flex flex-wrap gap-3 mb-4 text-xs font-medium text-gray-500">
                <span className="flex items-center bg-gray-50 px-2.5 py-1.5 rounded-md border border-gray-100">
                  <Calendar className="w-3.5 h-3.5 mr-1.5 ml-1.5" /> 
                  {doc.document_date || 'N/A'}
                </span>
                {doc.issues?.issue_number && (
                  <span className="flex items-center bg-indigo-50 text-indigo-700 px-2.5 py-1.5 rounded-md border border-indigo-100">
                    <BookOpen className="w-3.5 h-3.5 mr-1.5 ml-1.5" /> 
                    {isAr ? 'العدد' : 'Issue'} {doc.issues.issue_number}
                  </span>
                )}
                <span className="flex items-center bg-gray-50 px-2.5 py-1.5 rounded-md border border-gray-100 uppercase">
                   {doc.type}
                </span>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed mb-4 flex-grow">
                {isAr ? (doc.ai_summary_ar || doc.title_ar) : (doc.title_fr || doc.title_ar)}
              </p>
              <div className="pt-4 border-t border-gray-50 mt-auto">
                <Link href={`/${locale}/documents/${doc.id}`} className="inline-flex items-center text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                  {isAr ? 'قراءة التفاصيل' : 'Read Details'} 
                  {isAr ? <ArrowLeft className="w-4 h-4 mr-1" /> : <ArrowRight className="w-4 h-4 ml-1" />}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
