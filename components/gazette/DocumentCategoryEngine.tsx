'use client';

import { use, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { FileText, Calendar, BookOpen, Search, ArrowLeft, ArrowRight, BarChart2, Activity } from 'lucide-react';
import Link from 'next/link';
import Breadcrumbs from '@/components/ui/Breadcrumbs';

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
  icon: Icon = FileText 
}: EngineProps) {
  const isAr = locale === 'ar';
  const supabase = createClient();
  
  const [documents, setDocuments] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, thisYear: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      // Fetch latest documents of this type
      const { data: docs } = await supabase
        .from('documents')
        .select('*, issues(issue_number, pdf_url)')
        .eq('type', documentType)
        .order('published_date', { ascending: false })
        .limit(10);
        
      if (docs) setDocuments(docs);
      
      // Fetch stats
      const { count: totalCount } = await supabase
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .eq('type', documentType);
        
      const currentYear = new Date().getFullYear().toString();
      const { count: yearCount } = await supabase
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .eq('type', documentType)
        .gte('published_date', `${currentYear}-01-01`);
        
      setStats({
        total: totalCount || 0,
        thisYear: yearCount || 0
      });
      
      setLoading(false);
    }
    fetchData();
  }, [documentType]);

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6">
      <Breadcrumbs items={[{ label: isAr ? titleAr : titleFr }]} />
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 flex items-center">
            <div className={`p-3 bg-indigo-50 text-indigo-600 rounded-xl ${isAr ? 'ml-4' : 'mr-4'}`}>
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
            <span className="font-medium">{isAr ? `البحث في ${titleAr}` : `Search in ${titleFr}`}</span>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="bg-blue-50 text-blue-600 p-4 rounded-full"><BookOpen size={24} /></div>
          <div>
            <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm font-medium text-gray-500">{isAr ? `إجمالي ${titleAr}` : `Total ${titleFr}`}</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="bg-green-50 text-green-600 p-4 rounded-full"><Calendar size={24} /></div>
          <div>
            <div className="text-3xl font-bold text-gray-900">{stats.thisYear}</div>
            <div className="text-sm font-medium text-gray-500">{isAr ? 'نُشرت هذا العام' : 'Published This Year'}</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="bg-purple-50 text-purple-600 p-4 rounded-full"><Activity size={24} /></div>
          <div>
            <div className="text-3xl font-bold text-gray-900">
               <Link href={`/${locale}/statistics`} className="hover:text-purple-600 underline decoration-purple-300 underline-offset-4">{isAr ? 'عرض' : 'View'}</Link>
            </div>
            <div className="text-sm font-medium text-gray-500">{isAr ? 'تحليلات متقدمة' : 'Advanced Analytics'}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Latest Documents List */}
        <div className="lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">{isAr ? 'أحدث الإصدارات' : 'Latest Releases'}</h2>
          </div>
          
          {loading ? (
            <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
          ) : documents.length === 0 ? (
            <div className="text-center p-12 text-gray-500 border border-dashed rounded-xl bg-gray-50">
              {isAr ? 'لا توجد بيانات متاحة.' : 'No data available.'}
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((doc) => (
                <div key={doc.id} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow group">
                  <h3 className="text-xl font-bold text-indigo-900 group-hover:text-indigo-600 transition-colors mb-2">
                    <Link href={`/${locale}/documents/${doc.id}`}>{doc.title}</Link>
                  </h3>
                  <div className="flex flex-wrap gap-3 mb-4 text-xs font-medium text-gray-500">
                    <span className="flex items-center bg-gray-50 px-2 py-1 rounded border border-gray-100"><Calendar className="w-3 h-3 mr-1 ml-1" /> {doc.published_date || 'N/A'}</span>
                    <span className="flex items-center bg-gray-50 px-2 py-1 rounded border border-gray-100"><BookOpen className="w-3 h-3 mr-1 ml-1" /> {isAr ? 'العدد' : 'Issue'} {doc.issues?.issue_number || 'N/A'}</span>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed mb-4">{doc.snippet || doc.title}</p>
                  <Link href={`/${locale}/documents/${doc.id}`} className="inline-flex items-center text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                    {isAr ? 'قراءة التفاصيل' : 'Read Details'} 
                    {isAr ? <ArrowLeft className="w-4 h-4 mr-1" /> : <ArrowRight className="w-4 h-4 ml-1" />}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Sidebar: Specialized Timeline & Relations */}
        <div className="space-y-8">
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">{isAr ? 'التسلسل الزمني المتخصص' : 'Specialized Timeline'}</h3>
            <p className="text-sm text-gray-600 mb-4">
              {isAr ? `تتبع تطور ${titleAr} عبر الزمن.` : `Track the evolution of ${titleFr} over time.`}
            </p>
            <Link href={`/${locale}/timeline?type=${documentType}`} className="text-indigo-600 text-sm font-medium hover:underline">
              {isAr ? 'فتح المخطط الزمني' : 'Open Timeline'} &rarr;
            </Link>
          </div>
          
          <div className="bg-indigo-900 text-white rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-bold mb-2">{isAr ? 'شبكة العلاقات القانونية' : 'Legal Relations Graph'}</h3>
            <p className="text-sm text-indigo-200 mb-6 leading-relaxed">
              {isAr ? `استكشف التعديلات والإلغاءات المرتبطة بـ ${titleAr} بصرياً.` : `Visually explore amendments and repeals linked to ${titleFr}.`}
            </p>
            <Link href={`/${locale}/relations?focus=${documentType}`} className="block text-center bg-white text-indigo-900 px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-50 transition-colors">
              {isAr ? 'عرض خريطة العلاقات' : 'View Relations Map'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
