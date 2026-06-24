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
        supabase.from('documents').select('id', { count: 'exact', head: true }).eq('type', 'decree'),
        supabase.from('documents').select('id', { count: 'exact', head: true }).eq('type', 'law'),
        supabase.from('documents').select('id', { count: 'exact', head: true }).eq('type', 'appointment'),
        supabase.from('issues').select('id', { count: 'exact', head: true }),
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
    { titleAr: 'الأعداد', titleFr: 'Numéros', href: `/${locale}/issues`, icon: BookOpen, color: 'bg-gray-900 text-white' },
    { titleAr: 'القوانين والأوامر', titleFr: 'Lois & Ordonnances', href: `/${locale}/laws`, icon: Scale, color: 'bg-blue-600 text-white' },
    { titleAr: 'المراسيم', titleFr: 'Décrets', href: `/${locale}/decrees`, icon: FileSignature, color: 'bg-indigo-600 text-white' },
    { titleAr: 'الأنظمة واللوائح', titleFr: 'Règlements', href: `/${locale}/regulations`, icon: BookMarked, color: 'bg-violet-600 text-white' },
    { titleAr: 'المقررات', titleFr: 'Arrêtés', href: `/${locale}/decisions`, icon: Gavel, color: 'bg-purple-600 text-white' },
    { titleAr: 'التعميمات', titleFr: 'Circulaires', href: `/${locale}/circulars`, icon: Send, color: 'bg-emerald-600 text-white' },
    { titleAr: 'البلاغات', titleFr: 'Avis', href: `/${locale}/notifications`, icon: Bell, color: 'bg-teal-600 text-white' },
    { titleAr: 'الإعلانات', titleFr: 'Annonces', href: `/${locale}/announcements`, icon: Megaphone, color: 'bg-cyan-600 text-white' },
    { titleAr: 'الشخصيات', titleFr: 'Personnalités', href: `/${locale}/persons`, icon: Users, color: 'bg-amber-600 text-white' },
    { titleAr: 'المؤسسات', titleFr: 'Institutions', href: `/${locale}/institutions`, icon: Building, color: 'bg-orange-600 text-white' },
    { titleAr: 'التسلسل الزمني', titleFr: 'Chronologie', href: `/${locale}/timeline`, icon: Clock, color: 'bg-rose-600 text-white' },
    { titleAr: 'العلاقات القانونية', titleFr: 'Relations Juridiques', href: `/${locale}/relations`, icon: GitMerge, color: 'bg-red-600 text-white' },
    { titleAr: 'الإحصائيات', titleFr: 'Statistiques', href: `/${locale}/statistics`, icon: BarChart3, color: 'bg-slate-700 text-white' },
    { titleAr: 'طبقة المعرفة', titleFr: 'Knowledge Layer', href: `/${locale}/knowledge`, icon: Brain, color: 'bg-gradient-to-br from-indigo-600 to-violet-700 text-white' },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gray-900 text-white pt-24 pb-32">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-[30%] -right-[10%] w-[70%] h-[70%] rounded-full bg-green-500/10 blur-3xl" />
          <div className="absolute top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-green-400 text-sm font-medium mb-8 border border-white/10 backdrop-blur-sm">
            <Zap size={16} />
            {isAr ? 'منصة الجريدة الرسمية الذكية' : 'Smart Official Gazette Platform'}
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
            {isAr ? 'الجريدة الرسمية الموريتانية' : 'Mauritanian Official Gazette'}
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-l from-green-400 to-blue-500">
              {isAr ? 'في عصر الذكاء الاصطناعي' : 'in the Age of AI'}
            </span>
          </h1>
          
          <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-300 mb-12 leading-relaxed">
            {isAr 
              ? 'أول نسخة رقمية ذكية من الجريدة الرسمية. ابحث، تتبع، وحلل القوانين والمراسيم والتعيينات بشكل فوري وموثق.'
              : 'The first smart digital edition of the Official Gazette. Search, track and analyze laws, decrees and appointments instantly.'}
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link 
              href={`/${locale}/search`}
              className="px-8 py-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-green-500/25 flex items-center justify-center gap-2"
            >
              <Search size={20} />
              {isAr ? 'ابدأ البحث الآن' : 'Start Searching Now'}
            </Link>
            <Link 
              href={`/${locale}/issues`}
              className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-xl font-bold text-lg transition-all backdrop-blur-md flex items-center justify-center gap-2"
            >
              <BookOpen size={20} />
              {isAr ? 'تصفح الأعداد' : 'Browse Issues'}
            </Link>
          </div>
        </div>
      </section>

      {/* Gazette Categories Grid */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              {isAr ? 'أقسام الجريدة الرسمية' : 'Official Gazette Sections'}
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              {isAr 
                ? 'كل قسم يمثل تصنيفاً رسمياً من تصنيفات الجريدة الرسمية، مع بحث وإحصائيات وتسلسل زمني خاص به.'
                : 'Each section represents an official classification of the gazette, with its own search, statistics and timeline.'}
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
      <section className="py-20 bg-green-50 border-t border-green-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-12">{isAr ? 'أرقام من قاعدة البيانات' : 'Live Database Stats'}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <div className="text-4xl font-extrabold text-green-600 mb-2">{stats.issues}</div>
              <div className="text-sm text-gray-600 font-medium">{isAr ? 'عدد مؤرشف' : 'Archived Issues'}</div>
            </div>
            <div>
              <div className="text-4xl font-extrabold text-green-600 mb-2">{stats.decrees}</div>
              <div className="text-sm text-gray-600 font-medium">{isAr ? 'مرسوم' : 'Decrees'}</div>
            </div>
            <div>
              <div className="text-4xl font-extrabold text-green-600 mb-2">{stats.laws}</div>
              <div className="text-sm text-gray-600 font-medium">{isAr ? 'قانون' : 'Laws'}</div>
            </div>
            <div>
              <div className="text-4xl font-extrabold text-green-600 mb-2">{stats.appointments}</div>
              <div className="text-sm text-gray-600 font-medium">{isAr ? 'تعيين' : 'Appointments'}</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
