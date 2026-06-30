import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { Metadata } from 'next';
import '../globals.css';

export const metadata: Metadata = {
  title: { 
    default: 'الجريدة الرسمية الموريتانية', 
    template: '%s | JOM' 
  },
  description: 'نسخة رقمية من الجريدة الرسمية الموريتانية - تصفح القوانين والمراسيم',
  openGraph: { 
    title: 'الجريدة الرسمية الموريتانية', 
    description: 'نسخة رقمية من الجريدة الرسمية الموريتانية - تصفح القوانين والمراسيم', 
    images: ['/og-image.png'] 
  },
  alternates: { 
    canonical: 'https://jomauritanie.net', 
    languages: { 'ar': '/ar', 'fr': '/fr' } 
  },
  robots: { index: true, follow: true },
};

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  
  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  // Determine text direction
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir}>
      <body className="min-h-screen bg-gray-50 text-gray-900 font-sans antialiased">
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
