'use client';

import { use, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  FileText, Calendar, BookOpen, Search, ArrowLeft, ArrowRight, BarChart2, Activity,
  Bell, BookMarked, FileSignature, Gavel, Megaphone, Scale, Send, ChevronDown, Layers
} from 'lucide-react';
import Link from 'next/link';
import Breadcrumbs from '@/components/ui/Breadcrumbs';

const iconMap: Record<string, React.ComponentType<any>> = {
  'bell': Bell,
  'book-marked': BookMarked,
  'file-signature': FileSignature,
  'gavel': Gavel,
  'megaphone': Megaphone,
  'scale': Scale,
  'send': Send,
  'file-text': FileText
};

interface EngineProps {
  locale: string;
  documentType: string;
  titleAr: string;
  titleFr: string;
  descriptionAr: string;
  descriptionFr: string;
  icon?: any;
}

export default function DocumentCategoryEngine({ 
  locale, 
  documentType, 
  titleAr, 
  titleFr, 
  descriptionAr, 
  descriptionFr,
  icon 
}: EngineProps) {
  const isAr = locale === 'ar';
  const supabase = createClient();
  const Icon = (typeof icon === 'string' ? iconMap[icon] : icon) || FileText;
  
  const [documents, setDocuments] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, thisYear: 0 });
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'desc' | 'asc'>('desc');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [itemsToShow, setItemsToShow] = useState(40);
  const ITEMS_PER_PAGE = 40;

  const currentYearObj = new Date().getFullYear();
  const availableYears = Array.from({ length: 10 }, (_, i) => (currentYearObj - i).toString());

  // Reset items to show on filter changes
  useEffect(() => {
    setItemsToShow(ITEMS_PER_PAGE);
  }, [sortBy, filterYear]);

  // Fetch Stats (Only on mount / type change)
  useEffect(() => {
    async function fetchStats() {
      const { count: totalCount } = await supabase
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .eq('original_language', locale)
        .eq('type', documentType);
        
      const currentYear = new Date().getFullYear().toString();
      const { count: yearCount } = await supabase
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .eq('type', documentType)
        .eq('original_language', locale)
        .gte('document_date', `${currentYear}-01-01`);
        
      setStats({
        total: totalCount || 0,
        thisYear: yearCount || 0
      });
    }
    fetchStats();
  }, [documentType, locale, supabase]);

  // Fetch Documents
  useEffect(() => {
    async function fetchDocuments() {
      setLoading(true);
      
      let query = supabase
        .from('documents')
        .select('*, issues!inner(issue_number, pdf_url)')
        .eq('type', documentType)
        .eq('original_language', locale)
        .order('document_date', { ascending: sortBy === 'asc' })
        .limit(500); // Fetch a large chunk for client-side pagination
        
      if (filterYear !== 'all') {
        query = query.gte('document_date', `${filterYear}-01-01`).lte('document_date', `${filterYear}-12-31`);
      }

      const { data: docs } = await query;
      if (docs) setDocuments(docs);
      
      setLoading(false);
    }
    fetchDocuments();
  }, [documentType, locale, supabase, sortBy, filterYear]);

  const displayedDocs = documents.slice(0, itemsToShow);
  const hasMore = itemsToShow < documents.length;

  return (
    <div className="min-h-screen bg-[#fafafa]" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Background ambient gradients */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[0%] -right-[10%] w-96 h-96 bg-purple-300/10 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[0%] -left-[10%] w-96 h-96 bg-fuchsia-300/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="max-w-[1400px] mx-auto py-8 px-4 sm:px-6 relative z-10">
        <Breadcrumbs items={[{ label: isAr ? titleAr : titleFr }]} />
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6 border-b border-gray-200/60 pb-8 mt-6">
          <div>
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-500 tracking-tight flex items-center gap-4">
              <div className="p-3 bg-white border border-gray-200 shadow-sm text-gray-700 rounded-2xl">
                <Icon size={28} strokeWidth={2} />
              </div>
              {isAr ? titleAr : titleFr}
            </h1>
            <p className="mt-4 text-lg text-gray-500 max-w-2xl leading-relaxed">
              {isAr ? descriptionAr : descriptionFr}
            </p>
          </div>
          
          {/* Category Specific Search */}
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <Link href={`/${locale}/search?type=${documentType}`} className="group flex items-center justify-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-2xl shadow-md hover:shadow-lg hover:bg-gray-800 transition-all">
              <Search size={18} className="group-hover:scale-110 transition-transform" />
              <span className="font-bold text-sm">{isAr ? `البحث في ${titleAr}` : `Rechercher`}</span>
            </Link>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* Sidebar / Filters */}
          <div className="w-full lg:w-64 flex-shrink-0 flex flex-col gap-4 sticky top-24">
            
            {/* Quick Stats */}
            <div className="bg-white/80 backdrop-blur-xl p-5 rounded-3xl border border-gray-200 shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-gray-100 p-2 rounded-xl text-gray-600"><Layers size={20} /></div>
                <div>
                  <div className="text-2xl font-black text-gray-900">{stats.total}</div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{isAr ? 'إجمالي الوثائق' : 'Total'}</div>
                </div>
              </div>
              <div className="w-full h-px bg-gray-100 my-2"></div>
              <div className="flex items-center gap-3 mt-4">
                <div className="bg-brand-green/10 p-2 rounded-xl text-brand-green"><Calendar size={20} /></div>
                <div>
                  <div className="text-2xl font-black text-gray-900">{stats.thisYear}</div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{isAr ? 'نُشرت هذا العام' : 'Cette année'}</div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white/80 backdrop-blur-xl p-5 rounded-3xl border border-gray-200 shadow-[0_2px_10px_rgb(0,0,0,0.02)] flex flex-col gap-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">{isAr ? 'السنة' : 'Année'}</label>
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-sm font-bold rounded-xl focus:ring-gray-900 focus:border-gray-900 px-3 py-2.5 outline-none cursor-pointer"
                >
                  <option value="all">{isAr ? 'جميع السنوات' : 'Toutes les années'}</option>
                  {availableYears.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">{isAr ? 'الترتيب' : 'Trier par'}</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'desc' | 'asc')}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-sm font-bold rounded-xl focus:ring-gray-900 focus:border-gray-900 px-3 py-2.5 outline-none cursor-pointer"
                >
                  <option value="desc">{isAr ? 'الأحدث أولاً' : 'Les plus récents'}</option>
                  <option value="asc">{isAr ? 'الأقدم أولاً' : 'Les plus anciens'}</option>
                </select>
              </div>
            </div>
            
          </div>

          {/* Main Grid */}
          <div className="flex-1 w-full min-w-0">
            {loading ? (
              <div className="flex justify-center items-center py-32">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-full border-t-2 border-gray-900 animate-spin"></div>
                  <div className="absolute inset-2 rounded-full border-r-2 border-gray-400 animate-spin" style={{ animationDirection: 'reverse' }}></div>
                </div>
              </div>
            ) : documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-gray-400 bg-white/50 backdrop-blur-sm rounded-3xl border border-gray-200">
                <Icon className="w-16 h-16 mb-4 opacity-20" />
                <p className="font-medium text-lg text-gray-500">{isAr ? 'لا توجد بيانات تطابق الفلتر' : 'Aucune donnée disponible'}</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
                  {displayedDocs.map((doc) => (
                    <div key={doc.id} className="group flex flex-col bg-white/80 backdrop-blur-xl rounded-2xl p-5 border border-white shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:shadow-[0_10px_30px_rgb(0,0,0,0.08)] hover:bg-white hover:border-gray-200 transform hover:-translate-y-1 transition-all duration-300">
                      
                      {/* Header Tags */}
                      <div className="flex flex-wrap items-center gap-2 mb-4">
                        <span className="flex items-center justify-center w-7 h-7 bg-gray-900 text-white rounded-lg shadow-sm">
                          <Icon size={14} />
                        </span>
                        {doc.issues?.issue_number && (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-gray-600 bg-gray-100 px-2.5 py-1.5 rounded-md border border-gray-200/60">
                            <BookOpen className="w-3 h-3 text-gray-400" /> 
                            {isAr ? 'عدد' : 'N°'} {doc.issues.issue_number}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-[11px] font-bold text-gray-600 bg-gray-100 px-2.5 py-1.5 rounded-md border border-gray-200/60 mr-auto ml-auto">
                          <Calendar className="w-3 h-3 text-gray-400" /> 
                          {doc.document_date || 'N/A'}
                        </span>
                      </div>
                      
                      {/* Title & Summary */}
                      <Link href={`/${locale}/documents/${doc.id}`} className="flex-1 min-w-0 flex flex-col mb-4 cursor-pointer">
                        <h3 className="text-[14px] font-black text-gray-900 leading-snug group-hover:text-gray-600 transition-colors mb-2 line-clamp-3">
                          {isAr ? doc.title_ar : (doc.title_fr || doc.title_ar)}
                        </h3>
                        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                          {isAr ? (doc.ai_summary_ar || doc.title_ar) : (doc.title_fr || doc.title_ar)}
                        </p>
                      </Link>
                      
                      {/* Action */}
                      <div className="pt-3 border-t border-gray-100/80 mt-auto flex justify-between items-center">
                        <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">{documentType}</span>
                        <Link href={`/${locale}/documents/${doc.id}`} className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-50 text-gray-400 group-hover:bg-gray-900 group-hover:text-white transition-colors">
                          {isAr ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
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
                      className="group flex items-center gap-2 px-8 py-3 bg-white hover:bg-gray-900 text-gray-900 hover:text-white font-bold rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300"
                    >
                      {isAr ? 'عرض المزيد من الوثائق' : 'Charger plus'}
                      <ChevronDown className="w-4 h-4 group-hover:translate-y-1 transition-transform" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

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
