'use client';

import Link from 'next/link';
import { ChevronRight, ChevronLeft, Home } from 'lucide-react';
import { useLocale } from 'next-intl';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export default function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const locale = useLocale();
  const isAr = locale === 'ar';
  const Chevron = isAr ? ChevronLeft : ChevronRight;

  return (
    <nav className="flex mb-6" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 space-x-reverse md:space-x-3 md:space-x-reverse">
        <li className="inline-flex items-center">
          <Link href={`/${locale}`} className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-indigo-600">
            <Home className={`w-4 h-4 ${isAr ? 'ml-1' : 'mr-1'}`} />
            {isAr ? 'الرئيسية' : 'Home'}
          </Link>
        </li>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} aria-current={isLast ? 'page' : undefined}>
              <div className="flex items-center">
                <Chevron className="w-4 h-4 text-gray-400 mx-1" />
                {isLast || !item.href ? (
                  <span className="ml-1 text-sm font-medium text-gray-900 md:ml-2">
                    {item.label}
                  </span>
                ) : (
                  <Link href={item.href} className="ml-1 text-sm font-medium text-gray-500 hover:text-indigo-600 md:ml-2">
                    {item.label}
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
