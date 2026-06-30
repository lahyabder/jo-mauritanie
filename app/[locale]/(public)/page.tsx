'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { 
  Search, BookOpen, Clock, GitMerge, Zap, 
  Scale, FileSignature, BookMarked, Gavel, Send, Bell, Megaphone,
  Users, Building, BarChart3, ArrowLeft, ArrowRight, Brain
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
  }, []);

  const categories = [
    { titleAr: 'الأعداد', titleFr: 'Numéros', href: `/${locale}/issues`, icon: BookOpen, color: 'bg-brand-green text-white' },
    { titleAr: 'القوانين والأوامر', titleFr: 'Lois & Ordonnances', href: `/${locale}/laws`, icon: Scale, color: 'bg-brand-red text-white' },
    { titleAr: 'المراسيم', titleFr: 'Décrets', href: `/${locale}/decrees`, icon: FileSignature, color: 'bg-brand-yellow text-gray-900' },
    { titleAr: 'الأنظمة واللوائح', titleFr: 'Règlements', href: `/${locale}/regulations`, icon: BookMarked, color: 'bg-brand-green text-white' },
    { titleAr: 'المقررات', titleFr: 'Arrêtés', href: `/${locale}/decisions`, icon: Gavel, color: 'bg-brand-red text-white' },
    { titleAr: 'التعميمات', titleFr: 'Circulaires', href: `/${locale}/circulars`, icon: Send, color: 'bg-brand-yellow text-gray-900' },
    { titleAr: 'البلاغات', titleFr: 'Avis', href: `/${locale}/notifications`, icon: Bell, color: 'bg-brand-green text-white' },
    { titleAr: 'الإعلانات', titleFr: 'Annonces', href: `/${locale}/announcements`, icon: Megaphone, color: 'bg-brand-red text-white' },
    { titleAr: 'الشخصيات', titleFr: 'Personnalités', href: `/${locale}/persons`, icon: Users, color: 'bg-brand-yellow text-gray-900' },
    { titleAr: 'المؤسسات', titleFr: 'Institutions', href: `/${locale}/institutions`, icon: Building, color: 'bg-brand-green text-white' },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gray-900 text-white pt-24 pb-32">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-[30%] -right-[10%] w-[70%] h-[70%] rounded-full bg-brand-green/20 blur-3xl" />
          <div className="absolute top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-brand-yellow/10 blur-3xl" />
          <div className="absolute -bottom-[20%] left-[30%] w-[40%] h-[40%] rounded-full bg-brand-red/10 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          
          <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight mb-8 leading-tight drop-shadow-lg">
            {isAr ? 'الجريدة الرسمية الموريتانية' : 'Journal Officiel Mauritanien'}
          </h1>
          <p className="text-xl md:text-2xl text-gray-100 max-w-3xl mx-auto leading-relaxed mb-12 drop-shadow">
            {isAr 
              ? 'نسخة رقمية ذكية من الجريدة الرسمية. ابحث، تتبع، القوانين والمراسيم والتعيينات بشكل مفصل' 
              : 'Une édition numérique intelligente du Journal Officiel. Recherchez et suivez les lois, décrets et nominations en détail.'}
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link 
              href={`/${locale}/search`}
              className="flex items-center justify-center gap-2 bg-brand-green hover:bg-brand-green/90 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 w-full sm:w-auto"
            >
              <Search className="w-5 h-5" />
              {isAr ? 'ابدأ البحث الآن' : 'Commencer la recherche'}
            </Link>
            <Link 
              href={`/${locale}/issues`}
              className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/20 px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl w-full sm:w-auto"
            >
              <BookOpen className="w-5 h-5" />
              {isAr ? 'تصفح الأعداد' : 'Parcourir les numéros'}
            </Link>
          </div>
        </div>
      </section>

      {/* Gazette Categories Grid */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              {isAr ? 'أقسام الجريدة الرسمية' : 'Sections du Journal Officiel'}
            </h2>
            <p className="mt-4 text-xl text-gray-500 max-w-3xl mx-auto">
              {isAr 
              ? 'كل قسم يمثل تصنيفاً رسمياً من تصنيفات الجريدة الرسمية،' 
              : 'Chaque section représente une catégorie officielle du Journal Officiel.'}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {categories.map((cat, idx) => {
              const Icon = cat.icon;
              return (
                <Link key={idx} href={cat.href} className="group">
                  <div className={`${cat.color} p-5 rounded-2xl flex flex-col items-center text-center gap-3 h-full hover:scale-105 hover:shadow-xl transition-all duration-200 cursor-pointer`}>
                    <Icon size={32} className="opacity-90" />
                    <span className="font-bold text-sm leading-tight">
                      {isAr ? cat.titleAr : cat.titleFr}
                    </span>
                    <span className="text-xs opacity-70 group-hover:opacity-100">
                      {isAr ? 'عرض ←' : '→ View'}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-brand-green/5 border-t border-brand-green/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-12">{isAr ? 'أرقام من قاعدة البيانات' : 'Live Database Stats'}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <div className="text-4xl font-extrabold text-brand-green mb-2">{stats.issues}</div>
              <div className="text-sm text-gray-600 font-medium">{isAr ? 'عدد مؤرشف' : 'Archived Issues'}</div>
            </div>
            <div>
              <div className="text-4xl font-extrabold text-brand-red mb-2">{stats.decrees}</div>
              <div className="text-sm text-gray-600 font-medium">{isAr ? 'مرسوم' : 'Decrees'}</div>
            </div>
            <div>
              <div className="text-4xl font-extrabold text-brand-yellow mb-2">{stats.laws}</div>
              <div className="text-sm text-gray-600 font-medium">{isAr ? 'قانون' : 'Laws'}</div>
            </div>
            <div>
              <div className="text-4xl font-extrabold text-brand-green mb-2">{stats.appointments}</div>
              <div className="text-sm text-gray-600 font-medium">{isAr ? 'تعيين' : 'Appointments'}</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
