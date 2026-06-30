'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { 
  Search, BookOpen, Scale, FileSignature, BookMarked, Gavel, Send, Bell, Megaphone,
  Users, Building, ArrowLeft, ArrowRight, LibraryBig, Sparkles
} from 'lucide-react';

export default function LandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const resolvedParams = use(params);
  const { locale } = resolvedParams;
  const isAr = locale === 'ar';

  const [stats, setStats] = useState({ decrees: 0, laws: 0, appointments: 0, issues: 0 });
  const supabase = createClient();

  useEffect(() => {
    async function fetchStats() {
      const [res1, res2, res3, res4] = await Promise.all([
        supabase.from('documents').select('id', { count: 'exact', head: true }).eq('type', 'decree').eq('original_language', locale),
        supabase.from('documents').select('id', { count: 'exact', head: true }).eq('type', 'law').eq('original_language', locale),
        supabase.from('documents').select('id', { count: 'exact', head: true }).eq('type', 'appointment').eq('original_language', locale),
        supabase.from('issues').select('id', { count: 'exact', head: true }).eq('language', locale),
      ]);
      setStats({
        decrees: res1.count || 0,
        laws: res2.count || 0,
        appointments: res3.count || 0,
        issues: res4.count || 0,
      });
    }
    fetchStats();
  }, [locale, supabase]);

  const categories = [
    { titleAr: 'الأعداد', titleFr: 'Numéros', href: `/${locale}/issues`, icon: BookOpen, gradient: 'from-emerald-400 to-teal-500', bg: 'bg-emerald-50 text-emerald-600' },
    { titleAr: 'القوانين والأوامر', titleFr: 'Lois & Ordonnances', href: `/${locale}/laws`, icon: Scale, gradient: 'from-blue-500 to-indigo-500', bg: 'bg-blue-50 text-blue-600' },
    { titleAr: 'المراسيم', titleFr: 'Décrets', href: `/${locale}/decrees`, icon: FileSignature, gradient: 'from-amber-400 to-orange-500', bg: 'bg-amber-50 text-amber-600' },
    { titleAr: 'الأنظمة واللوائح', titleFr: 'Règlements', href: `/${locale}/regulations`, icon: BookMarked, gradient: 'from-cyan-400 to-blue-500', bg: 'bg-cyan-50 text-cyan-600' },
    { titleAr: 'المقررات', titleFr: 'Arrêtés', href: `/${locale}/decisions`, icon: Gavel, gradient: 'from-rose-400 to-red-500', bg: 'bg-rose-50 text-rose-600' },
    { titleAr: 'التعميمات', titleFr: 'Circulaires', href: `/${locale}/circulars`, icon: Send, gradient: 'from-purple-400 to-pink-500', bg: 'bg-purple-50 text-purple-600' },
    { titleAr: 'البلاغات', titleFr: 'Avis', href: `/${locale}/notifications`, icon: Bell, gradient: 'from-fuchsia-400 to-purple-500', bg: 'bg-fuchsia-50 text-fuchsia-600' },
    { titleAr: 'الإعلانات', titleFr: 'Annonces', href: `/${locale}/announcements`, icon: Megaphone, gradient: 'from-red-400 to-rose-500', bg: 'bg-red-50 text-red-600' },
    { titleAr: 'الشخصيات', titleFr: 'Personnalités', href: `/${locale}/persons`, icon: Users, gradient: 'from-violet-400 to-indigo-500', bg: 'bg-violet-50 text-violet-600' },
    { titleAr: 'المؤسسات', titleFr: 'Institutions', href: `/${locale}/institutions`, icon: Building, gradient: 'from-sky-400 to-blue-500', bg: 'bg-sky-50 text-sky-600' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#fafafa]" dir={isAr ? 'rtl' : 'ltr'}>
      
      {/* Hero Section (Ultra Premium) */}
      <section className="relative overflow-hidden bg-white border-b border-gray-100">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-blue-100/40 blur-3xl" />
          <div className="absolute top-[20%] -left-[10%] w-[40%] h-[40%] rounded-full bg-emerald-100/40 blur-3xl" />
          <div className="absolute -bottom-[20%] left-[20%] w-[50%] h-[50%] rounded-full bg-rose-100/30 blur-3xl" />
          {/* Subtle Grid Pattern */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-28 pb-32">
          
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-50 border border-gray-200 shadow-sm mb-8">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-extrabold text-gray-700 tracking-wider">{isAr ? 'أكبر مكتبة قانونية رقمية في موريتانيا' : 'La plus grande bibliothèque juridique numérique'}</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-gray-900 tracking-tight mb-8 leading-[1.1]">
            {isAr ? 'الجريدة الرسمية ' : 'Journal Officiel '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500">
              {isAr ? 'الموريتانية' : 'Mauritanien'}
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-500 max-w-3xl mx-auto leading-relaxed mb-12 font-medium">
            {isAr 
              ? 'نسخة رقمية فائقة الذكاء. ابحث، واستكشف القوانين، المراسيم، والتعيينات بتجربة استخدام لم يسبق لها مثيل.' 
              : 'Une édition numérique ultra-intelligente. Recherchez et explorez les lois, décrets et nominations.'}
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link 
              href={`/${locale}/search`}
              className="group flex items-center justify-center gap-3 bg-gray-900 hover:bg-black text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-lg hover:shadow-[0_10px_40px_rgba(0,0,0,0.15)] hover:-translate-y-1 w-full sm:w-auto"
            >
              <Search className="w-5 h-5 group-hover:scale-110 transition-transform" />
              {isAr ? 'البحث الذكي في الأرشيف' : 'Recherche Intelligente'}
            </Link>
            <Link 
              href={`/${locale}/issues`}
              className="group flex items-center justify-center gap-3 bg-white text-gray-900 border border-gray-200 px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-sm hover:shadow-md hover:border-gray-300 w-full sm:w-auto"
            >
              <LibraryBig className="w-5 h-5 text-gray-400 group-hover:text-emerald-500 transition-colors" />
              {isAr ? 'تصفح أعداد الجريدة' : 'Parcourir les numéros'}
            </Link>
          </div>
        </div>
      </section>

      {/* Live Stats Section (Glassmorphism overlap) */}
      <section className="relative z-20 -mt-12 max-w-6xl mx-auto px-4 sm:px-6 w-full">
        <div className="bg-white/80 backdrop-blur-2xl rounded-3xl p-8 border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-gray-100/0 md:divide-gray-100" dir={isAr ? 'rtl' : 'ltr'}>
            <div className="flex flex-col items-center justify-center text-center">
              <div className="text-4xl font-black text-emerald-600 mb-1">{stats.issues}</div>
              <div className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest">{isAr ? 'عدد مؤرشف' : 'Numéros'}</div>
            </div>
            <div className="flex flex-col items-center justify-center text-center border-l-0 md:border-l border-gray-100">
              <div className="text-4xl font-black text-blue-600 mb-1">{stats.laws}</div>
              <div className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest">{isAr ? 'قانون' : 'Lois'}</div>
            </div>
            <div className="flex flex-col items-center justify-center text-center border-t md:border-t-0 md:border-l border-gray-100 pt-8 md:pt-0">
              <div className="text-4xl font-black text-amber-500 mb-1">{stats.decrees}</div>
              <div className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest">{isAr ? 'مرسوم' : 'Décrets'}</div>
            </div>
            <div className="flex flex-col items-center justify-center text-center border-t md:border-t-0 md:border-l border-gray-100 pt-8 md:pt-0">
              <div className="text-4xl font-black text-violet-600 mb-1">{stats.appointments}</div>
              <div className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest">{isAr ? 'تعيين وشخصية' : 'Nominations'}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Gazette Categories Grid (High Density Layout) */}
      <section className="py-24 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col items-center text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4 tracking-tight">
              {isAr ? 'أقسام الجريدة الرسمية' : 'Sections du Journal Officiel'}
            </h2>
            <div className="w-16 h-1.5 bg-gray-900 rounded-full mb-6"></div>
            <p className="text-lg text-gray-500 max-w-2xl">
              {isAr 
              ? 'تصفح الوثائق مقسمة حسب تصنيفاتها الرسمية عبر واجهة سريعة ومبسطة.' 
              : 'Parcourez les documents divisés par leurs catégories officielles avec une interface rapide et simplifiée.'}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {categories.map((cat, idx) => {
              const Icon = cat.icon;
              return (
                <Link key={idx} href={cat.href} className="group relative block h-full">
                  <div className="relative z-10 h-full bg-white/80 backdrop-blur-xl p-6 rounded-3xl border border-white shadow-[0_2px_10px_rgb(0,0,0,0.03)] hover:shadow-[0_15px_35px_rgb(0,0,0,0.06)] hover:bg-white hover:border-gray-100 transform hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center gap-4">
                    
                    {/* Hover Gradient Glow behind Icon */}
                    <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-gradient-to-br ${cat.gradient} rounded-full blur-2xl opacity-0 group-hover:opacity-15 transition-opacity duration-500`}></div>

                    <div className={`relative flex items-center justify-center w-14 h-14 rounded-2xl ${cat.bg} group-hover:scale-110 transition-transform duration-300 shadow-inner`}>
                      <Icon size={24} strokeWidth={2} />
                    </div>
                    
                    <div className="flex flex-col gap-1 mt-2">
                      <span className="font-bold text-gray-800 leading-snug group-hover:text-gray-900 transition-colors text-[15px]">
                        {isAr ? cat.titleAr : cat.titleFr}
                      </span>
                    </div>

                    <div className="mt-auto pt-4 flex items-center justify-center text-[10px] font-black text-gray-300 group-hover:text-gray-900 uppercase tracking-widest transition-colors w-full border-t border-gray-50">
                      {isAr ? 'تصفح القسم' : 'Parcourir'}
                      <span className={`transform transition-transform opacity-0 group-hover:opacity-100 group-hover:${isAr ? '-translate-x-2' : 'translate-x-2'} ml-1 mr-1`}>
                        {isAr ? <ArrowLeft className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

    </div>
  );
}
