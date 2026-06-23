'use client';

import { use, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { BarChart3, TrendingUp, Users, BookOpen } from 'lucide-react';

export default function StatisticsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const isAr = locale === 'ar';
  
  const [stats, setStats] = useState({ docs: 0, entities: 0, issues: 0, relations: 0 });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchStats() {
      const [resDocs, resEnt, resIssues, resRel] = await Promise.all([
        supabase.from('documents').select('id', { count: 'exact', head: true }),
        supabase.from('entities').select('id', { count: 'exact', head: true }),
        supabase.from('issues').select('id', { count: 'exact', head: true }),
        supabase.from('legal_relations').select('id', { count: 'exact', head: true })
      ]);
      setStats({
        docs: resDocs.count || 0,
        entities: resEnt.count || 0,
        issues: resIssues.count || 0,
        relations: resRel.count || 0
      });
      setLoading(false);
    }
    fetchStats();
  }, []);

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 sm:px-6">
      <div className="flex justify-between items-center mb-8 border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <BarChart3 className={`w-8 h-8 text-indigo-600 ${isAr ? 'ml-3' : 'mr-3'}`} />
            {isAr ? 'الإحصائيات والتحليلات' : 'Statistics & Analytics'}
          </h1>
          <p className="mt-2 text-gray-500 max-w-2xl">
            {isAr ? 'تحليلات ورسوم بيانية حول النشاط القانوني والمؤسسي' : 'Analytics and charts on legal and institutional activity'}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                <BookOpen size={24} />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-1">{stats.issues}</h3>
              <p className="text-sm text-gray-500 font-medium">{isAr ? 'أعداد مؤرشفة' : 'Archived Issues'}</p>
            </div>
            
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4">
                <FileText size={24} />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-1">{stats.docs}</h3>
              <p className="text-sm text-gray-500 font-medium">{isAr ? 'وثيقة مستخرجة' : 'Extracted Documents'}</p>
            </div>
            
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center mb-4">
                <Users size={24} />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-1">{stats.entities}</h3>
              <p className="text-sm text-gray-500 font-medium">{isAr ? 'كيان مسجل (شخص/مؤسسة)' : 'Registered Entities'}</p>
            </div>
            
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4">
                <TrendingUp size={24} />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-1">{stats.relations}</h3>
              <p className="text-sm text-gray-500 font-medium">{isAr ? 'علاقة قانونية مستخرجة' : 'Extracted Legal Relations'}</p>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm text-center text-gray-500 h-64 flex items-center justify-center">
             {isAr ? 'الرسوم البيانية قيد الإنشاء...' : 'Charts are under construction...'}
          </div>
        </div>
      )}
    </div>
  );
}

// Dummy icon for FileText missing from imports
function FileText(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>;
}
