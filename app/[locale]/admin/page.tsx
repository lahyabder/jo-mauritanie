'use client';

import { use, useState, useEffect } from 'react';
import { BarChart3, Users, FileText, Activity, ArrowUpRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function AdminDashboard({ params }: { params: Promise<{ locale: string }> }) {
  const resolvedParams = use(params);
  const { locale } = resolvedParams;
  const isAr = locale === 'ar';

  const [dataStats, setDataStats] = useState({ decrees: 0, persons: 0, syncs: 0 });
  const [logs, setLogs] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    async function fetchAdminData() {
      const [res1, res2, res3, resLogs] = await Promise.all([
        supabase.from('documents').select('id', { count: 'exact', head: true }).in('type', ['مرسوم', 'قانون']),
        supabase.from('entities').select('id', { count: 'exact', head: true }).eq('type', 'person'),
        supabase.from('sync_logs').select('id', { count: 'exact', head: true }),
        supabase.from('sync_logs').select('*').order('created_at', { ascending: false }).limit(4)
      ]);
      setDataStats({
        decrees: res1.count || 0,
        persons: res2.count || 0,
        syncs: res3.count || 0
      });
      if (resLogs.data) setLogs(resLogs.data);
    }
    fetchAdminData();
  }, []);

  const stats = [
    { title: isAr ? 'المراسيم المستخرجة' : 'Décrets extraits', value: dataStats.decrees.toString(), trend: '+0%', icon: FileText, color: 'bg-blue-100 text-blue-600' },
    { title: isAr ? 'الشخصيات المسجلة' : 'Personnes enregistrées', value: dataStats.persons.toString(), trend: '+0%', icon: Users, color: 'bg-green-100 text-green-600' },
    { title: isAr ? 'عمليات المزامنة' : 'Opérations de synchronisation', value: dataStats.syncs.toString(), trend: isAr ? 'آخر 7 أيام' : '7 derniers jours', icon: Activity, color: 'bg-purple-100 text-purple-600' },
    { title: isAr ? 'دقة الذكاء الاصطناعي' : 'Précision de l\'IA', value: '95%', trend: '+0%', icon: BarChart3, color: 'bg-amber-100 text-amber-600' },
  ];

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{isAr ? 'نظرة عامة على النظام' : 'Vue d\'ensemble du système'}</h1>
        <p className="text-gray-500 mt-1">{isAr ? 'مراقبة أداء المنصة ومعالجة الذكاء الاصطناعي' : 'Surveiller les performances de la plateforme et le traitement de l\'IA'}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                  <Icon size={20} />
                </div>
                <span className="flex items-center text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  {stat.trend} <ArrowUpRight size={12} className="ml-1" />
                </span>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</h3>
              <p className="text-sm text-gray-500 font-medium">{stat.title}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm col-span-2">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900">{isAr ? 'أحدث المعالجات (الذكاء الاصطناعي)' : 'Traitements récents (IA)'}</h2>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">{isAr ? 'عرض الكل' : 'Voir tout'}</button>
          </div>
          <div className="divide-y divide-gray-100">
            {logs.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                {isAr ? 'لا توجد سجلات مزامنة بعد.' : 'Aucun journal de synchronisation.'}
              </div>
            ) : (
              logs.map((job, i) => (
                <div key={i} className="p-4 hover:bg-gray-50 flex items-center justify-between transition-colors">
                  <div className="flex items-center gap-4">
                    {job.status === 'success' ? (
                      <CheckCircle2 className="text-green-500" size={20} />
                    ) : (
                      <AlertCircle className="text-red-500" size={20} />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{job.file_name}</p>
                      <p className="text-xs text-gray-500">{job.error_message || (isAr ? 'اكتمل استخراج البيانات' : 'Extraction de données terminée')}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(job.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">{isAr ? 'حالة النظام' : 'État du système'}</h2>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">{isAr ? 'اتصال قاعدة البيانات' : 'Connexion base de données'}</span>
                <span className="text-xs text-green-600 font-bold bg-green-50 px-2 py-1 rounded-full">Online</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full w-full"></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">{isAr ? 'حصة الذكاء الاصطناعي (Gemini)' : 'Quota IA (Gemini)'}</span>
                <span className="text-xs text-amber-600 font-bold bg-amber-50 px-2 py-1 rounded-full">78%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-amber-400 h-2 rounded-full w-[78%]"></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">{isAr ? 'مساحة التخزين (PDFs)' : 'Stockage (PDFs)'}</span>
                <span className="text-xs text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded-full">42%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full w-[42%]"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
