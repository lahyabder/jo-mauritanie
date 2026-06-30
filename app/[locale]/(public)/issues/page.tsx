'use client';

import { use, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { BookOpen, Calendar, FileText, ChevronDown, Download } from 'lucide-react';
import Link from 'next/link';

export default function IssuesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const isAr = locale === 'ar';
  
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeYear, setActiveYear] = useState<string | null>(null);
  const [itemsToShow, setItemsToShow] = useState(60);
  const ITEMS_PER_PAGE = 60;
  
  const supabase = createClient();

  useEffect(() => {
    setItemsToShow(ITEMS_PER_PAGE);
  }, [activeYear]);

  useEffect(() => {
    async function fetchIssues() {
      const { data, error } = await supabase
        .from('issues')
        .select(`
          *,
          documents ( count )
        `)
        .eq('language', locale)
        .order('publication_date', { ascending: false });
        
      if (error) {
        setErrorMsg(error.message);
      }
      
      if (data) setIssues(data);
      setLoading(false);
    }
    fetchIssues();
  }, [locale, supabase]);

  // Extract unique years from the issues
  const availableYears = Array.from(
    new Set(
      issues
        .map(issue => issue.publication_date?.substring(0, 4))
        .filter(Boolean)
    )
  ).sort((a, b) => Number(b) - Number(a)); // Descending order

  const filteredIssues = activeYear
    ? issues.filter(issue => issue.publication_date?.startsWith(activeYear))
    : issues;

  const displayedIssues = filteredIssues.slice(0, itemsToShow);
  const hasMore = itemsToShow < filteredIssues.length;

  return (
    <div className="min-h-screen bg-[#fafafa]" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Background ambient gradients */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] -left-20 w-96 h-96 bg-emerald-300/20 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] -right-20 w-96 h-96 bg-teal-300/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="max-w-[1400px] mx-auto py-8 px-4 sm:px-6 relative z-10 flex flex-col lg:flex-row gap-6 lg:gap-10 items-start">
        
        {/* Sticky Vertical Year Scroller - Visible on LG screens */}
        <div className="hidden lg:flex flex-col sticky top-24 h-[calc(100vh-8rem)] w-14 flex-shrink-0">
          <div className="flex flex-col gap-0.5 bg-white/60 backdrop-blur-xl border border-gray-200/60 p-1.5 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full overflow-y-auto hide-scrollbar">
            <button 
              onClick={() => setActiveYear(null)}
              className={`w-full py-2.5 rounded-lg text-xs font-extrabold transition-all duration-300 ${
                !activeYear 
                  ? 'bg-emerald-600 text-white shadow-md scale-105' 
                  : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'
              }`}
            >
              {isAr ? 'الكل' : 'Tous'}
            </button>
            <div className="w-full h-px bg-gray-200/60 my-1"></div>
            {availableYears.map(year => (
              <button
                key={year}
                onClick={() => setActiveYear(year as string)}
                className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all duration-300 ${
                  activeYear === year 
                    ? 'bg-emerald-600 text-white shadow-md scale-105' 
                    : 'text-gray-500 hover:text-emerald-600 hover:bg-emerald-50'
                }`}
              >
                {year}
              </button>
            ))}
          </div>
        </div>

        {/* Horizontal Year Scroller for Small Screens */}
        <div className="lg:hidden w-full overflow-x-auto hide-scrollbar pb-2">
          <div className="flex items-center gap-1.5 w-max">
            <button 
              onClick={() => setActiveYear(null)}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all duration-300 ${
                !activeYear 
                  ? 'bg-emerald-600 text-white shadow-md scale-105' 
                  : 'bg-white/80 text-gray-500 border border-gray-200 shadow-sm hover:text-emerald-600'
              }`}
            >
              {isAr ? 'الكل' : 'Tous'}
            </button>
            {availableYears.map(year => (
              <button
                key={year}
                onClick={() => setActiveYear(year as string)}
                className={`px-4 py-2 flex-shrink-0 flex items-center justify-center rounded-xl text-sm font-bold transition-all duration-300 ${
                  activeYear === year 
                    ? 'bg-emerald-600 text-white shadow-md scale-105' 
                    : 'bg-white/80 text-gray-500 border border-gray-200 shadow-sm hover:text-emerald-600 hover:bg-emerald-50'
                }`}
              >
                {year}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 min-w-0 w-full">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6 border-b border-gray-200/60 pb-6">
            <div>
              <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-900 to-teal-500 tracking-tight flex items-center gap-3">
                {isAr ? 'أعداد الجريدة الرسمية' : 'Numéros du Journal Officiel'}
              </h1>
              <p className="mt-3 text-gray-500 text-sm md:text-base max-w-xl leading-relaxed">
                {isAr
                  ? 'تصفح أرشيف أعداد الجريدة الرسمية الموريتانية واكتشف الوثائق القانونية المرفقة بها عبر هذا الفهرس الزمني.'
                  : 'Parcourez les archives des numéros du Journal Officiel mauritanien et découvrez les documents juridiques qui y sont joints.'}
              </p>
            </div>
            
            <div className="flex items-center justify-end">
               <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-sm">
                 <BookOpen className="w-5 h-5 text-emerald-600" />
                 <span className="font-bold text-gray-800 text-lg">{issues.length}</span>
                 <span className="text-gray-500 text-sm">{isAr ? 'عدد مؤرشف' : 'numéros'}</span>
               </div>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex justify-center items-center py-32">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-t-2 border-emerald-500 animate-spin"></div>
                <div className="absolute inset-2 rounded-full border-r-2 border-teal-500 animate-spin" style={{ animationDirection: 'reverse' }}></div>
              </div>
            </div>
          ) : errorMsg ? (
            <div className="text-center p-8 text-red-600 border border-red-100 bg-red-50/80 backdrop-blur-xl rounded-3xl shadow-sm">
              <p className="font-bold">Error</p>
              <p className="text-sm mt-1">{errorMsg}</p>
            </div>
          ) : filteredIssues.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-gray-400">
              <BookOpen className="w-16 h-16 mb-4 opacity-20" />
              <p className="font-medium text-lg text-gray-500">{isAr ? 'لا توجد أعداد في هذه السنة' : 'Aucun numéro trouvé'}</p>
            </div>
          ) : (
            <>
              {/* Ultra High Density Grid for Issues */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
                {displayedIssues.map((issue) => (
                  <div key={issue.id} className="group flex flex-col justify-between bg-white/80 backdrop-blur-xl rounded-2xl p-4 border border-white shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:shadow-[0_10px_30px_rgb(16,185,129,0.12)] hover:bg-white hover:border-emerald-100 transform hover:-translate-y-1 transition-all duration-300">
                    
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors shadow-sm">
                          <BookOpen size={16} strokeWidth={2} />
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block leading-none mb-0.5">{isAr ? 'العدد' : 'N°'}</span>
                          <span className="text-lg font-black text-gray-800 leading-none group-hover:text-emerald-600 transition-colors">{issue.issue_number}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-xs font-medium text-gray-500 bg-gray-50/80 px-2 py-1.5 rounded-lg border border-gray-100">
                        <Calendar className={`w-3.5 h-3.5 text-gray-400 ${isAr ? 'ml-2' : 'mr-2'}`} />
                        {issue.publication_date}
                      </div>
                      <div className="flex items-center text-xs font-medium text-gray-500 bg-gray-50/80 px-2 py-1.5 rounded-lg border border-gray-100">
                        <FileText className={`w-3.5 h-3.5 text-gray-400 ${isAr ? 'ml-2' : 'mr-2'}`} />
                        <span className="text-emerald-600 font-bold mx-1">{issue.documents[0]?.count || 0}</span>
                        {isAr ? 'وثيقة مستخرجة' : 'documents'}
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-auto pt-3 border-t border-gray-100/80">
                      <Link href={`/${locale}/documents?issue=${issue.id}`} className="flex-1 flex items-center justify-center py-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-500 hover:text-white font-bold text-xs transition-colors shadow-sm">
                        {isAr ? 'الوثائق' : 'Documents'}
                      </Link>
                      {issue.pdf_url && (
                        <Link href={issue.pdf_url} target="_blank" className="flex items-center justify-center w-10 bg-white text-gray-400 border border-gray-200 rounded-xl hover:bg-gray-50 hover:text-emerald-600 transition-colors shadow-sm" title={isAr ? 'تحميل PDF' : 'Télécharger PDF'}>
                          <Download size={16} />
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Load More Button */}
              {hasMore && (
                <div className="flex justify-center pb-12">
                  <button
                    onClick={() => setItemsToShow(prev => prev + ITEMS_PER_PAGE)}
                    className="group flex items-center gap-2 px-8 py-3 bg-white hover:bg-gray-50 text-emerald-600 font-bold rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all duration-300"
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
