'use client';

import { use, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Building2, Search, ChevronLeft, ChevronRight, Tag } from 'lucide-react';
import Link from 'next/link';

const CATEGORY_LABELS: Record<string, { ar: string; fr: string }> = {
  ministry: { ar: 'وزارة', fr: 'Ministère' },
  authority: { ar: 'سلطة', fr: 'Autorité' },
  agency: { ar: 'وكالة', fr: 'Agence' },
  parliament: { ar: 'برلمان', fr: 'Parlement' },
  court: { ar: 'محكمة', fr: 'Tribunal' },
  council: { ar: 'مجلس', fr: 'Conseil' },
  presidency: { ar: 'رئاسة', fr: 'Présidence' },
  other: { ar: 'أخرى', fr: 'Autre' },
};

function categoryLabel(cat: string | null, isAr: boolean): string {
  if (!cat) return isAr ? 'أخرى' : 'Autre';
  const entry = CATEGORY_LABELS[cat] ?? CATEGORY_LABELS['other'];
  return isAr ? entry.ar : entry.fr;
}

export default function InstitutionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const isAr = locale === 'ar';

  const [institutions, setInstitutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const supabase = createClient();

  useEffect(() => {
    async function fetchInstitutions() {
      setLoading(true);
      let req = supabase
        .from('institutions')
        .select('id, name_ar, name_fr, category, is_active')
        .order('name_ar', { ascending: true })
        .limit(120);

      if (query.trim()) {
        req = req.ilike('name_ar', `%${query.trim()}%`);
      }

      const { data } = await req;
      if (data) setInstitutions(data);
      setLoading(false);
    }
    fetchInstitutions();
  }, [query]);

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 sm:px-6" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 border-b border-gray-200 pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Building2 className="w-8 h-8 text-indigo-600" />
            {isAr ? 'المؤسسات' : 'Institutions'}
          </h1>
          <p className="mt-2 text-gray-500 max-w-2xl">
            {isAr
              ? 'قاعدة بيانات المؤسسات والهيئات الواردة في الجريدة الرسمية الموريتانية'
              : 'Base de données des institutions et organismes référencés dans le Journal Officiel mauritanien'}
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search
            className={`absolute top-1/2 -translate-y-1/2 ${isAr ? 'right-3' : 'left-3'} w-4 h-4 text-gray-400`}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isAr ? 'بحث باسم المؤسسة…' : 'Rechercher une institution…'}
            className={`w-full border border-gray-200 rounded-xl ${isAr ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition`}
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center p-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : institutions.length === 0 ? (
        <div className="text-center p-16 text-gray-500 border border-dashed rounded-2xl bg-gray-50">
          {isAr ? 'لا توجد مؤسسات حالياً.' : 'Aucune institution trouvée.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {institutions.map((inst) => {
            const name = isAr ? inst.name_ar : (inst.name_fr || inst.name_ar);
            const cat = categoryLabel(inst.category, isAr);
            return (
              <Link
                key={inst.id}
                href={`/${locale}/institutions/${inst.id}`}
                className="group flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all p-6 gap-4"
              >
                {/* Icon + Name */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 text-slate-300 group-hover:bg-indigo-50 group-hover:border-indigo-100 group-hover:text-indigo-300 transition-colors">
                    <Building2 size={26} strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 leading-snug line-clamp-2">{name}</p>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-50">
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                    <Tag className="w-3 h-3" />
                    {cat}
                  </span>
                  {inst.is_active !== false ? (
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                      {isAr ? 'نشطة' : 'Active'}
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-200">
                      {isAr ? 'غير نشطة' : 'Inactive'}
                    </span>
                  )}
                  <span className="text-indigo-500 group-hover:translate-x-1 transition-transform">
                    {isAr ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
