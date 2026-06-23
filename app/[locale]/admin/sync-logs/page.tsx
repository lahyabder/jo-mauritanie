'use client';

import { useState, use } from 'react';
import { Activity, Bell, CheckCircle2, XCircle, AlertTriangle, Play, RefreshCw, Mail, Webhook, Rss } from 'lucide-react';
import Link from 'next/link';

// Mock logs data
const SYNC_LOGS = [
  { id: 0, date: new Date().toISOString().split('T')[0] + ' 10:15:00', status: 'success', issue: 'N° 1606', duration: '145s', confidence: '99%', alerts: 3 },
  { id: 1, date: '2024-12-01 06:00:00', status: 'success', issue: 'N° 1451', duration: '45s', confidence: '98%', alerts: 2 },
  { id: 2, date: '2024-11-15 06:00:00', status: 'warning', issue: 'N° 1450', duration: '62s', confidence: '85%', alerts: 5 },
  { id: 3, date: '2024-11-01 06:00:00', status: 'error', issue: 'N° 1449', duration: '12s', confidence: '0%', errorMsg: 'PDF Parsing Failed', alerts: 0 },
];

const RECENT_ALERTS = [
  { id: 0, type: 'CRAWLER', message: 'تم اكتشاف وتحميل ومعالجة العدد رقم 1606 الصادر بتاريخ 30/05/2026 بنجاح.', time: 'الآن', color: 'bg-indigo-100 text-indigo-700' },
  { id: 1, type: 'LAW', message: 'قانون جديد: تمت إضافة قانون مكافحة الفساد.', time: 'منذ ساعتين', color: 'bg-indigo-100 text-indigo-700' },
  { id: 2, type: 'APPOINTMENT', message: 'تعيينات: تم رصد 3 تعيينات جديدة في وزارة العدل.', time: 'منذ ساعتين', color: 'bg-emerald-100 text-emerald-700' },
  { id: 3, type: 'CONFLICT', message: 'تنبيه ذكاء اصطناعي: المادة 4 من المرسوم الجديد تتعارض مع قانون سابق.', time: 'منذ ساعتين', color: 'bg-amber-100 text-amber-700' },
];

export default function SyncLogsDashboard({ params }: { params: Promise<{ locale: string }> }) {
  const resolvedParams = use(params);
  const isAr = resolvedParams.locale === 'ar';
  const [isSyncing, setIsSyncing] = useState(false);

  const triggerManualSync = async () => {
    setIsSyncing(true);
    try {
      await fetch('/api/cron/monitor');
      // In real life, poll for updates or use WebSockets
      setTimeout(() => setIsSyncing(false), 2000);
    } catch (e) {
      setIsSyncing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Activity className={`w-8 h-8 text-indigo-600 ${isAr ? 'ml-3' : 'mr-3'}`} />
            {isAr ? 'لوحة المراقبة والإشعارات الذكية' : 'Intelligent Monitoring & Notifications'}
          </h1>
          <p className="mt-2 text-gray-500">
            {isAr ? 'مراقبة عمل الزاحف الآلي، جودة استخراج الذكاء الاصطناعي، وإدارة التنبيهات.' : 'Monitor the automated crawler, AI extraction quality, and manage alerts.'}
          </p>
        </div>
        
        <button 
          onClick={triggerManualSync}
          disabled={isSyncing}
          className="inline-flex items-center px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium transition-colors shadow-sm shadow-indigo-600/20 disabled:opacity-70"
        >
          {isSyncing ? <RefreshCw className="w-5 h-5 mr-2 ml-2 animate-spin" /> : <Play className="w-5 h-5 mr-2 ml-2" />}
          {isAr ? (isSyncing ? 'جاري المزامنة...' : 'تشغيل المزامنة يدوياً') : (isSyncing ? 'Syncing...' : 'Trigger Manual Sync')}
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
           <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-medium text-gray-500">{isAr ? 'حالة الزاحف (الآن)' : 'Crawler Status'}</p>
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
           </div>
           <p className="text-2xl font-bold text-gray-900">{isAr ? 'نشط ويعمل' : 'Active & Running'}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
           <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-medium text-gray-500">{isAr ? 'متوسط دقة الاستخراج (NER)' : 'Avg NER Confidence'}</p>
           </div>
           <p className="text-2xl font-bold text-gray-900">96.4%</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm md:col-span-2">
           <p className="text-sm font-medium text-gray-500 mb-3">{isAr ? 'قنوات التنبيه النشطة' : 'Active Alert Channels'}</p>
           <div className="flex gap-4">
              <div className="flex items-center text-sm font-medium text-gray-700 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                <Mail className="w-4 h-4 mr-2 ml-2 text-indigo-500" /> Resend Email
              </div>
              <div className="flex items-center text-sm font-medium text-gray-700 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                <Rss className="w-4 h-4 mr-2 ml-2 text-orange-500" /> RSS Feed
              </div>
              <div className="flex items-center text-sm font-medium text-gray-700 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                <Webhook className="w-4 h-4 mr-2 ml-2 text-emerald-500" /> Webhooks (2)
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sync Logs Table */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-bold text-gray-900 mb-4">{isAr ? 'سجل المزامنات الأخيرة' : 'Recent Sync Logs'}</h2>
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isAr ? 'text-right' : 'text-left'}`}>{isAr ? 'التاريخ' : 'Date'}</th>
                  <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isAr ? 'text-right' : 'text-left'}`}>{isAr ? 'العدد' : 'Issue'}</th>
                  <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isAr ? 'text-right' : 'text-left'}`}>{isAr ? 'الحالة' : 'Status'}</th>
                  <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isAr ? 'text-right' : 'text-left'}`}>{isAr ? 'دقة الـ AI' : 'AI Confidence'}</th>
                  <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isAr ? 'text-right' : 'text-left'}`}>{isAr ? 'التنبيهات' : 'Alerts'}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {SYNC_LOGS.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{log.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.issue}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {log.status === 'success' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800"><CheckCircle2 className="w-3 h-3 mr-1 ml-1" /> {isAr ? 'نجاح' : 'Success'}</span>}
                      {log.status === 'warning' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800"><AlertTriangle className="w-3 h-3 mr-1 ml-1" /> {isAr ? 'تحذير' : 'Warning'}</span>}
                      {log.status === 'error' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1 ml-1" /> {isAr ? 'خطأ' : 'Error'}</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.confidence}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{log.alerts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Alerts Feed */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <Bell className="w-5 h-5 mr-2 ml-2 text-indigo-600" />
              {isAr ? 'أحدث التنبيهات الذكية' : 'Latest AI Alerts'}
            </h2>
            <Link href="/api/rss" target="_blank" className="text-xs font-semibold text-orange-600 hover:text-orange-700 bg-orange-50 px-2 py-1 rounded-md">RSS Feed</Link>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 space-y-4">
             {RECENT_ALERTS.map(alert => (
               <div key={alert.id} className="pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                  <div className="flex justify-between items-start mb-1">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${alert.color}`}>{alert.type}</span>
                    <span className="text-xs text-gray-400">{alert.time}</span>
                  </div>
                  <p className="text-sm text-gray-800 mt-2 font-medium">{alert.message}</p>
               </div>
             ))}
             <button className="w-full mt-4 py-2 bg-gray-50 hover:bg-gray-100 text-sm font-semibold text-indigo-600 rounded-xl transition-colors border border-gray-200">
               {isAr ? 'عرض كل التنبيهات' : 'View all alerts'}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
