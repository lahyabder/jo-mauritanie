import {
  Building2, Users, FileText, Clock, Network,
  ChevronLeft, ChevronRight, CalendarDays, Tag,
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';

const CATEGORY_LABELS: Record<string, { ar: string; fr: string; color: string }> = {
  ministry:   { ar: 'وزارة', fr: 'Ministère',    color: 'bg-blue-50 text-blue-700 border-blue-200' },
  authority:  { ar: 'سلطة', fr: 'Autorité',       color: 'bg-purple-50 text-purple-700 border-purple-200' },
  agency:     { ar: 'وكالة', fr: 'Agence',         color: 'bg-teal-50 text-teal-700 border-teal-200' },
  parliament: { ar: 'برلمان', fr: 'Parlement',     color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  court:      { ar: 'محكمة', fr: 'Tribunal',       color: 'bg-rose-50 text-rose-700 border-rose-200' },
  council:    { ar: 'مجلس', fr: 'Conseil',         color: 'bg-amber-50 text-amber-700 border-amber-200' },
  presidency: { ar: 'رئاسة', fr: 'Présidence',     color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  other:      { ar: 'أخرى', fr: 'Autre',           color: 'bg-gray-100 text-gray-600 border-gray-200' },
};

const APPT_DOT: Record<string, string> = {
  nomination:  'bg-indigo-600',
  appointment: 'bg-indigo-600',
  dismissal:   'bg-red-500',
  transfer:    'bg-amber-500',
  promotion:   'bg-emerald-500',
};

export default async function InstitutionProfilePage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { locale, id } = await params;
  const isAr = locale === 'ar';
  const supabase = await createClient();

  // Fetch institution
  const { data: inst, error } = await supabase
    .from('institutions')
    .select(
      `id, name_ar, name_fr, description_ar, description_fr, category, is_active,
       parent:parent_id ( id, name_ar, name_fr ),
       children:institutions!parent_id ( id, name_ar, name_fr, category, is_active )`
    )
    .eq('id', id)
    .maybeSingle();

  if (error || !inst) notFound();

  // Count documents that mention this institution
  const { count: docCount } = await supabase
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('institution_id', id);

  // Current officials (is_current = true in appointment_history)
  const { data: officials } = await supabase
    .from('appointment_history')
    .select(
      `id, position_title_ar, position_title_fr, appointment_date, is_current,
       persons:person_id ( id, full_name_ar, full_name_fr )`
    )
    .eq('institution_id', id)
    .eq('is_current', true)
    .order('appointment_date', { ascending: false })
    .limit(10);

  // Full history timeline
  const { data: timeline } = await supabase
    .from('appointment_history')
    .select(
      `id, position_title_ar, position_title_fr, appointment_type, appointment_date, is_current,
       persons:person_id ( id, full_name_ar, full_name_fr ),
       instrument_document:instrument_document_id ( id, title_ar, official_number )`
    )
    .eq('institution_id', id)
    .order('appointment_date', { ascending: false })
    .limit(30);

  const name = isAr ? inst.name_ar : (inst.name_fr || inst.name_ar);
  const description = isAr ? inst.description_ar : (inst.description_fr || inst.description_ar);
  const catInfo = CATEGORY_LABELS[inst.category] ?? CATEGORY_LABELS['other'];
  const parent = inst.parent as any;
  const children = (inst.children as any[]) ?? [];

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Back */}
      <div className="mb-8">
        <Link
          href={`/${locale}/institutions`}
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          {isAr ? (
            <ChevronRight className="ml-1 w-4 h-4" />
          ) : (
            <ChevronLeft className="mr-1 w-4 h-4" />
          )}
          {isAr ? 'العودة إلى القائمة' : 'Retour à la liste'}
        </Link>
      </div>

      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-10">
        <div className="h-32 relative bg-gradient-to-r from-slate-100 to-slate-200 border-b border-gray-100 flex items-center justify-end px-12">
          <Building2 className="w-24 h-24 text-slate-300 opacity-60" />
        </div>
        <div className="px-8 pb-8 pt-6">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border uppercase tracking-wider ${catInfo.color}`}>
              <Tag className="w-3 h-3 mr-1" />
              {isAr ? catInfo.ar : catInfo.fr}
            </span>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                inst.is_active
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-gray-100 text-gray-500 border-gray-200'
              }`}
            >
              {inst.is_active
                ? isAr ? 'نشطة' : 'Active'
                : isAr ? 'غير نشطة' : 'Inactive'}
            </span>
          </div>

          {parent && (
            <p className="text-sm text-gray-500 mb-2">
              {isAr ? 'تابعة لـ: ' : 'Sous tutelle de : '}
              <Link
                href={`/${locale}/institutions/${parent.id}`}
                className="text-indigo-600 hover:underline font-medium"
              >
                {isAr ? parent.name_ar : (parent.name_fr || parent.name_ar)}
              </Link>
            </p>
          )}

          <h1 className="text-3xl font-bold text-gray-900 mb-4">{name}</h1>
          {description && (
            <p className="text-lg text-gray-600 leading-relaxed max-w-3xl">{description}</p>
          )}
        </div>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-xl">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">{isAr ? 'التعيينات المسجلة' : 'Nominations'}</p>
            <p className="text-2xl font-bold text-gray-900">{docCount ?? 0}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-xl">
            <Users className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">{isAr ? 'المسؤولون الحاليون' : 'Cadres actuels'}</p>
            <p className="text-2xl font-bold text-gray-900">{officials?.length ?? 0}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center gap-4">
          <div className="p-3 bg-indigo-50 rounded-xl">
            <Network className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">{isAr ? 'الجهات التابعة' : 'Entités rattachées'}</p>
            <p className="text-2xl font-bold text-gray-900">{children.length}</p>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Officials + Timeline */}
        <div className="lg:col-span-2 space-y-8">

          {/* Current Officials */}
          {officials && officials.length > 0 && (
            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
              <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
                <div className="flex items-center">
                  <Users className={`${isAr ? 'ml-3' : 'mr-3'} w-6 h-6 text-emerald-600`} />
                  <h2 className="text-xl font-bold text-gray-900">
                    {isAr ? 'الهيكل القيادي الحالي' : 'Cadres en fonction'}
                  </h2>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {officials.map((off: any) => {
                  const person = off.persons as any;
                  return (
                    <div
                      key={off.id}
                      className="p-4 border border-gray-100 rounded-xl bg-gray-50 hover:bg-white hover:shadow-sm transition-all"
                    >
                      <p className="text-xs text-gray-500 mb-1">
                        {isAr
                          ? off.position_title_ar
                          : (off.position_title_fr || off.position_title_ar)}
                      </p>
                      {person ? (
                        <Link
                          href={`/${locale}/persons/${person.id}`}
                          className="font-semibold text-gray-900 hover:text-indigo-600"
                        >
                          {isAr ? person.full_name_ar : (person.full_name_fr || person.full_name_ar)}
                        </Link>
                      ) : (
                        <span className="font-semibold text-gray-600">—</span>
                      )}
                      {off.appointment_date && (
                        <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" />
                          {isAr ? 'منذ ' : 'Depuis '}
                          {new Date(off.appointment_date).toLocaleDateString(
                            isAr ? 'ar-MR' : 'fr-FR'
                          )}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Timeline */}
          {timeline && timeline.length > 0 && (
            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
              <div className="flex items-center mb-6 border-b border-gray-100 pb-4">
                <Clock className={`${isAr ? 'ml-3' : 'mr-3'} w-6 h-6 text-indigo-600`} />
                <h2 className="text-xl font-bold text-gray-900">
                  {isAr ? 'السجل التاريخي' : 'Historique'}
                </h2>
              </div>
              <div className="relative border-s-2 border-gray-100 ms-3">
                {timeline.map((evt: any) => {
                  const person = evt.persons as any;
                  const doc = evt.instrument_document as any;
                  return (
                    <div key={evt.id} className="mb-8 ms-6 relative">
                      <span className="absolute flex items-center justify-center w-6 h-6 bg-white rounded-full -start-9 ring-4 ring-white border border-indigo-200">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            APPT_DOT[evt.appointment_type] ?? 'bg-gray-400'
                          }`}
                        />
                      </span>
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-1 gap-2">
                        <div>
                          <h3 className="text-base font-semibold text-gray-900">
                            {isAr
                              ? evt.position_title_ar
                              : (evt.position_title_fr || evt.position_title_ar)}
                          </h3>
                          {person && (
                            <Link
                              href={`/${locale}/persons/${person.id}`}
                              className="text-sm text-indigo-600 hover:underline"
                            >
                              {isAr
                                ? person.full_name_ar
                                : (person.full_name_fr || person.full_name_ar)}
                            </Link>
                          )}
                        </div>
                        {evt.appointment_date && (
                          <time className="text-xs text-gray-400 whitespace-nowrap mt-1">
                            {new Date(evt.appointment_date).toLocaleDateString(
                              isAr ? 'ar-MR' : 'fr-FR'
                            )}
                          </time>
                        )}
                      </div>
                      {doc && (
                        <p className="text-xs text-gray-500 mt-1">
                          {isAr ? 'مرجع: ' : 'Réf. '}
                          <Link
                            href={`/${locale}/documents/${doc.id}`}
                            className="font-medium text-indigo-600 hover:underline"
                          >
                            {doc.official_number || doc.title_ar}
                          </Link>
                        </p>
                      )}
                      {evt.is_current && (
                        <span className="mt-1 inline-block text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                          {isAr ? 'الوضع الحالي' : 'Situation actuelle'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* Right: Relations & Sub-entities */}
        <div className="space-y-8">
          {/* Children / Sub-entities */}
          {children.length > 0 && (
            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-5">
                <Network className={`${isAr ? 'ml-3' : 'mr-3'} w-5 h-5 text-gray-600`} />
                <h2 className="text-lg font-bold text-gray-900">
                  {isAr ? 'الجهات التابعة' : 'Entités rattachées'}
                </h2>
              </div>
              <ul className="space-y-3">
                {children.map((child: any) => {
                  const childCat = CATEGORY_LABELS[child.category] ?? CATEGORY_LABELS['other'];
                  return (
                    <li key={child.id}>
                      <Link
                        href={`/${locale}/institutions/${child.id}`}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 hover:bg-indigo-50 hover:border-indigo-100 transition-colors group"
                      >
                        <span className="text-sm font-medium text-gray-800">
                          {isAr ? child.name_ar : (child.name_fr || child.name_ar)}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${childCat.color}`}>
                          {isAr ? childCat.ar : childCat.fr}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Quick stats */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-base font-bold text-gray-700 mb-4">
              {isAr ? 'معلومات سريعة' : 'Informations'}
            </h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">{isAr ? 'الفئة' : 'Catégorie'}</dt>
                <dd className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${catInfo.color}`}>
                  {isAr ? catInfo.ar : catInfo.fr}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">{isAr ? 'الحالة' : 'Statut'}</dt>
                <dd className="font-medium text-gray-800">
                  {inst.is_active
                    ? isAr ? 'نشطة' : 'Active'
                    : isAr ? 'غير نشطة' : 'Inactive'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">{isAr ? 'سجل التعيينات' : 'Actes'}</dt>
                <dd className="font-medium text-gray-800">{docCount ?? 0}</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}
