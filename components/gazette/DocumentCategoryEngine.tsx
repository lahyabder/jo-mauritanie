'use client';

import { use, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  FileText, Calendar, BookOpen, Search, ArrowLeft, ArrowRight, BarChart2, Activity,
  Bell, BookMarked, FileSignature, Gavel, Megaphone, Scale, Send
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
  documentType: string; // e.g. 'law', 'decree', 'regulation'
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

  const currentYearObj = new Date().getFullYear();
  const availableYears = Array.from({ length: 10 }, (_, i) => (currentYearObj - i).toString());

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
        .limit(24);
        
      if (filterYear !== 'all') {
        query = query.gte('document_date', `${filterYear}-01-01`).lte('document_date', `${filterYear}-12-31`);
      }

      const { data: docs } = await query;
      if (docs) setDocuments(docs);
      
      setLoading(false);
    }
    fetchDocuments();
  }, [documentType, locale, supabase, sortBy, filterYear]);

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6">
      <Breadcrumbs items={[{ label: isAr ? titleAr : titleFr }]} />
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 flex items-center">
            <div className={`p-3 bg-brand-green/10 text-brand-green rounded-xl ${isAr ? 'ml-4' : 'mr-4'}`}>
              <Icon size={32} />
            </div>
            {isAr ? titleAr : titleFr}
          </h1>
          <p className="mt-3 text-lg text-gray-500 max-w-2xl">
            {isAr ? descriptionAr : descriptionFr}
          </p>
        </div>
        
        {/* Category Specific Search */}
        <div className="w-full md:w-auto">
          <Link href={`/${locale}/search?type=${documentType}`} className="flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 px-6 py-3 rounded-xl shadow-sm hover:bg-gray-50 transition-colors w-full">
            <Search size={20} />
            <span className="font-medium">{isAr ? `البحث في ${titleAr}` : `Rechercher dans ${titleFr}`}</span>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="bg-brand-red/10 text-brand-red p-4 rounded-full"><BookOpen size={24} /></div>
          <div>
            <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm font-medium text-gray-500">{isAr ? `إجمالي ${titleAr}` : `Total ${titleFr}`}</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="bg-brand-yellow/20 text-brand-yellow p-4 rounded-full"><Calendar size={24} /></div>
          <div>
            <div className="text-3xl font-bold text-gray-900">{stats.thisYear}</div>
            <div className="text-sm font-medium text-gray-500">{isAr ? 'نُشرت هذا العام' : 'Publié cette année'}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-10">
        {/* Latest Documents List */}
        <div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h2 className="text-2xl font-bold text-gray-900">
              {sortBy === 'desc' && filterYear === 'all' 
                ? (isAr ? 'أحدث الإصدارات' : 'Dernières parutions')
                : (isAr ? 'قائمة الإصدارات' : 'Liste des parutions')
              }
            </h2>
            
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-brand-green focus:border-brand-green px-3 py-2 outline-none shadow-sm cursor-pointer"
              >
                <option value="all">{isAr ? 'جميع السنوات' : 'Toutes les années'}</option>
                {availableYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'desc' | 'asc')}
                className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-brand-green focus:border-brand-green px-3 py-2 outline-none shadow-sm cursor-pointer"
              >
                <option value="desc">{isAr ? 'الأحدث أولاً' : 'Les plus récents'}</option>
                <option value="asc">{isAr ? 'الأقدم أولاً' : 'Les plus anciens'}</option>
              </select>
            </div>
          </div>
          
          {loading ? (
            <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-green"></div></div>
          ) : documents.length === 0 ? (
            <div className="text-center p-12 text-gray-500 border border-dashed rounded-xl bg-gray-50">
              {isAr ? 'لا توجد بيانات متاحة.' : 'Aucune donnée disponible.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {documents.map((doc) => (
                <Link
                  href={`/${locale}/documents/${doc.id}`}
                  key={doc.id} 
                  className="group flex flex-col relative bg-white/80 backdrop-blur-xl p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden min-h-[320px]"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-brand-green/5 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-brand-green/10 transition-colors"></div>
                  
                  <div className="relative z-10 flex flex-col h-full gap-4 items-start w-full">
                    <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-green/10 text-brand-green flex-shrink-0 mb-1">
                      <FileText className="w-6 h-6" strokeWidth={1.5} />
                    </div>
                    
                    <div className="flex flex-col flex-1 w-full">
                      <h3 className="text-lg font-bold text-gray-800 group-hover:text-brand-green transition-colors leading-snug mb-3 line-clamp-2">
                        {isAr ? doc.title_ar : (doc.title_fr || doc.title_ar)}
                      </h3>
                      
                      <div className="flex flex-wrap gap-2 mb-4 text-xs font-medium">
                        <span className="flex items-center bg-gray-50 text-gray-600 px-3 py-1.5 rounded-lg border border-gray-100">
                          <Calendar className={`w-3.5 h-3.5 ${isAr ? 'ml-1.5' : 'mr-1.5'} text-brand-green`} /> 
                          {doc.document_date || 'N/A'}
                        </span>
                        <span className="flex items-center bg-gray-50 text-gray-600 px-3 py-1.5 rounded-lg border border-gray-100">
                          <BookOpen className={`w-3.5 h-3.5 ${isAr ? 'ml-1.5' : 'mr-1.5'} text-brand-green`} /> 
                          {isAr ? 'العدد' : 'Numéro'} {doc.issues?.issue_number || 'N/A'}
                        </span>
                      </div>
                      
                      <p className="text-gray-500 text-sm leading-relaxed mb-5 line-clamp-3 flex-1">
                        {isAr ? (doc.summary_ar || doc.title_ar) : (doc.summary_fr || doc.summary_ar || doc.title_fr || doc.title_ar)}
                      </p>
                      
                      <div className="flex items-center text-sm font-bold text-brand-red group-hover:text-red-700 transition-colors mt-auto pt-4 border-t border-gray-100">
                        {isAr ? 'قراءة التفاصيل' : 'Lire les détails'} 
                        <span className={`transform transition-transform group-hover:${isAr ? '-translate-x-1' : 'translate-x-1'}`}>
                          {isAr ? <ArrowLeft className="w-4 h-4 mr-1" /> : <ArrowRight className="w-4 h-4 ml-1" />}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
