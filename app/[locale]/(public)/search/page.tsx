'use client';

import { useState, use } from 'react';
import { Search as SearchIcon, Filter, FileText, ArrowRightLeft, Calendar, User, Briefcase, Zap } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

const MOCK_RESULTS: any[] = [];

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
    <div className="min-h-[calc(100vh-80px)] bg-gray-50 flex flex-col">
      {/* Header & Search Bar */}
      <div className="bg-slate-900 text-white pt-16 pb-24 px-4 sm:px-6 lg:px-8 border-b border-slate-800 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
           <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-indigo-500 opacity-20 blur-3xl"></div>
        </div>
        
        <div className="max-w-4xl mx-auto relative z-10 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6 flex items-center justify-center gap-4">
             <SearchIcon className="w-10 h-10 text-indigo-400" />
             {isAr ? 'البحث الدلالي الذكي' : 'Recherche Sémantique Intelligente'}
          </h1>
          <p className="text-lg text-slate-400 mb-10 max-w-2xl mx-auto">
            {isAr 
              ? 'ابحث بالمعنى وليس بالكلمات فقط. يدعم البحث عن القوانين، المراسيم، التعيينات، والمؤسسات باللغتين العربية والفرنسية.'
              : 'Recherche par sens, pas seulement par mots-clés. Prend en charge la recherche de lois, décrets, nominations et institutions en arabe et en français.'}
          </p>
          
          <form onSubmit={handleSearch} className="relative max-w-3xl mx-auto">
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isAr ? 'مثال: "قوانين تنظيم الجمعيات المدنية" أو "تعيينات وزارة الصحة 2023"' : 'ex: "Lois régissant les associations civiles" ou "Nominations santé 2023"'}
              className="w-full pl-6 pr-16 py-5 text-lg bg-white/10 border border-white/20 text-white placeholder-slate-400 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none backdrop-blur-sm"
            />
            <button 
              type="submit" 
              className="absolute right-3 top-3 bottom-3 px-6 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors rtl:right-auto rtl:left-3"
            >
              {isSearching ? <Zap className="w-5 h-5 animate-pulse" /> : <SearchIcon className="w-5 h-5" />}
            </button>
          </form>
          
          <div className="flex flex-wrap justify-center gap-3 mt-6">
             {(isAr 
                ? ['الكل', 'قوانين', 'مراسيم', 'أشخاص', 'مؤسسات']
                : ['Tout', 'Lois', 'Décrets', 'Personnes', 'Institutions']
             ).map(f => (
               <button key={f} className="px-4 py-1.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-sm font-medium hover:bg-slate-700 transition-colors">
                 {f}
               </button>
             ))}
          </div>
        </div>
      </div>

      {/* Results Area */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full -mt-10 relative z-20">
        
        {!hasSearched ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center text-gray-500 flex flex-col items-center">
            <SearchIcon className="w-16 h-16 text-gray-200 mb-4" />
            <p className="text-lg">{isAr ? 'ابدأ البحث للحصول على نتائج دقيقة من الجريدة الرسمية' : 'Commencez à taper pour obtenir des résultats précis du Journal Officiel'}</p>
          </div>
        ) : isSearching ? (
          <div className="space-y-4">
             {[1, 2, 3].map(i => (
               <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm animate-pulse flex flex-col gap-3">
                 <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                 <div className="h-4 bg-gray-100 rounded w-full"></div>
                 <div className="h-4 bg-gray-100 rounded w-2/3"></div>
               </div>
             ))}
          </div>
        ) : (
          <div className="space-y-4">
             <div className="flex justify-between items-center mb-6 text-sm text-gray-500">
               <span>{isAr ? 'تم العثور على' : 'Trouvé(s)'} <b className="text-gray-900">{results.length}</b> {isAr ? 'نتيجة' : 'résultat(s)'}</span>
               <button className="flex items-center text-indigo-600 font-medium hover:text-indigo-700">
                 <Filter className="w-4 h-4 mr-1 ml-1" /> {isAr ? 'تصفية متقدمة' : 'Filtres avancés'}
               </button>
             </div>
             
             {results.map(result => (
               <div key={result.id} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow group">
                 <div className="flex justify-between items-start mb-2">
                   <h3 className="text-xl font-bold text-indigo-900 group-hover:text-indigo-600 transition-colors">
                     <Link href={`/${locale}/documents/${result.id}`}>
                       {isAr ? result.title_ar : (result.title_fr || result.title_ar)}
                     </Link>
                   </h3>
                   <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-md border border-indigo-100">
                     {isAr ? 'تطابق نصي' : 'Correspondance textuelle'}
                   </span>
                 </div>
                 
                 <div className="flex flex-wrap gap-3 mb-4 text-xs font-medium text-gray-500">
                   <span className="flex items-center bg-gray-50 px-2 py-1 rounded border border-gray-100"><FileText className="w-3 h-3 mr-1 ml-1" /> {result.type}</span>
                   <span className="flex items-center bg-gray-50 px-2 py-1 rounded border border-gray-100"><BookOpen className="w-3 h-3 mr-1 ml-1" /> {result.issues?.issue_number || 'N/A'}</span>
                   <span className="flex items-center bg-gray-50 px-2 py-1 rounded border border-gray-100"><Calendar className="w-3 h-3 mr-1 ml-1" /> {result.document_date || 'N/A'}</span>
                 </div>
                 
                 <p className="text-gray-600 text-sm leading-relaxed mb-4">
                   {isAr ? (result.summary_ar || result.title_ar) : (result.summary_fr || result.summary_ar || result.title_fr || result.title_ar)}
                 </p>
                 
                 <div className="pt-4 border-t border-gray-50 flex gap-4">
                    <Link href={`/${locale}/documents/${result.id}`} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                      {isAr ? 'قراءة التحليل النصي' : 'Lire l\'analyse du texte'}
                    </Link>
                    {result.pdf_url && (
                      <Link href={result.pdf_url} target="_blank" className="text-sm font-semibold text-rose-600 hover:text-rose-700 flex items-center">
                        <FileText className="w-4 h-4 mr-1 ml-1" /> {isAr ? 'عرض ملف PDF الأصلي' : 'Voir le PDF original'}
                      </Link>
                    )}
                 </div>
               </div>
             ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Dummy icon component for missing BookOpen in imports above
function BookOpen(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>;
}
