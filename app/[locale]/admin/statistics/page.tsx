'use client';

import { use, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { BarChart3, TrendingUp, Users, BookOpen } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function AdminStatisticsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const isAr = locale === 'ar';
  
  const [stats, setStats] = useState({ docs: 0, entities: 0, issues: 0, relations: 0 });
  const [docTypes, setDocTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchStats() {
      // Basic counts
      const [resDocs, resPersons, resInstitutions, resIssues, resRel] = await Promise.all([
        supabase.from('documents').select('id', { count: 'exact', head: true }),
        supabase.from('persons').select('id', { count: 'exact', head: true }),
        supabase.from('institutions').select('id', { count: 'exact', head: true }),
        supabase.from('issues').select('id', { count: 'exact', head: true }),
        supabase.from('document_relations').select('id', { count: 'exact', head: true })
      ]);
      
      const totalEntities = (resPersons.count || 0) + (resInstitutions.count || 0);

      setStats({
        docs: resDocs.count || 0,
        entities: totalEntities,
        issues: resIssues.count || 0,
        relations: resRel.count || 0
      });

      // Document Types for Chart
      const { data: typesData } = await supabase.from('documents').select('type');
      if (typesData) {
        const typeCounts = typesData.reduce((acc: any, curr: any) => {
          acc[curr.type] = (acc[curr.type] || 0) + 1;
          return acc;
        }, {});
        
        const typeLabels: Record<string, string> = {
          'law': isAr ? 'قانون' : 'Law',
          'decree': isAr ? 'مرسوم' : 'Decree',
          'decision': isAr ? 'مقرر' : 'Decision',
          'regulation': isAr ? 'نظام' : 'Regulation',
          'circular': isAr ? 'تعميم' : 'Circular',
          'notification': isAr ? 'بلاغ' : 'Notification',
          'announcement': isAr ? 'إعلان' : 'Announcement',
          'other': isAr ? 'أخرى' : 'Other'
        };

        const formattedChartData = Object.keys(typeCounts).map(key => ({
          name: typeLabels[key] || key,
          value: typeCounts[key]
        })).sort((a, b) => b.value - a.value);

        setDocTypes(formattedChartData);
      }
      
      setLoading(false);
    }
    fetchStats();
  }, []);

  const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

  return (
    <div className="w-full" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex justify-between items-center mb-8 border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <BarChart3 className={`w-7 h-7 text-indigo-600 ${isAr ? 'ml-3' : 'mr-3'}`} />
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
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>
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
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
            {/* Chart 1: Bar Chart */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-6">{isAr ? 'الوثائق حسب النوع' : 'Documents by Type'}</h3>
              <div className="h-80 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={docTypes} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{fill: '#6B7280'}} axisLine={false} tickLine={false} />
                    <YAxis tick={{fill: '#6B7280'}} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{fill: '#F3F4F6'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                    <Bar dataKey="value" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Pie Chart */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-6">{isAr ? 'التوزيع النسبي للوثائق' : 'Relative Distribution of Documents'}</h3>
              <div className="h-80 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={docTypes}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {docTypes.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-4 mt-2">
                {docTypes.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                    {entry.name} ({entry.value})
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
