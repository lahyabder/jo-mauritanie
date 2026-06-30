'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { UploadCloud, BarChart3, DatabaseZap, Settings, LogOut, ShieldCheck, Users, Database, ClipboardCheck, Activity } from 'lucide-react';
import { useLocale } from 'next-intl';

export default function AdminSidebar() {
  const pathname = usePathname();
  const locale = useLocale();

  const isAr = locale === 'ar';
  
  const navItems = [
    { name: isAr ? 'لوحة التحكم' : 'Dashboard', href: `/${locale}/admin`, icon: BarChart3, exact: true },
    { name: isAr ? 'الإحصائيات' : 'Statistics', href: `/${locale}/admin/statistics`, icon: Activity, exact: false },
    { name: isAr ? 'مراجعة واعتماد الأعداد' : 'Staging Review', href: `/${locale}/admin/review`, icon: ClipboardCheck, exact: false },
    { name: isAr ? 'المستخدمين والصلاحيات' : 'Users & Roles', href: `/${locale}/admin/users`, icon: Users, exact: false },
    { name: isAr ? 'المزامنة والمهام' : 'Sync & AI Jobs', href: `/${locale}/admin/upload`, icon: UploadCloud, exact: false },
    { name: isAr ? 'سجلات النظام' : 'System Logs', href: `/${locale}/admin/sync-logs`, icon: DatabaseZap, exact: false },
    { name: isAr ? 'صيانة قاعدة البيانات' : 'Database Maintenance', href: `/${locale}/admin/maintenance`, icon: Database, exact: false },
    { name: isAr ? 'الإعدادات العامة' : 'Configuration', href: `/${locale}/admin/settings`, icon: Settings, exact: false },
  ];

  return (
    <div className="w-64 bg-gray-900 text-white min-h-screen flex flex-col fixed inset-y-0 start-0 z-50">
      <div className="p-6 flex items-center gap-3 border-b border-gray-800">
        <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-gray-700 shadow-lg">
          <Image src="/logo.png" alt="Admin Logo" fill className="object-cover" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-lg tracking-tight">الإدارة العليا</span>
          <span className="text-xs text-gray-400">الجريدة الرسمية</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-2">القائمة الرئيسية</div>
        {navItems.map((item) => {
          const isActive = item.exact 
            ? pathname === item.href 
            : pathname.startsWith(item.href);
          
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive 
                  ? 'bg-green-600 text-white shadow-md' 
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-white' : 'text-gray-400'} />
              {item.name}
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-gray-800">
        <Link
          href={`/${locale}`}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut size={18} />
          {isAr ? 'العودة للموقع' : 'Back to Website'}
        </Link>
      </div>
    </div>
  );
}
