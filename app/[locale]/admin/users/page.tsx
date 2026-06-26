'use client';

import { use, useState, useEffect } from 'react';
import { Users, ShieldCheck, Mail, Calendar, RefreshCw, UserCheck, UserX, Crown } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function UsersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const isAr = locale === 'ar';
  const supabase = createClient();

  const [users, setUsers]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats]     = useState({ total: 0, admins: 0, editors: 0 });

  useEffect(() => {
    async function load() {
      // user_profiles is a view / table that stores public profile data
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) {
        setUsers(data);
        setStats({
          total:   data.length,
          admins:  data.filter((u: any) => u.role === 'admin').length,
          editors: data.filter((u: any) => u.role === 'editor').length,
        });
      }
      setLoading(false);
    }
    load();
  }, []);

  const roleColor: Record<string, string> = {
    admin:   'bg-red-100 text-red-700 border-red-200',
    editor:  'bg-blue-100 text-blue-700 border-blue-200',
    viewer:  'bg-gray-100 text-gray-700 border-gray-200',
  };

  const roleLabel: Record<string, string> = {
    admin:  isAr ? 'مدير' : 'Admin',
    editor: isAr ? 'محرر' : 'Editor',
    viewer: isAr ? 'قارئ' : 'Viewer',
  };

  return (
    <div className="w-full" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="text-indigo-600" size={28} />
            {isAr ? 'المستخدمين والصلاحيات' : 'Users & Roles'}
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            {isAr ? 'إدارة حسابات المستخدمين وصلاحياتهم في النظام' : 'Manage system accounts and their permissions'}
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); window.location.reload(); }}
          className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
        >
          <RefreshCw size={14} /> {isAr ? 'تحديث' : 'Refresh'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { icon: Users,     label: isAr ? 'إجمالي المستخدمين' : 'Total Users',    value: stats.total,   color: 'bg-indigo-50 text-indigo-600' },
          { icon: Crown,     label: isAr ? 'المديرون'           : 'Administrators', value: stats.admins,  color: 'bg-red-50 text-red-600' },
          { icon: UserCheck, label: isAr ? 'المحررون'           : 'Editors',        value: stats.editors, color: 'bg-blue-50 text-blue-600' },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${s.color}`}>
                <Icon size={22} />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{s.value}</div>
                <div className="text-sm text-gray-500">{s.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">{isAr ? 'قائمة المستخدمين' : 'User List'}</h2>
          <span className="text-xs text-gray-400">{isAr ? 'المصدر: Supabase Auth' : 'Source: Supabase Auth'}</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <UserX size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">{isAr ? 'لا توجد بيانات مستخدمين متاحة' : 'No user data available'}</p>
            <p className="text-xs mt-1">{isAr ? 'تأكد من وجود جدول user_profiles في قاعدة البيانات' : 'Ensure user_profiles table exists in the DB'}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-right font-semibold text-gray-500">{isAr ? 'المستخدم' : 'User'}</th>
                <th className="px-6 py-3 text-right font-semibold text-gray-500">{isAr ? 'الدور' : 'Role'}</th>
                <th className="px-6 py-3 text-right font-semibold text-gray-500">{isAr ? 'تاريخ الإنشاء' : 'Created'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                        {(user.email || user.full_name || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{user.full_name || user.email || user.id}</div>
                        {user.email && user.full_name && <div className="text-xs text-gray-400">{user.email}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${roleColor[user.role] ?? roleColor.viewer}`}>
                      <ShieldCheck size={11} />
                      {roleLabel[user.role] ?? user.role ?? '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-xs">
                    <div className="flex items-center gap-1">
                      <Calendar size={12} />
                      {user.created_at ? new Date(user.created_at).toLocaleDateString('ar-MA') : '—'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Info box */}
      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <strong>{isAr ? 'ملاحظة: ' : 'Note: '}</strong>
        {isAr
          ? 'لتعديل صلاحيات المستخدمين يدوياً، استخدم لوحة Supabase Dashboard → Authentication → Users.'
          : 'To manually edit user roles, use the Supabase Dashboard → Authentication → Users.'}
      </div>
    </div>
  );
}
