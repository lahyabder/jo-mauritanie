'use client';

import { useState, use } from 'react';
import { Search as SearchIcon, Filter, FileText, ArrowRightLeft, Calendar, User, Briefcase, Zap, BookOpen, ArrowRight, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

export default function SemanticSearchPage({ params }: { params: Promise<{ locale: string }> }) {
  const resolvedParams = use(params);
  const { locale } = resolvedParams;
  const isAr = locale === 'ar';
  
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const supabase = createClient();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setIsSearching(true);
    setHasSearched(true);
    
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*, issues(issue_number)')
        .or(`title_ar.ilike.%${query}%,title_fr.ilike.%${query}%,content_ar.ilike.%${query}%,content_fr.ilike.%${query}%`)
        .limit(20);
        
      if (error) throw error;
      setResults(data || []);
    } catch (err) {
      console.error('Error fetching search results:', err);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#fafafa] flex flex-col" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Header & Search Bar */}
      <div className="bg-gray-900 text-white pt-24 pb-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
           <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-blue-500/20 blur-3xl"></div>
           <div className="absolute -bottom-24 left-1/4 w-96 h-96 rounded-full bg-emerald-500/20 blur-3xl"></div>
        </div>
        
        <div className="max-w-4xl mx-auto relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/10 shadow-sm mb-6">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span className="text-[11px] font-extrabold text-white uppercase tracking-wider">{isAr ? 'بحث سريع' : 'Recherche Rapide'}</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6">
             {isAr ? 'البحث الذكي' : 'Recherche Intelligente'}
          </h1>
          <p className="text-lg text-gray-400 mb-10 max-w-2xl mx-auto font-medium">
            {isAr 
              ? 'ابحث في ملايين السطور من القوانين، المراسيم، التعيينات، والمؤسسات بدقة فائقة عبر الأرشيف الوطني.'
              : 'Recherchez dans des millions de lignes de lois, décrets, nominations et institutions avec une grande précision.'}
          </p>
          
          <form onSubmit={handleSearch} className="relative max-w-3xl mx-auto group">
            <div className="absolute inset-0 bg-white/5 rounded-2xl blur-xl group-hover:bg-white/10 transition-colors pointer-events-none"></div>
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isAr ? 'مثال: "قوانين تنظيم الجمعيات المدنية"...' : 'ex: "Lois régissant les associations"...'}
              className={`w-full ${isAr ? 'pl-20 pr-6' : 'pr-20 pl-6'} py-5 text-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white/15 transition-all outline-none backdrop-blur-md shadow-2xl relative z-10`}
            />
            <button 
              type="submit" 
              className={`absolute top-2.5 bottom-2.5 ${isAr ? 'left-2.5' : 'right-2.5'} px-6 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl transition-colors shadow-lg z-20 flex items-center justify-center min-w-[64px]`}
            >
              {isSearching ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <SearchIcon className="w-5 h-5" />
              )}
            </button>
          </form>
          
          <div className="flex flex-wrap justify-center gap-2 mt-6">
             {(isAr 
                ? ['الكل', 'قوانين', 'مراسيم', 'أشخاص', 'مؤسسات']
                : ['Tout', 'Lois', 'Décrets', 'Personnes', 'Institutions']
             ).map(f => (
               <button key={f} className="px-5 py-2 rounded-xl bg-white/5 text-gray-300 border border-white/10 text-xs font-bold hover:bg-white/15 hover:text-white transition-colors">
                 {f}
               </button>
             ))}
          </div>
        </div>
      </div>

      {/* Results Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full -mt-16 relative z-20">
        
        {!hasSearched ? (
          <div className="bg-white/80 backdrop-blur-2xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-16 text-center text-gray-500 flex flex-col items-center max-w-3xl mx-auto">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
              <SearchIcon className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">{isAr ? 'في انتظار بحثك...' : 'En attente de votre recherche...'}</h3>
            <p className="text-base text-gray-500 font-medium max-w-md">{isAr ? 'اكتب كلمة مفتاحية في صندوق البحث بالأعلى للحصول على نتائج دقيقة من أرشيف الجريدة الرسمية' : 'Tapez un mot-clé dans la barre de recherche ci-dessus pour obtenir des résultats précis du Journal Officiel'}</p>
          </div>
        ) : isSearching ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {[1, 2, 3, 4, 5, 6].map(i => (
               <div key={i} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm animate-pulse flex flex-col gap-4">
                 <div className="h-4 bg-gray-200 rounded-full w-24 mb-2"></div>
                 <div className="h-5 bg-gray-200 rounded-full w-3/4"></div>
                 <div className="h-5 bg-gray-200 rounded-full w-1/2 mb-4"></div>
                 <div className="flex gap-2">
                   <div className="h-8 bg-gray-100 rounded-lg w-20"></div>
                   <div className="h-8 bg-gray-100 rounded-lg w-24"></div>
                 </div>
               </div>
             ))}
          </div>
        ) : (
          <div className="space-y-6">
             <div className="flex justify-between items-center mb-2 px-2 text-sm text-gray-500 bg-white/50 backdrop-blur-md p-4 rounded-2xl border border-gray-200 shadow-sm">
               <span className="font-bold">{isAr ? 'تم العثور على' : 'Trouvé(s)'} <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-lg mx-1">{results.length}</span> {isAr ? 'نتيجة' : 'résultat(s)'}</span>
               <button className="flex items-center gap-2 text-gray-900 font-bold bg-white border border-gray-200 px-4 py-2 rounded-xl hover:bg-gray-50 shadow-sm transition-colors text-xs">
                 <Filter className="w-4 h-4" /> {isAr ? 'تصفية متقدمة' : 'Filtres avancés'}
               </button>
             </div>
             
             {results.length === 0 ? (
                <div className="bg-white/80 backdrop-blur-2xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-16 text-center text-gray-500 flex flex-col items-center max-w-3xl mx-auto">
                  <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mb-6">
                    <SearchIcon className="w-10 h-10 text-rose-300" />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 mb-2">{isAr ? 'لا توجد نتائج' : 'Aucun résultat'}</h3>
                  <p className="text-base text-gray-500 font-medium max-w-md">{isAr ? 'لم نتمكن من العثور على أي وثيقة تطابق كلماتك المفتاحية. جرب استخدام كلمات مختلفة.' : 'Nous n\'avons trouvé aucun document correspondant à vos mots-clés. Essayez d\'utiliser des mots différents.'}</p>
                </div>
             ) : (
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                 {results.map(result => (
                   <div key={result.id} className="group flex flex-col bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-white shadow-[0_2px_10px_rgb(0,0,0,0.03)] hover:shadow-[0_15px_35px_rgb(0,0,0,0.08)] hover:bg-white hover:border-gray-200 transform hover:-translate-y-1 transition-all duration-300">
                     
                     <div className="flex flex-wrap items-center gap-2 mb-4">
                       <span className="flex items-center justify-center px-3 py-1 bg-gray-900 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg shadow-sm">
                         {result.type}
                       </span>
                       <span className="flex items-center gap-1 text-[11px] font-bold text-gray-500 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100">
                         <BookOpen className="w-3 h-3 text-gray-400" /> 
                         {result.issues?.issue_number || 'N/A'}
                       </span>
                       <span className="flex items-center gap-1 text-[11px] font-bold text-gray-500 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100 ml-auto mr-auto">
                         <Calendar className="w-3 h-3 text-gray-400" /> 
                         {result.document_date || 'N/A'}
                       </span>
                     </div>
                     
                     <Link href={`/${locale}/documents/${result.id}`} className="flex-1 min-w-0 flex flex-col mb-4 cursor-pointer">
                       <h3 className="text-[16px] font-black text-gray-900 leading-snug group-hover:text-emerald-600 transition-colors mb-3 line-clamp-2">
                         {isAr ? result.title_ar : (result.title_fr || result.title_ar)}
                       </h3>
                       <p className="text-sm text-gray-500 leading-relaxed line-clamp-3">
                         {isAr ? (result.summary_ar || result.title_ar) : (result.summary_fr || result.summary_ar || result.title_fr || result.title_ar)}
                       </p>
                     </Link>
                     
                     <div className="pt-4 border-t border-gray-100/80 mt-auto flex justify-between items-center">
                       <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-lg border border-emerald-100 uppercase tracking-widest">
                         <Zap className="w-3 h-3" />
                         {isAr ? 'تطابق بحث' : 'Correspondance'}
                       </span>
                       <Link href={`/${locale}/documents/${result.id}`} className="inline-flex items-center text-xs font-bold text-gray-400 group-hover:text-gray-900 transition-colors">
                         {isAr ? 'اقرأ المزيد' : 'Lire la suite'} 
                         {isAr ? <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" /> : <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />}
                       </Link>
                     </div>
                   </div>
                 ))}
               </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
}
