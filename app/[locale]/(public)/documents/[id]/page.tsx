import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import { FileText, Calendar, BookOpen, Clock, Tag } from 'lucide-react';
import Link from 'next/link';
import Breadcrumbs from '@/components/ui/Breadcrumbs';

export default async function DocumentDetailsPage({ 
  params 
}: { 
  params: Promise<{ locale: string; id: string }> 
}) {
  const { locale, id } = await params;
  const isAr = locale === 'ar';
  
  const supabase = await createClient();
  const { data: document } = await supabase
    .from('documents')
    .select('*, issues(*), institutions(*)')
    .eq('id', id)
    .single();

  if (!document) {
    notFound();
  }

  const title = isAr ? document.title_ar : (document.title_fr || document.title_ar);
  const summary = isAr ? (document.ai_summary_ar || document.summary_ar) : (document.summary_fr || document.summary_ar);
  const content = isAr ? document.content_ar : (document.content_fr || document.content_ar);

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 sm:px-6" dir={isAr ? 'rtl' : 'ltr'}>
      <Breadcrumbs 
        items={[
          { label: isAr ? 'الوثائق' : 'Documents', href: `/${locale}/documents` },
          { label: title?.substring(0, 50) + '...' }
        ]} 
      />
      
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="bg-indigo-50 px-8 py-6 border-b border-indigo-100">
          <div className="flex items-center gap-3 mb-4">
            <span className="bg-white text-indigo-700 px-3 py-1 rounded-full text-xs font-bold border border-indigo-200 uppercase tracking-wide">
              {document.type}
            </span>
            {document.official_number && (
              <span className="bg-white text-gray-700 px-3 py-1 rounded-full text-xs font-medium border border-gray-200">
                {document.official_number}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-snug">
            {title}
          </h1>
        </div>
        
        <div className="px-8 py-6 flex flex-wrap gap-6 text-sm text-gray-600 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500 mb-0.5">{isAr ? 'تاريخ الوثيقة' : 'Document Date'}</p>
              <p className="font-semibold text-gray-900">{document.document_date || 'N/A'}</p>
            </div>
          </div>
          
          {document.issues && (
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 mb-0.5">{isAr ? 'الجريدة الرسمية' : 'Official Gazette'}</p>
                <Link href={`/${locale}/documents?issue=${document.issues.id}`} className="font-semibold text-indigo-600 hover:underline">
                  {isAr ? 'العدد' : 'Issue'} {document.issues.issue_number}
                </Link>
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500 mb-0.5">{isAr ? 'تاريخ النشر' : 'Publish Date'}</p>
              <p className="font-semibold text-gray-900">{document.created_at ? new Date(document.created_at).toLocaleDateString() : 'N/A'}</p>
            </div>
          </div>
        </div>
        
        <div className="p-8 space-y-8">
          {summary && (
            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-6">
              <h3 className="text-blue-900 font-bold mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {isAr ? 'الملخص' : 'Summary'}
              </h3>
              <p className="text-blue-800 leading-relaxed">
                {summary}
              </p>
            </div>
          )}
          
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">{isAr ? 'النص الكامل' : 'Full Text'}</h3>
            {content ? (
              <div className="prose prose-indigo max-w-none text-gray-700 leading-loose" dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br/>') }} />
            ) : (
              <p className="text-gray-500 italic bg-gray-50 p-6 rounded-xl border border-dashed border-gray-200 text-center">
                {isAr ? 'النص الكامل غير متوفر لهذه الوثيقة.' : 'Full text is not available for this document.'}
              </p>
            )}
          </div>
        </div>
      </div>
      
      {document.issues?.pdf_url && (
         <div className="flex justify-center mt-8">
           <Link href={document.issues.pdf_url} target="_blank" className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-8 rounded-xl shadow-sm transition-colors flex items-center gap-2">
             <FileText className="w-5 h-5" />
             {isAr ? 'عرض الجريدة الرسمية (PDF)' : 'View Official Gazette (PDF)'}
           </Link>
         </div>
      )}
    </div>
  );
}
