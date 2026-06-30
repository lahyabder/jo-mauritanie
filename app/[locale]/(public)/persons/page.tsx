'use client';

import { use, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { UserCircle2, Search, Filter, ChevronDown } from 'lucide-react';
import Link from 'next/link';

export default function PersonsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const isAr = locale === 'ar';

  const [persons, setPersons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'official' | 'other'>('official');
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'mentionsDesc' | 'mentionsAsc' | 'nameAsc' | 'nameDesc'>('mentionsDesc');
  const [itemsToShow, setItemsToShow] = useState(100); // Dense layout allows more items
  const ITEMS_PER_PAGE = 100;
  
  const supabase = createClient();

  // Reset items to show when filters change
  useEffect(() => {
    setItemsToShow(ITEMS_PER_PAGE);
  }, [query, sortOrder, activeTab, activeLetter]);

  useEffect(() => {
    async function fetchPersons() {
      setLoading(true);
      let req = supabase
        .from('persons')
        .select(`
          id, full_name_ar, full_name_fr, current_role_title_ar, current_role_title_fr, gender, is_active, person_role,
          appointment_history!inner (
            position_title_ar, position_title_fr, appointment_date,
            issues!inner ( id, issue_number, publication_date, is_published, language )
          )
        `)
        .eq('appointment_history.issues.is_published', true)
        .eq('appointment_history.issues.language', locale);

      if (isAr) {
        req = req.not('full_name_ar', 'is', null).neq('full_name_ar', '');
      } else {
        req = req.not('full_name_fr', 'is', null).neq('full_name_fr', '');
      }

      if (query.trim()) {
        req = req.ilike(isAr ? 'full_name_ar' : 'full_name_fr', `%${query.trim()}%`);
      }

      const { data, error } = await req;
      if (error) {
        console.error("Supabase fetch persons error:", error);
        setErrorMsg(error.message);
      } else {
        setErrorMsg(null);
      }

      // Process data for the table
      if (data) {
        const processed = data.map((p: any) => {
          // Filter out appointments from unpublished issues
          const validAppts = (p.appointment_history || []).filter((a: any) => a.issues?.is_published);
          
          const issuesMap = new Map<string, string>(); // issue_number -> id

          validAppts.forEach((a: any) => {
            const issueNum = a.issues?.issue_number ? String(a.issues.issue_number) : null;
            const issueId = a.issues?.id;
            
            if (issueNum && issueId) issuesMap.set(issueNum, issueId);
          });

          return {
            ...p,
            validApptsCount: validAppts.length,
            issues: Array.from(issuesMap.entries()).map(([num, id]) => ({ num, id })).sort((a, b) => Number(b.num) - Number(a.num))
          };
        });
        
        setPersons(processed);
      }
      setLoading(false);
    }
    fetchPersons();
  }, [query, isAr, supabase, locale]);

  // Smart heuristic to determine if a person holds an official state position
  const isOfficial = (person: any) => {
    if (person.person_role && person.person_role !== 'other') return true;
    const roleTitle = person.current_role_title_ar || '';
    const associationKeywords = ['جمعية', 'منظمة', 'نقابة', 'اتحاد', 'رابطة', 'تعاونية', 'نادي', 'مؤسسة خيرية', 'تجمع', 'أهلية'];
    for (const keyword of associationKeywords) {
      if (roleTitle.includes(keyword)) return false;
    }
    const officialKeywords = ['وزير', 'مدير', 'رئيس محكمة', 'قاضي', 'سفير', 'مستشار', 'أمين عام', 'والي', 'حاكم', 'عمدة', 'مفتش', 'وكيل', 'ضابط', 'لجنة وطنية'];
    for (const keyword of officialKeywords) {
      if (roleTitle.includes(keyword)) return true;
    }
    return true; 
  };

  const filteredPersons = persons.filter(p => activeTab === 'official' ? isOfficial(p) : !isOfficial(p));

  const sortedPersons = [...filteredPersons].sort((a, b) => {
    if (sortOrder === 'nameAsc') {
      const nameA = isAr ? a.full_name_ar : (a.full_name_fr || a.full_name_ar);
      const nameB = isAr ? b.full_name_ar : (b.full_name_fr || b.full_name_ar);
      return (nameA || '').localeCompare(nameB || '');
    } else if (sortOrder === 'nameDesc') {
      const nameA = isAr ? a.full_name_ar : (a.full_name_fr || a.full_name_ar);
      const nameB = isAr ? b.full_name_ar : (b.full_name_fr || b.full_name_ar);
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
    ? sortedPersons.filter(p => {
        const name = isAr ? p.full_name_ar : (p.full_name_fr || p.full_name_ar);
        if (!name) return false;
        const firstChar = name.trim().charAt(0).toUpperCase();
        if (activeLetter === 'ا' || activeLetter === 'A') {
           if (isAr) return ['ا', 'أ', 'إ', 'آ'].includes(firstChar);
        }
        return firstChar === activeLetter;
      })
    : sortedPersons;

  const displayedPersons = filteredByLetter.slice(0, itemsToShow);
  const hasMore = itemsToShow < filteredByLetter.length;

  return (
    <div className="min-h-screen bg-[#fafafa]" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Background ambient gradients */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] -right-20 w-96 h-96 bg-indigo-300/20 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] -left-20 w-96 h-96 bg-fuchsia-300/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="max-w-[1400px] mx-auto py-8 px-4 sm:px-6 relative z-10 flex flex-col lg:flex-row gap-6 lg:gap-10 items-start">
        
        {/* Sticky Vertical Alphabet Scroller - Visible on LG screens */}
        <div className="hidden lg:flex flex-col sticky top-24 h-[calc(100vh-8rem)] w-10 flex-shrink-0">
          <div className="flex flex-col gap-0.5 bg-white/60 backdrop-blur-xl border border-gray-200/60 p-1.5 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full overflow-y-auto hide-scrollbar">
            <button 
              onClick={() => setActiveLetter(null)}
              className={`w-full py-1.5 rounded-lg text-[10px] font-extrabold transition-all duration-300 ${
                !activeLetter 
                  ? 'bg-indigo-600 text-white shadow-md scale-110' 
                  : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'
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
                    ? 'bg-indigo-600 text-white shadow-md scale-110' 
                    : 'text-gray-500 hover:text-indigo-600 hover:bg-indigo-50'
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
                  ? 'bg-indigo-600 text-white shadow-md scale-105' 
                  : 'bg-white/80 text-gray-500 border border-gray-200 shadow-sm hover:text-indigo-600'
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
                    ? 'bg-indigo-600 text-white shadow-md scale-110' 
                    : 'bg-white/80 text-gray-500 border border-gray-200 shadow-sm hover:text-indigo-600 hover:bg-indigo-50'
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
              <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-900 to-indigo-500 tracking-tight flex items-center gap-3">
                {isAr ? 'دليل الشخصيات' : 'Annuaire des Personnalités'}
              </h1>
              <p className="mt-3 text-gray-500 text-sm md:text-base max-w-xl leading-relaxed">
                {isAr
                  ? 'استكشف شبكة المسؤولين والشخصيات المذكورة في الجريدة الرسمية الموريتانية عبر واجهة عصرية عالية الكثافة.'
                  : 'Explorez le réseau des officiels et personnalités mentionnés dans le Journal Officiel avec une interface moderne à haute densité.'}
              </p>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-64 group">
                <Search className={`absolute top-1/2 -translate-y-1/2 ${isAr ? 'right-3' : 'left-3'} w-4 h-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors`} />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={isAr ? 'بحث سريع...' : 'Recherche rapide...'}
                  className={`w-full bg-white/60 backdrop-blur-sm border border-gray-200 rounded-2xl ${isAr ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all shadow-sm`}
                />
              </div>
              <div className="relative w-full sm:w-48 group">
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as any)}
                  className={`appearance-none w-full bg-white/60 backdrop-blur-sm border border-gray-200 rounded-2xl ${isAr ? 'pr-4 pl-10' : 'pl-4 pr-10'} py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all shadow-sm cursor-pointer`}
                >
                  <option value="mentionsDesc">{isAr ? 'الأكثر ظهوراً' : 'Plus mentionnés'}</option>
                  <option value="mentionsAsc">{isAr ? 'الأقل ظهوراً' : 'Moins mentionnés'}</option>
                  <option value="nameAsc">{isAr ? 'الترتيب الأبجدي (أ - ي)' : 'Ordre alphabétique (A - Z)'}</option>
                  <option value="nameDesc">{isAr ? 'الترتيب الأبجدي (ي - أ)' : 'Ordre alphabétique (Z - A)'}</option>
                </select>
                <Filter className={`absolute top-1/2 -translate-y-1/2 ${isAr ? 'left-3' : 'right-3'} w-4 h-4 text-gray-400 pointer-events-none group-focus-within:text-indigo-500`} />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap items-center p-1 mb-8 bg-gray-200/40 backdrop-blur-md rounded-2xl border border-gray-200/50 w-full sm:w-fit mx-auto lg:mx-0">
            <button
              onClick={() => setActiveTab('official')}
              className={`flex-1 sm:flex-none px-6 py-2 rounded-xl font-bold text-sm transition-all duration-300 ${
                activeTab === 'official'
                  ? 'bg-white text-indigo-700 shadow-md border-b border-indigo-100'
                  : 'bg-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100/50'
              }`}
            >
              {isAr ? 'مسؤولون حكوميون' : 'Responsables Officiels'}
            </button>
            <button
              onClick={() => setActiveTab('other')}
              className={`flex-1 sm:flex-none px-6 py-2 rounded-xl font-bold text-sm transition-all duration-300 ${
                activeTab === 'other'
                  ? 'bg-white text-indigo-700 shadow-md border-b border-indigo-100'
                  : 'bg-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100/50'
              }`}
            >
              {isAr ? 'شخصيات أخرى / جمعيات' : 'Autres Personnalités / Associations'}
            </button>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex justify-center items-center py-32">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-t-2 border-indigo-500 animate-spin"></div>
                <div className="absolute inset-2 rounded-full border-r-2 border-fuchsia-500 animate-spin" style={{ animationDirection: 'reverse' }}></div>
              </div>
            </div>
          ) : errorMsg ? (
            <div className="text-center p-8 text-red-600 border border-red-100 bg-red-50/80 backdrop-blur-xl rounded-3xl shadow-sm">
              <p className="font-bold">Error</p>
              <p className="text-sm mt-1">{errorMsg}</p>
            </div>
          ) : filteredPersons.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-gray-400">
              <UserCircle2 className="w-16 h-16 mb-4 opacity-20" />
              <p className="font-medium text-lg text-gray-500">{isAr ? 'لا توجد شخصيات تطابق بحثك' : 'Aucune personnalité trouvée'}</p>
            </div>
          ) : (
            <>
              {/* Ultra High Density Grid */}
              <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 mb-8">
                {displayedPersons.map((person) => {
                  const name = isAr ? person.full_name_ar : (person.full_name_fr || person.full_name_ar);
                  const isFemale = person.gender === 'F';
                  const isMale = person.gender === 'M';
                  
                  return (
                    <Link 
                      href={`/${locale}/persons/${person.id}`}
                      key={person.id} 
                      className="group relative flex flex-col bg-white/80 backdrop-blur-xl rounded-2xl p-3 border border-white shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:shadow-[0_10px_30px_rgb(99,102,241,0.12)] hover:bg-white hover:border-indigo-100 transform hover:-translate-y-1 transition-all duration-300"
                    >
                      <div className="flex items-center gap-3">
                        {/* Compact Avatar */}
                        <div className={`relative w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center transition-all duration-500 shadow-inner group-hover:shadow-md group-hover:scale-105 ${
                          isFemale 
                          ? 'bg-gradient-to-br from-pink-50 to-rose-100 text-pink-400 group-hover:from-pink-500 group-hover:to-rose-500 group-hover:text-white' 
                          : isMale
                          ? 'bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-400 group-hover:from-blue-500 group-hover:to-indigo-500 group-hover:text-white'
                          : 'bg-gradient-to-br from-slate-50 to-slate-100 text-slate-400 group-hover:from-indigo-400 group-hover:to-purple-500 group-hover:text-white'
                        }`}>
                          <UserCircle2 size={20} strokeWidth={1.5} />
                          {/* Gender Indicator Dot */}
                          {isFemale && (
                            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-100 rounded-full flex items-center justify-center text-rose-500 border-[1.5px] border-white group-hover:bg-white group-hover:text-rose-500">
                              <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="10" r="6"/><path d="M12 16v6"/><path d="M9 19h6"/></svg>
                            </div>
                          )}
                          {isMale && (
                            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-blue-100 rounded-full flex items-center justify-center text-blue-500 border-[1.5px] border-white group-hover:bg-white group-hover:text-blue-500">
                              <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="14" r="6"/><path d="m14 10 7-7"/><path d="M16 3h5v5"/></svg>
                            </div>
                          )}
                        </div>
                        
                        {/* Name (Truncated) */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-[13px] font-bold text-gray-800 truncate leading-tight group-hover:text-indigo-600 transition-colors">
                            {name}
                          </h3>
                        </div>
                      </div>

                      {/* Expandable Meta Section on Hover */}
                      <div className="mt-0 overflow-hidden max-h-0 opacity-0 group-hover:max-h-20 group-hover:opacity-100 group-hover:mt-3 transition-all duration-300 ease-in-out">
                        <div className="flex items-center gap-1.5 pt-2 border-t border-gray-100/80">
                          <span className="flex-1 flex flex-col items-center justify-center py-1 rounded-lg bg-indigo-50/50 text-indigo-600 border border-indigo-100/50">
                            <span className="font-extrabold text-[11px] leading-none">{person.validApptsCount}</span>
                            <span className="text-[9px] mt-0.5">{isAr ? 'ظهور' : 'Mentions'}</span>
                          </span>
                          <span className="flex-1 flex flex-col items-center justify-center py-1 rounded-lg bg-purple-50/50 text-purple-600 border border-purple-100/50">
                            <span className="font-extrabold text-[11px] leading-none">{person.issues.length}</span>
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
                    className="group flex items-center gap-2 px-8 py-3 bg-white hover:bg-gray-50 text-indigo-600 font-bold rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-300"
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
      
      {/* Add a tiny style block to hide the scrollbar for the alphabet scroller */}
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
