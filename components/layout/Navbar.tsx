'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Search, Compass, BookOpen, GitMerge, LayoutDashboard, 
  Users, Building, Network, BarChart3, Scale, FileSignature, 
  BookMarked, Gavel, Send, Bell, Megaphone 
} from 'lucide-react';
import { useLocale } from 'next-intl';

export default function Navbar() {
  const pathname = usePathname();
  const locale = useLocale();

  const isAr = locale === 'ar';
  
  const navItems = [
    { name: isAr ? 'الرئيسية' : 'Home', href: `/${locale}`, icon: Compass },
    { name: isAr ? 'الأعداد' : 'Issues', href: `/${locale}/issues`, icon: BookOpen },
    { name: isAr ? 'القوانين' : 'Laws', href: `/${locale}/laws`, icon: Scale },
    { name: isAr ? 'المراسيم' : 'Decrees', href: `/${locale}/decrees`, icon: FileSignature },
    { name: isAr ? 'الأنظمة' : 'Regulations', href: `/${locale}/regulations`, icon: BookMarked },
    { name: isAr ? 'المقررات' : 'Decisions', href: `/${locale}/decisions`, icon: Gavel },
    { name: isAr ? 'التعميمات' : 'Circulars', href: `/${locale}/circulars`, icon: Send },
    { name: isAr ? 'البلاغات' : 'Notifications', href: `/${locale}/notifications`, icon: Bell },
    { name: isAr ? 'الإعلانات' : 'Announcements', href: `/${locale}/announcements`, icon: Megaphone },
    { name: isAr ? 'الشخصيات' : 'Persons', href: `/${locale}/persons`, icon: Users },
    { name: isAr ? 'المؤسسات' : 'Institutions', href: `/${locale}/institutions`, icon: Building },
    { name: isAr ? 'البحث' : 'Search', href: `/${locale}/search`, icon: Search },
    { name: isAr ? 'الإحصائيات' : 'Statistics', href: `/${locale}/statistics`, icon: BarChart3 },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full backdrop-blur-md bg-white/80 border-b border-gray-200 shadow-sm transition-all">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
        <div className="flex justify-between h-16 items-center">
          
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link href={`/${locale}`} className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold text-xl group-hover:bg-green-700 transition-colors">
                ج
              </div>
              <span className="font-bold text-xl text-gray-900 tracking-tight hidden lg:block">
                الجريدة الرسمية
              </span>
            </Link>
          </div>

          {/* Scrollable Nav Items */}
          <div className="flex-1 overflow-x-auto hide-scrollbar mx-4">
            <div className="flex items-center space-x-1 space-x-reverse min-w-max">
              {navItems.map((item) => {
                const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== `/${locale}`);
                const Icon = item.icon;
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                      isActive 
                        ? 'bg-green-50 text-green-700' 
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Icon size={16} />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Admin Button */}
          <div className="flex-shrink-0 flex items-center">
            <Link
              href={`/${locale}/admin`}
              className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors shadow-sm whitespace-nowrap"
            >
              <LayoutDashboard size={16} />
              <span className="hidden sm:inline">{isAr ? 'الإدارة' : 'Admin'}</span>
            </Link>
          </div>
          
        </div>
      </div>
    </nav>
  );
}
