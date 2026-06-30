import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import { FileText, Calendar, BookOpen, Clock, Tag, ArrowLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import PdfViewerToggle from '@/components/gazette/PdfViewerToggle';

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

  if (!document || (document.issues && document.issues.language !== locale)) {
    notFound();
  }

  const title = isAr ? document.title_ar : (document.title_fr || document.title_ar);
  const summary = isAr ? (document.ai_summary_ar || document.summary_ar) : (document.summary_fr || document.summary_ar);
  const content = isAr ? document.content_ar : (document.content_fr || document.content_ar);

  const typeMap: Record<string, { ar: string, fr: string }> = {
    'decree': { ar: 'مرسوم', fr: 'Décret' },
    'law': { ar: 'قانون', fr: 'Loi' },
    'order': { ar: 'مقرر', fr: 'Arrêté' },
    'ordinance': { ar: 'أمر قانوني', fr: 'Ordonnance' },
    'circular': { ar: 'تعميم', fr: 'Circulaire' },
    'decision': { ar: 'قرار', fr: 'Décision' },
    'notice': { ar: 'إعلان', fr: 'Avis' },
    'regulation': { ar: 'نظام', fr: 'Règlement' },
  };
  const rawType = (document.type || 'document').toLowerCase();
  const translatedType = typeMap[rawType] ? (isAr ? typeMap[rawType].ar : typeMap[rawType].fr) : document.type;

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 sm:px-6" dir={isAr ? 'rtl' : 'ltr'}>
      <Breadcrumbs 
        items={[
          { label: isAr ? 'الوثائق' : 'Documents', href: `/${locale}/documents` },
          { label: title?.substring(0, 50) + '...' }
        ]} 
      />
      
      <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-gray-100/50 overflow-hidden mb-8">
        {/* Decorative blur elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-green/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-slate-100/50 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>

        <div className="relative z-10 px-8 sm:px-12 py-10 border-b border-gray-100">
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <span className="bg-brand-green/10 text-brand-green px-4 py-1.5 rounded-full text-sm font-bold border border-brand-green/20 tracking-wide flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {translatedType}
            </span>
            {document.official_number && (
              <span className="bg-slate-50 text-slate-700 px-4 py-1.5 rounded-full text-sm font-medium border border-slate-200">
                {document.official_number}
              </span>
            )}
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-800 leading-[1.3]">
            {title}
          </h1>
        </div>
        
        <div className="relative z-10 px-8 sm:px-12 py-6 flex flex-wrap gap-x-12 gap-y-6 text-sm text-slate-600 bg-slate-50/50 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-slate-100">
              <Calendar className="w-5 h-5 text-brand-green" />
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-0.5">{isAr ? 'تاريخ الوثيقة' : 'Date du document'}</p>
              <p className="font-bold text-slate-800">{document.document_date || 'N/A'}</p>
            </div>
          </div>
          
          {document.issues && (
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-slate-100">
                <BookOpen className="w-5 h-5 text-brand-green" />
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">{isAr ? 'الجريدة الرسمية' : 'Journal Officiel'}</p>
                <Link href={`/${locale}/documents?issue=${document.issues.id}`} className="font-bold text-brand-green hover:underline">
                  {isAr ? 'العدد' : 'Numéro'} {document.issues.issue_number}
                </Link>
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-slate-100">
              <Clock className="w-5 h-5 text-brand-green" />
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-0.5">{isAr ? 'تاريخ النشر' : 'Date de publication'}</p>
              <p className="font-bold text-slate-800">{document.created_at ? new Date(document.created_at).toLocaleDateString() : 'N/A'}</p>
            </div>
          </div>
        </div>
        
        <div className="relative z-10 p-8 sm:px-12 sm:py-10 space-y-10">
          {summary && (
            <div className="bg-brand-green/5 border border-brand-green/10 rounded-2xl p-6 sm:p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-2 h-full bg-brand-green"></div>
              <h3 className="text-brand-green font-bold text-lg mb-4 flex items-center gap-2">
                <Tag className="w-5 h-5" />
                {isAr ? 'الملخص' : 'Résumé'}
              </h3>
              <p className="text-slate-800 leading-relaxed text-lg font-medium">
                {summary}
              </p>
            </div>
          )}
          
          <div>
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <FileText className="w-6 h-6 text-brand-green" />
              {isAr ? 'النص الكامل' : 'Texte Intégral'}
            </h3>
            {content ? (
              <div className="prose prose-slate prose-lg max-w-none text-slate-700 leading-loose" dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br/>') }} />
            ) : (
              <p className="text-slate-500 italic bg-slate-50 p-10 rounded-2xl border border-dashed border-slate-200 text-center text-lg">
                {isAr ? 'النص الكامل غير متوفر لهذه الوثيقة.' : 'Le texte intégral n\'est pas disponible pour ce document.'}
              </p>
            )}
          </div>
        </div>
      </div>
      
      {document.issues?.pdf_url && (
         <PdfViewerToggle pdfUrl={document.issues.pdf_url} isAr={isAr} pageStart={document.pdf_page_start} />
      )}
    </div>
  );
}
