'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { 
  Search, Compass, BookOpen, GitMerge, LayoutDashboard, 
  Users, Building, Network, BarChart3, Scale, FileSignature, 
  BookMarked, Gavel, Send, Bell, Megaphone, Globe
} from 'lucide-react';
import { useLocale } from 'next-intl';

export default function Navbar() {
  const pathname = usePathname();
  const locale = useLocale();

  const isAr = locale === 'ar';
  const nextLocale = isAr ? 'fr' : 'ar';
  
  // Replace the current locale in the path with the new locale
  // Handle edge case where pathname is exactly /locale
  const switchUrl = pathname === `/${locale}` || pathname === `/${locale}/` 
    ? `/${nextLocale}` 
    : pathname.replace(`/${locale}/`, `/${nextLocale}/`);
  
  const navItems = [
    { name: isAr ? 'الرئيسية' : 'Accueil', href: `/${locale}`, icon: Compass },
    { name: isAr ? 'الأعداد' : 'Numéros', href: `/${locale}/issues`, icon: BookOpen },
    { name: isAr ? 'القوانين' : 'Lois', href: `/${locale}/laws`, icon: Scale },
    { name: isAr ? 'المراسيم' : 'Décrets', href: `/${locale}/decrees`, icon: FileSignature },
    { name: isAr ? 'الأنظمة' : 'Règlements', href: `/${locale}/regulations`, icon: BookMarked },
    { name: isAr ? 'المقررات' : 'Arrêtés', href: `/${locale}/decisions`, icon: Gavel },
    { name: isAr ? 'التعميمات' : 'Circulaires', href: `/${locale}/circulars`, icon: Send },
    { name: isAr ? 'البلاغات' : 'Communiqués', href: `/${locale}/notifications`, icon: Bell },
    { name: isAr ? 'الإعلانات' : 'Annonces', href: `/${locale}/announcements`, icon: Megaphone },
    { name: isAr ? 'الشخصيات' : 'Personnalités', href: `/${locale}/persons`, icon: Users },
    { name: isAr ? 'المؤسسات' : 'Institutions', href: `/${locale}/institutions`, icon: Building },
    { name: isAr ? 'البحث' : 'Recherche', href: `/${locale}/search`, icon: Search },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full backdrop-blur-md bg-white/80 border-b border-gray-200 shadow-sm transition-all">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
        <div className="flex justify-between h-16 items-center">
          
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link href={`/${locale}`} className="flex items-center gap-2 group">
              <div className="relative w-10 h-10 overflow-hidden rounded-full border-2 border-brand-green group-hover:border-brand-green/80 transition-colors shadow-sm">
                <Image src="/logo.png" alt="Logo" fill className="object-cover" />
              </div>
              <span className="font-bold text-xl text-gray-900 tracking-tight hidden lg:block">
                {isAr ? 'الجريدة الرسمية' : 'Journal officiel'}
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
                        ? 'bg-brand-green/10 text-brand-green' 
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex-shrink-0 flex items-center gap-3">
            {/* Language Switcher */}
            <Link
              href={switchUrl}
              className="flex items-center justify-center w-10 h-10 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              title={isAr ? 'Passer en Français' : 'التبديل للعربية'}
            >
              <Globe size={18} />
              <span className="sr-only">{isAr ? 'FR' : 'AR'}</span>
            </Link>


          </div>
          
        </div>
      </div>
    </nav>
  );
}
