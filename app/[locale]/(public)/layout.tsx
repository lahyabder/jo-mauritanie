import Navbar from '@/components/layout/Navbar';
import Link from 'next/link';
import { use } from 'react';

export default function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  const isAr = locale === 'ar';
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 bg-gray-50">
        {children}
      </main>
      <footer className="py-6 bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center text-sm text-gray-500">
          <p>© 2026 {isAr ? 'الجريدة الرسمية الموريتانية' : 'Journal Officiel Mauritanien'}. {isAr ? 'جميع الحقوق محفوظة لـ' : 'Tous droits réservés à'} <a href="https://afrikyia.com" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 font-medium">afrikyia.com</a></p>
          <div className="flex gap-4 mt-4 sm:mt-0">
            <Link href={`/${locale}/privacy`} className="hover:text-gray-900 transition-colors">{isAr ? 'سياسة الخصوصية' : 'Confidentialité'}</Link>
            <Link href={`/${locale}/terms`} className="hover:text-gray-900 transition-colors">{isAr ? 'شروط الاستخدام' : 'Conditions'}</Link>
            <Link href={`/${locale}/contact`} className="hover:text-gray-900 transition-colors">{isAr ? 'اتصل بنا' : 'Contact'}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
