'use client';

import { use, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { UserCircle2, Search, Briefcase, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function PersonsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const isAr = locale === 'ar';

  const [persons, setPersons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const supabase = createClient();

  useEffect(() => {
    async function fetchPersons() {
      setLoading(true);
      let req = supabase
        .from('persons')
        .select('id, full_name_ar, full_name_fr, current_position_ar, current_position_fr, gender, is_active')
        .order('full_name_ar', { ascending: true })
        .limit(100);

      if (query.trim()) {
        req = req.ilike('full_name_ar', `%${query.trim()}%`);
      }

      const { data } = await req;
      if (data) setPersons(data);
      setLoading(false);
    }
    fetchPersons();
  }, [query]);

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 sm:px-6" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 border-b border-gray-200 pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <UserCircle2 className="w-8 h-8 text-indigo-600" />
            {isAr ? 'الشخصيات' : 'Personnalités'}
          </h1>
          <p className="mt-2 text-gray-500 max-w-2xl">
            {isAr
              ? 'قاعدة بيانات الشخصيات المذكورة في الجريدة الرسمية الموريتانية'
              : 'Base de données des personnalités mentionnées dans le Journal Officiel mauritanien'}
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className={`absolute top-1/2 -translate-y-1/2 ${isAr ? 'right-3' : 'left-3'} w-4 h-4 text-gray-400`} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isAr ? 'بحث باسم الشخص…' : 'Rechercher une personnalité…'}
            className={`w-full border border-gray-200 rounded-xl ${isAr ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition`}
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center p-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : persons.length === 0 ? (
        <div className="text-center p-16 text-gray-500 border border-dashed rounded-2xl bg-gray-50">
          {isAr ? 'لا توجد شخصيات حالياً.' : 'Aucune personnalité trouvée.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {persons.map((person) => {
            const name = isAr ? person.full_name_ar : (person.full_name_fr || person.full_name_ar);
            const position = isAr
              ? (person.current_position_ar || '')
              : (person.current_position_fr || person.current_position_ar || '');
            return (
              <Link
                key={person.id}
                href={`/${locale}/persons/${person.id}`}
                className="group flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all p-6 gap-4"
              >
                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0 text-indigo-300 group-hover:bg-indigo-100 transition-colors">
                    <UserCircle2 size={32} strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 leading-snug truncate">{name}</p>
                    {position && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate flex items-center gap-1">
                        <Briefcase className="w-3 h-3 flex-shrink-0" />
                        {position}
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-50">
                  {person.is_active !== false ? (
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                      {isAr ? 'نشط' : 'Actif'}
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-200">
                      {isAr ? 'غير نشط' : 'Inactif'}
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
