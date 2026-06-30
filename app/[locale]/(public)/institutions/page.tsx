'use client';

import { use, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Building2, Search, Filter, ChevronDown } from 'lucide-react';
import Link from 'next/link';

export default function InstitutionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const isAr = locale === 'ar';

  const [institutions, setInstitutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'mentionsDesc' | 'mentionsAsc' | 'nameAsc' | 'nameDesc'>('mentionsDesc');
  const [itemsToShow, setItemsToShow] = useState(100);
  const ITEMS_PER_PAGE = 100;
  
  const supabase = createClient();

  useEffect(() => {
    setItemsToShow(ITEMS_PER_PAGE);
  }, [query, sortOrder, activeLetter]);

  useEffect(() => {
    async function fetchInstitutions() {
      setLoading(true);
      let req = supabase
        .from('institutions')
        .select(`
          id, name_ar, name_fr, category, is_active,
          appointment_history!inner (
            issues!inner ( id, issue_number, is_published, language )
          )
        `)
        .eq('appointment_history.issues.is_published', true)
        .eq('appointment_history.issues.language', locale)

      if (isAr) {
        req = req.not('name_ar', 'is', null).neq('name_ar', '');
      } else {
        req = req.not('name_fr', 'is', null).neq('name_fr', '');
      }

      if (query.trim()) {
        req = req.ilike(isAr ? 'name_ar' : 'name_fr', `%${query.trim()}%`);
      }

      const { data, error } = await req;
      if (error) {
        console.error("Supabase fetch institutions error:", error);
        setErrorMsg(error.message);
      } else {
        setErrorMsg(null);
      }
      
      if (data) {
        const processed = data.map((inst: any) => {
          const validAppts = (inst.appointment_history || []).filter((a: any) => a.issues?.is_published);
          const issuesMap = new Map<string, string>();

          validAppts.forEach((a: any) => {
            const issueNum = a.issues?.issue_number ? String(a.issues.issue_number) : null;
            const issueId = a.issues?.id;
            if (issueNum && issueId) issuesMap.set(issueNum, issueId);
          });

          return {
            ...inst,
            validApptsCount: validAppts.length,
            issues: Array.from(issuesMap.entries()).map(([num, id]) => ({ num, id })).sort((a, b) => Number(b.num) - Number(a.num))
          };
        });
        setInstitutions(processed);
      }
      setLoading(false);
    }
    fetchInstitutions();
  }, [query, isAr, supabase, locale]);

  const sortedInstitutions = [...institutions].sort((a, b) => {
    if (sortOrder === 'nameAsc') {
      const nameA = isAr ? a.name_ar : (a.name_fr || a.name_ar);
      const nameB = isAr ? b.name_ar : (b.name_fr || b.name_ar);
      return (nameA || '').localeCompare(nameB || '');
    } else if (sortOrder === 'nameDesc') {
      const nameA = isAr ? a.name_ar : (a.name_fr || a.name_ar);
      const nameB = isAr ? b.name_ar : (b.name_fr || b.name_ar);
      return (nameB || '').localeCompare(nameA || '');
    } else if (sortOrder === 'mentionsDesc') {
      return b.validApptsCount - a.validApptsCount;
    } else if (sortOrder === 'mentionsAsc') {
      return a.validApptsCount - b.validApptsCount;
    }
    return 0;
  });

  const alphabetAr = ['ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'ه', 'و', 'ي'];
  const alphabetFr = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];
  const currentAlphabet = isAr ? alphabetAr : alphabetFr;

  const filteredByLetter = activeLetter 
    ? sortedInstitutions.filter(inst => {
        const name = isAr ? inst.name_ar : (inst.name_fr || inst.name_ar);
        if (!name) return false;
        const firstChar = name.trim().charAt(0).toUpperCase();
        if (activeLetter === 'ا' || activeLetter === 'A') {
           if (isAr) return ['ا', 'أ', 'إ', 'آ'].includes(firstChar);
        }
        return firstChar === activeLetter;
      })
    : sortedInstitutions;

  const displayedInstitutions = filteredByLetter.slice(0, itemsToShow);
  const hasMore = itemsToShow < filteredByLetter.length;

  return (
    <div className="min-h-screen bg-[#fafafa]" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Background ambient gradients */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] -right-20 w-96 h-96 bg-blue-300/20 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] -left-20 w-96 h-96 bg-cyan-300/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="max-w-[1400px] mx-auto py-8 px-4 sm:px-6 relative z-10 flex flex-col lg:flex-row gap-6 lg:gap-10 items-start">
        
        {/* Sticky Vertical Alphabet Scroller - Visible on LG screens */}
        <div className="hidden lg:flex flex-col sticky top-24 h-[calc(100vh-8rem)] w-10 flex-shrink-0">
          <div className="flex flex-col gap-0.5 bg-white/60 backdrop-blur-xl border border-gray-200/60 p-1.5 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full overflow-y-auto hide-scrollbar">
            <button 
              onClick={() => setActiveLetter(null)}
              className={`w-full py-1.5 rounded-lg text-[10px] font-extrabold transition-all duration-300 ${
                !activeLetter 
                  ? 'bg-blue-600 text-white shadow-md scale-110' 
                  : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              {isAr ? 'الكل' : 'Tous'}
            </button>
            <div className="w-full h-px bg-gray-200/60 my-1"></div>
            {currentAlphabet.map(letter => (
              <button
                key={letter}
                onClick={() => setActiveLetter(letter)}
                className={`w-full py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${
                  activeLetter === letter 
                    ? 'bg-blue-600 text-white shadow-md scale-110' 
                    : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                {letter}
              </button>
            ))}
          </div>
        </div>

        {/* Horizontal Alphabet Scroller for Small Screens */}
        <div className="lg:hidden w-full overflow-x-auto hide-scrollbar pb-2">
          <div className="flex items-center gap-1.5 w-max">
            <button 
              onClick={() => setActiveLetter(null)}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all duration-300 ${
                !activeLetter 
                  ? 'bg-blue-600 text-white shadow-md scale-105' 
                  : 'bg-white/80 text-gray-500 border border-gray-200 shadow-sm hover:text-blue-600'
              }`}
            >
              {isAr ? 'الكل' : 'Tous'}
            </button>
            {currentAlphabet.map(letter => (
              <button
                key={letter}
                onClick={() => setActiveLetter(letter)}
                className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl text-sm font-bold transition-all duration-300 ${
                  activeLetter === letter 
                    ? 'bg-blue-600 text-white shadow-md scale-110' 
                    : 'bg-white/80 text-gray-500 border border-gray-200 shadow-sm hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                {letter}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 min-w-0 w-full">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6 border-b border-gray-200/60 pb-6">
            <div>
              <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-900 to-blue-500 tracking-tight flex items-center gap-3">
                {isAr ? 'دليل المؤسسات' : 'Annuaire des Institutions'}
              </h1>
              <p className="mt-3 text-gray-500 text-sm md:text-base max-w-xl leading-relaxed">
                {isAr
                  ? 'استكشف الهيئات والمؤسسات المذكورة في الجريدة الرسمية الموريتانية عبر واجهة عصرية عالية الكثافة.'
                  : 'Explorez les institutions et organismes référencés dans le Journal Officiel avec une interface moderne à haute densité.'}
              </p>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-64 group">
                <Search className={`absolute top-1/2 -translate-y-1/2 ${isAr ? 'right-3' : 'left-3'} w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors`} />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={isAr ? 'بحث سريع...' : 'Recherche rapide...'}
                  className={`w-full bg-white/60 backdrop-blur-sm border border-gray-200 rounded-2xl ${isAr ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all shadow-sm`}
                />
              </div>
              <div className="relative w-full sm:w-48 group">
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as any)}
                  className={`appearance-none w-full bg-white/60 backdrop-blur-sm border border-gray-200 rounded-2xl ${isAr ? 'pr-4 pl-10' : 'pl-4 pr-10'} py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all shadow-sm cursor-pointer`}
                >
                  <option value="mentionsDesc">{isAr ? 'الأكثر ظهوراً (الافتراضي)' : 'Plus mentionnés (Défaut)'}</option>
                  <option value="mentionsAsc">{isAr ? 'الأقل ظهوراً' : 'Moins mentionnés'}</option>
                  <option value="nameAsc">{isAr ? 'الترتيب الأبجدي (أ - ي)' : 'Ordre alphabétique (A - Z)'}</option>
                  <option value="nameDesc">{isAr ? 'الترتيب الأبجدي (ي - أ)' : 'Ordre alphabétique (Z - A)'}</option>
                </select>
                <Filter className={`absolute top-1/2 -translate-y-1/2 ${isAr ? 'left-3' : 'right-3'} w-4 h-4 text-gray-400 pointer-events-none group-focus-within:text-blue-500`} />
              </div>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex justify-center items-center py-32">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-t-2 border-blue-500 animate-spin"></div>
                <div className="absolute inset-2 rounded-full border-r-2 border-cyan-500 animate-spin" style={{ animationDirection: 'reverse' }}></div>
              </div>
            </div>
          ) : errorMsg ? (
            <div className="text-center p-8 text-red-600 border border-red-100 bg-red-50/80 backdrop-blur-xl rounded-3xl shadow-sm">
              <p className="font-bold">Error</p>
              <p className="text-sm mt-1">{errorMsg}</p>
            </div>
          ) : filteredByLetter.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-gray-400">
              <Building2 className="w-16 h-16 mb-4 opacity-20" />
              <p className="font-medium text-lg text-gray-500">{isAr ? 'لا توجد مؤسسات تطابق بحثك' : 'Aucune institution trouvée'}</p>
            </div>
          ) : (
            <>
              {/* Ultra High Density Grid */}
              <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 mb-8">
                {displayedInstitutions.map((inst) => {
                  const name = isAr ? inst.name_ar : (inst.name_fr || inst.name_ar);
                  
                  return (
                    <Link 
                      href={`/${locale}/institutions/${inst.id}`}
                      key={inst.id} 
                      className="group relative flex flex-col bg-white/80 backdrop-blur-xl rounded-2xl p-3 border border-white shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:shadow-[0_10px_30px_rgb(59,130,246,0.12)] hover:bg-white hover:border-blue-100 transform hover:-translate-y-1 transition-all duration-300"
                    >
                      <div className="flex items-center gap-3">
                        {/* Compact Icon */}
                        <div className="relative w-10 h-10 flex-shrink-0 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 text-slate-400 flex items-center justify-center group-hover:from-blue-500 group-hover:to-cyan-500 group-hover:text-white transition-all duration-500 shadow-inner group-hover:shadow-md group-hover:scale-105">
                          <Building2 size={20} strokeWidth={1.5} />
                        </div>
                        
                        {/* Name (Truncated) */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-[13px] font-bold text-gray-800 truncate leading-tight group-hover:text-blue-600 transition-colors">
                            {name}
                          </h3>
                        </div>
                      </div>

                      {/* Expandable Meta Section on Hover */}
                      <div className="mt-0 overflow-hidden max-h-0 opacity-0 group-hover:max-h-20 group-hover:opacity-100 group-hover:mt-3 transition-all duration-300 ease-in-out">
                        <div className="flex items-center gap-1.5 pt-2 border-t border-gray-100/80">
                          <span className="flex-1 flex flex-col items-center justify-center py-1 rounded-lg bg-blue-50/50 text-blue-600 border border-blue-100/50">
                            <span className="font-extrabold text-[11px] leading-none">{inst.validApptsCount}</span>
                            <span className="text-[9px] mt-0.5">{isAr ? 'ظهور' : 'Mentions'}</span>
                          </span>
                          <span className="flex-1 flex flex-col items-center justify-center py-1 rounded-lg bg-cyan-50/50 text-cyan-600 border border-cyan-100/50">
                            <span className="font-extrabold text-[11px] leading-none">{inst.issues.length}</span>
                            <span className="text-[9px] mt-0.5">{isAr ? 'أعداد' : 'N°'}</span>
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Load More Button */}
              {hasMore && (
                <div className="flex justify-center pb-12">
                  <button
                    onClick={() => setItemsToShow(prev => prev + ITEMS_PER_PAGE)}
                    className="group flex items-center gap-2 px-8 py-3 bg-white hover:bg-gray-50 text-blue-600 font-bold rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-300"
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
