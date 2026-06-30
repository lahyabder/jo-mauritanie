'use client';

import { use, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { FileText, Calendar, BookOpen, Search, ArrowLeft, ArrowRight, ChevronDown, FileBadge } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

export default function DocumentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const isAr = locale === 'ar';
  const searchParams = useSearchParams();
  const router = useRouter();
  const issueId = searchParams.get('issue');
  
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<string | null>(null);
  const [itemsToShow, setItemsToShow] = useState(40);
  const ITEMS_PER_PAGE = 40;

  const supabase = createClient();

  useEffect(() => {
    setItemsToShow(ITEMS_PER_PAGE);
  }, [activeType, issueId]);

  useEffect(() => {
    async function fetchDocuments() {
      setLoading(true);
      let req = supabase
        .from('documents')
        .select('*, issues!inner(issue_number, language)')
        .eq('issues.language', locale)
        .order('document_date', { ascending: false });
        
      if (issueId) {
        req = req.eq('issue_id', issueId);
      }
      
      const { data } = await req.limit(500); // Fetch more for client side filtering
      if (data) setDocuments(data);
      setLoading(false);
    }
    fetchDocuments();
  }, [issueId, locale, supabase]);

  // Extract unique document types
  const availableTypes = Array.from(
    new Set(documents.map(doc => doc.type).filter(Boolean))
  ).sort();

  const filteredDocs = activeType
    ? documents.filter(doc => doc.type === activeType)
    : documents;

  const displayedDocs = filteredDocs.slice(0, itemsToShow);
  const hasMore = itemsToShow < filteredDocs.length;

  return (
    <div className="min-h-screen bg-[#fafafa]" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Background ambient gradients */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] -right-20 w-96 h-96 bg-red-300/10 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] -left-20 w-96 h-96 bg-orange-300/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="max-w-[1400px] mx-auto py-8 px-4 sm:px-6 relative z-10 flex flex-col lg:flex-row gap-6 lg:gap-10 items-start">
        
        {/* Sticky Vertical Type Scroller - Visible on LG screens */}
        <div className="hidden lg:flex flex-col sticky top-24 h-[calc(100vh-8rem)] w-36 flex-shrink-0">
          <div className="flex flex-col gap-1 bg-white/60 backdrop-blur-xl border border-gray-200/60 p-2 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full overflow-y-auto hide-scrollbar">
            <button 
              onClick={() => setActiveType(null)}
              className={`w-full py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all duration-300 text-center ${
                !activeType 
                  ? 'bg-rose-600 text-white shadow-md scale-105' 
                  : 'text-gray-500 hover:text-rose-600 hover:bg-rose-50'
              }`}
            >
              {isAr ? 'كل التصنيفات' : 'Tous'}
            </button>
            <div className="w-full h-px bg-gray-200/60 my-1"></div>
            {availableTypes.map(type => (
              <button
                key={type}
                onClick={() => setActiveType(type as string)}
                className={`w-full py-2.5 px-2 rounded-xl text-[11px] font-bold transition-all duration-300 uppercase ${
                  activeType === type 
                    ? 'bg-rose-600 text-white shadow-md scale-105' 
                    : 'text-gray-500 hover:text-rose-600 hover:bg-rose-50'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Horizontal Type Scroller for Small Screens */}
        <div className="lg:hidden w-full overflow-x-auto hide-scrollbar pb-2">
          <div className="flex items-center gap-2 w-max">
            <button 
              onClick={() => setActiveType(null)}
              className={`px-5 py-2 rounded-xl text-xs font-extrabold transition-all duration-300 ${
                !activeType 
                  ? 'bg-rose-600 text-white shadow-md scale-105' 
                  : 'bg-white/80 text-gray-500 border border-gray-200 shadow-sm hover:text-rose-600'
              }`}
            >
              {isAr ? 'الكل' : 'Tous'}
            </button>
            {availableTypes.map(type => (
              <button
                key={type}
                onClick={() => setActiveType(type as string)}
                className={`px-4 py-2 flex-shrink-0 flex items-center justify-center rounded-xl text-xs font-bold transition-all duration-300 uppercase ${
                  activeType === type 
                    ? 'bg-rose-600 text-white shadow-md scale-105' 
                    : 'bg-white/80 text-gray-500 border border-gray-200 shadow-sm hover:text-rose-600 hover:bg-rose-50'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 min-w-0 w-full">
          
          {issueId && (
            <button 
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 mb-6 text-gray-500 hover:text-rose-600 bg-white/50 px-4 py-2 rounded-xl border border-gray-200 backdrop-blur-sm transition-all shadow-sm font-bold text-xs"
            >
              {isAr ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}
              {isAr ? 'العودة للعدد' : 'Retour au numéro'}
            </button>
          )}

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6 border-b border-gray-200/60 pb-6">
            <div>
              <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-rose-900 to-rose-500 tracking-tight flex items-center gap-3">
                {isAr ? 'النصوص القانونية' : 'Textes Législatifs'}
              </h1>
              <p className="mt-3 text-gray-500 text-sm md:text-base max-w-xl leading-relaxed">
                {isAr
                  ? 'استعرض المراسيم، القوانين، والمقررات المستخرجة من أعداد الجريدة الرسمية بواجهة مبسطة وواضحة.'
                  : 'Parcourez les décrets, lois et arrêtés extraits du Journal Officiel avec une interface claire.'}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Link href={`/${locale}/search`} className="group flex items-center justify-center gap-2 bg-white/80 backdrop-blur-xl border border-gray-200 text-gray-700 px-6 py-2.5 rounded-2xl shadow-sm hover:shadow-md hover:border-rose-200 transition-all">
                <Search size={16} className="text-rose-500 group-hover:scale-110 transition-transform" />
                <span className="font-bold text-sm">{isAr ? 'بحث متقدم' : 'Recherche Avancée'}</span>
              </Link>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex justify-center items-center py-32">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-t-2 border-rose-500 animate-spin"></div>
                <div className="absolute inset-2 rounded-full border-r-2 border-orange-500 animate-spin" style={{ animationDirection: 'reverse' }}></div>
              </div>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-gray-400">
              <FileBadge className="w-16 h-16 mb-4 opacity-20" />
              <p className="font-medium text-lg text-gray-500">{isAr ? 'لا توجد وثائق متاحة' : 'Aucun document disponible'}</p>
            </div>
          ) : (
            <>
              {/* Ultra High Density Grid for Documents */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
                {displayedDocs.map((doc) => (
                  <div key={doc.id} className="group flex flex-col bg-white/80 backdrop-blur-xl rounded-2xl p-5 border border-white shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:shadow-[0_10px_30px_rgb(225,29,72,0.12)] hover:bg-white hover:border-rose-100 transform hover:-translate-y-1 transition-all duration-300">
                    
                    {/* Header Tags */}
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      {doc.type && (
                        <span className="bg-rose-50 text-rose-600 font-bold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-md border border-rose-100/50">
                          {doc.type}
                        </span>
                      )}
                      {doc.issues?.issue_number && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-gray-500 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100">
                          <BookOpen className="w-3 h-3 text-gray-400" /> 
                          {isAr ? 'عدد' : 'N°'} {doc.issues.issue_number}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-[11px] font-bold text-gray-500 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100 ml-auto mr-auto">
                        <Calendar className="w-3 h-3 text-gray-400" /> 
                        {doc.document_date || 'N/A'}
                      </span>
                    </div>
                    
                    {/* Title & Summary */}
                    <Link href={`/${locale}/documents/${doc.id}`} className="flex-1 min-w-0 flex flex-col mb-4 cursor-pointer">
                      <h3 className="text-[15px] font-black text-gray-800 leading-snug group-hover:text-rose-600 transition-colors mb-2 line-clamp-2">
                        {isAr ? doc.title_ar : (doc.title_fr || doc.title_ar)}
                      </h3>
                      <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">
                        {isAr ? (doc.ai_summary_ar || doc.title_ar) : (doc.title_fr || doc.title_ar)}
                      </p>
                    </Link>
                    
                    {/* Action */}
                    <div className="pt-3 border-t border-gray-100/80 mt-auto">
                      <Link href={`/${locale}/documents/${doc.id}`} className="inline-flex items-center text-xs font-bold text-gray-400 group-hover:text-rose-600 transition-colors">
                        {isAr ? 'اقرأ المزيد' : 'Lire la suite'} 
                        {isAr ? <ArrowLeft className="w-3.5 h-3.5 mr-1.5 group-hover:-translate-x-1 transition-transform" /> : <ArrowRight className="w-3.5 h-3.5 ml-1.5 group-hover:translate-x-1 transition-transform" />}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              {/* Load More Button */}
              {hasMore && (
                <div className="flex justify-center pb-12">
                  <button
                    onClick={() => setItemsToShow(prev => prev + ITEMS_PER_PAGE)}
                    className="group flex items-center gap-2 px-8 py-3 bg-white hover:bg-gray-50 text-rose-600 font-bold rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-rose-200 transition-all duration-300"
                  >
                    {isAr ? 'تحميل المزيد' : 'Charger plus'}
                    <ChevronDown className="w-4 h-4 group-hover:translate-y-1 transition-transform" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Hide Scrollbar Style */}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}
