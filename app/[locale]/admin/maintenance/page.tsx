'use client';

import { use, useState, useEffect } from 'react';
import {
  Database, Trash2, RefreshCw, CheckCircle, AlertTriangle,
  BarChart2, FileText, Clock, HardDrive, Zap
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function MaintenancePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const isAr = locale === 'ar';
  const supabase = createClient();

  const [stats, setStats]     = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [log, setLog]         = useState<{ type: 'success' | 'error' | 'info'; msg: string }[]>([]);

  const addLog = (type: 'success' | 'error' | 'info', msg: string) =>
    setLog((prev) => [{ type, msg }, ...prev].slice(0, 20));

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setLoading(true);
    const [docsRes, issuesRes, logsRes, personsRes] = await Promise.all([
      supabase.from('documents').select('id', { count: 'exact', head: true }),
      supabase.from('issues').select('id', { count: 'exact', head: true }),
      supabase.from('sync_logs').select('id', { count: 'exact', head: true }),
      supabase.from('persons').select('id', { count: 'exact', head: true }),
    ]);
    setStats({
      documents: docsRes.count ?? 0,
      issues:    issuesRes.count ?? 0,
      logs:      logsRes.count ?? 0,
      persons:   personsRes.count ?? 0,
    });
    setLoading(false);
  }

  async function purgeOldLogs() {
    setRunning('logs');
    try {
      // Delete sync_logs older than 30 days
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      const { error, count } = await supabase
        .from('sync_logs')
        .delete()
        .lt('created_at', cutoff.toISOString());
      if (error) throw error;
      addLog('success', isAr ? `تم حذف ${count ?? 0} سجل قديم` : `Deleted ${count ?? 0} old log entries`);
      loadStats();
    } catch (e: any) {
      addLog('error', e.message);
    } finally {
      setRunning(null);
    }
  }

  async function repairDocumentVisibility() {
    setRunning('repair');
    try {
      const res = await fetch('/api/admin/publish-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publish_all: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      addLog('success', isAr
        ? `تم إصلاح الرؤية: ${data.updated_issues} عدد، ${data.updated_documents} وثيقة`
        : `Visibility repaired: ${data.updated_issues} issue(s), ${data.updated_documents} doc(s)`);
      loadStats();
    } catch (e: any) {
      addLog('error', e.message);
    } finally {
      setRunning(null);
    }
  }

  const statCards = stats
    ? [
        { icon: FileText,  label: isAr ? 'الوثائق'         : 'Documents',   value: stats.documents, color: 'bg-blue-50 text-blue-600' },
        { icon: Database,  label: isAr ? 'الأعداد'          : 'Issues',      value: stats.issues,    color: 'bg-indigo-50 text-indigo-600' },
        { icon: BarChart2, label: isAr ? 'الأشخاص'          : 'Persons',     value: stats.persons,   color: 'bg-green-50 text-green-600' },
        { icon: Clock,     label: isAr ? 'سجلات المزامنة'  : 'Sync Logs',   value: stats.logs,      color: 'bg-amber-50 text-amber-600' },
      ]
    : [];

  const actions = [
    {
      id: 'repair',
      icon: Zap,
      title: isAr ? 'إصلاح رؤية البيانات' : 'Repair Data Visibility',
      desc:  isAr ? 'تحديث status الوثائق والأعداد لتمر عبر RLS وتظهر للعموم' : 'Update document/issue status to pass RLS and appear publicly',
      color: 'bg-indigo-600 hover:bg-indigo-700',
      fn:    repairDocumentVisibility,
    },
    {
      id: 'logs',
      icon: Trash2,
      title: isAr ? 'حذف سجلات قديمة (30+ يوم)' : 'Purge Old Logs (30+ days)',
      desc:  isAr ? 'حذف سجلات المزامنة الأقدم من 30 يوماً لتوفير المساحة' : 'Remove sync logs older than 30 days to save space',
      color: 'bg-rose-600 hover:bg-rose-700',
      fn:    purgeOldLogs,
    },
  ];

  return (
    <div className="w-full" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Database className="text-indigo-600" size={28} />
            {isAr ? 'صيانة قاعدة البيانات' : 'Database Maintenance'}
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            {isAr ? 'إدارة وصيانة البيانات، وإصلاح مشكلات الرؤية' : 'Manage DB health, repair visibility issues, purge old data'}
          </p>
        </div>
        <button
          onClick={loadStats}
          className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
        >
          <RefreshCw size={14} /> {isAr ? 'تحديث' : 'Refresh'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {loading ? (
          <div className="col-span-4 py-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : statCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.color}`}>
                <Icon size={20} />
              </div>
              <div>
                <div className="text-xl font-bold text-gray-900">{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <div key={action.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white ${action.color.split(' ')[0]}`}>
                  <Icon size={20} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 mb-1">{action.title}</h3>
                  <p className="text-sm text-gray-500 mb-4">{action.desc}</p>
                  <button
                    onClick={action.fn}
                    disabled={running !== null}
                    className={`flex items-center gap-2 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${action.color}`}
                  >
                    {running === action.id
                      ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> {isAr ? 'جاري التنفيذ...' : 'Running...'}</>
                      : <><Icon size={14} /> {isAr ? 'تنفيذ' : 'Run'}</>}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Activity Log */}
      {log.length > 0 && (
        <div className="bg-gray-900 rounded-xl p-5 font-mono text-xs">
          <div className="text-gray-400 mb-3 font-sans font-semibold text-sm">{isAr ? 'سجل العمليات' : 'Operation Log'}</div>
          <div className="space-y-1.5">
            {log.map((entry, i) => (
              <div key={i} className={`flex items-start gap-2 ${
                entry.type === 'success' ? 'text-emerald-400' :
                entry.type === 'error'   ? 'text-rose-400'    : 'text-gray-300'
              }`}>
                {entry.type === 'success' ? <CheckCircle size={13} className="mt-0.5 flex-shrink-0" /> :
                 entry.type === 'error'   ? <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" /> :
                 <span className="text-gray-500">›</span>}
                {entry.msg}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
