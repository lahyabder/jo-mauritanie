'use client';

import { use, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { BookOpen, Calendar, FileText } from 'lucide-react';
import Link from 'next/link';

export default function IssuesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const isAr = locale === 'ar';
  
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchIssues() {
      const { data, error } = await supabase
        .from('issues')
        .select(`
          *,
          documents ( count )
        `)
        .order('publication_date', { ascending: false });
        
      if (data) setIssues(data);
      setLoading(false);
    }
    fetchIssues();
  }, []);

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 sm:px-6">
      <div className="flex justify-between items-center mb-8 border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <BookOpen className={`w-8 h-8 text-indigo-600 ${isAr ? 'ml-3' : 'mr-3'}`} />
            {isAr ? 'أعداد الجريدة الرسمية' : 'Official Gazette Issues'}
          </h1>
          <p className="mt-2 text-gray-500 max-w-2xl">
            {isAr ? 'تصفح أعداد الجريدة الرسمية الموريتانية المؤرشفة في النظام' : 'Browse the archived issues of the Mauritanian Official Gazette'}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : issues.length === 0 ? (
        <div className="text-center p-12 text-gray-500 border border-dashed rounded-xl bg-gray-50">
          {isAr ? 'لا توجد أعداد حالياً.' : 'No issues found.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {issues.map((issue) => (
            <div key={issue.id} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm font-bold border border-indigo-100">
                  {isAr ? 'العدد' : 'Issue'} {issue.issue_number}
                </span>
                <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100">
                  {issue.status}
                </span>
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="w-4 h-4 mr-2 ml-2 text-gray-400" />
                  {issue.publication_date}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <FileText className="w-4 h-4 mr-2 ml-2 text-gray-400" />
                  {issue.documents[0]?.count || 0} {isAr ? 'وثيقة مستخرجة' : 'extracted docs'}
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-50 flex flex-col gap-3">
                 <Link href={`/${locale}/documents?issue=${issue.id}`} className="text-center w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 font-medium transition-colors text-sm">
                   {isAr ? 'تصفح الوثائق' : 'Browse Documents'}
                 </Link>
                 {issue.pdf_url && (
                   <Link href={issue.pdf_url} target="_blank" className="text-center w-full px-4 py-2 bg-white text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 font-medium transition-colors text-sm">
                     {isAr ? 'تحميل PDF' : 'Download PDF'}
                   </Link>
                 )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
