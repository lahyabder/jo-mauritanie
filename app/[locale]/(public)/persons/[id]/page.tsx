import { UserCircle2, Briefcase, FileText, Building2, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';

// Badge color per appointment type
const TYPE_COLORS: Record<string, string> = {
  nomination: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  appointment: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  dismissal: 'bg-red-100 text-red-700 border-red-200',
  transfer: 'bg-amber-100 text-amber-700 border-amber-200',
  promotion: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const TYPE_DOT: Record<string, string> = {
  nomination: 'bg-indigo-600',
  appointment: 'bg-indigo-600',
  dismissal: 'bg-red-500',
  transfer: 'bg-amber-500',
  promotion: 'bg-emerald-500',
};

function typeBadge(type: string, isAr: boolean) {
  const labels: Record<string, { ar: string; fr: string }> = {
    nomination: { ar: 'تعيين', fr: 'Nomination' },
    appointment: { ar: 'تعيين', fr: 'Nomination' },
    dismissal: { ar: 'إعفاء', fr: 'Révocation' },
    transfer: { ar: 'نقل', fr: 'Mutation' },
    promotion: { ar: 'ترقية', fr: 'Promotion' },
  };
  const cls = TYPE_COLORS[type] ?? 'bg-gray-100 text-gray-600 border-gray-200';
  const label = labels[type]?.[isAr ? 'ar' : 'fr'] ?? type;
  return { cls, label };
}

export default async function PersonProfilePage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { locale, id } = await params;
  const isAr = locale === 'ar';
  const supabase = await createClient();

  // Fetch person
  const { data: person, error } = await supabase
    .from('persons')
    .select(
      `id, full_name_ar, full_name_fr, current_role_title_ar, current_role_title_fr,
       biography_ar, biography_fr, gender, is_active, photo_url,
       institutions:current_institution_id ( id, name_ar, name_fr )`
    )
    .eq('id', id)
    .maybeSingle();

  if (error || !person) notFound();

  // Appointment history (chronological timeline)
  const { data: history } = await supabase
    .from('appointment_history')
    .select(
      `id, position_title_ar, position_title_fr, appointment_type, appointment_date, is_current,
       institutions:institution_id ( id, name_ar, name_fr ),
       instrument_document:instrument_document_id ( id, title_ar, official_number, type )`
    )
    .eq('person_id', id)
    .order('appointment_date', { ascending: false });

  // Count document appearances via appointments
  const { count: mentionCount } = await supabase
    .from('appointment_history')
    .select('id', { count: 'exact', head: true })
    .eq('person_id', id);

  const name = isAr ? person.full_name_ar : (person.full_name_fr || person.full_name_ar);
  const position = isAr
    ? person.current_role_title_ar
    : (person.current_role_title_fr || person.current_role_title_ar);
  const bio = isAr ? person.biography_ar : (person.biography_fr || person.biography_ar);
  const currentInst = person.institutions as any;

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Back Button */}
      <div className="mb-8">
        <Link
          href={`/${locale}/persons`}
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          {isAr ? (
            <ChevronRight className="ml-1 w-4 h-4" />
          ) : (
            <ChevronLeft className="mr-1 w-4 h-4" />
          )}
          {isAr ? 'العودة إلى القائمة' : 'Back to list'}
        </Link>
      </div>

      {/* Header Profile */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-10">
        <div className="h-32 bg-gradient-to-r from-slate-800 to-slate-700" />
        <div className="px-8 pb-8">
          <div className="relative flex justify-between items-end -mt-16 mb-6">
            {/* Avatar */}
            <div className="w-32 h-32 bg-white rounded-xl shadow-md p-1 flex items-center justify-center border border-gray-100">
              {person.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={person.photo_url}
                  alt={name}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <div className="w-full h-full bg-slate-50 rounded-lg flex items-center justify-center text-slate-300">
                  <UserCircle2 size={80} strokeWidth={1} />
                </div>
              )}
            </div>
            {/* Badges */}
            <div className="flex gap-3 flex-wrap justify-end">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${
                  person.is_active
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-gray-100 text-gray-500 border-gray-200'
                }`}
              >
                {person.is_active ? (isAr ? 'نشط' : 'Actif') : (isAr ? 'غير نشط' : 'Inactif')}
              </span>
              {mentionCount ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  {mentionCount} {isAr ? 'ذكر في الجريدة' : 'Mentions'}
                </span>
              ) : null}
            </div>
          </div>

          <h1 className="text-3xl font-bold text-gray-900">{name}</h1>
          {position && (
            <p className="mt-2 text-xl text-gray-600 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-gray-400 flex-shrink-0" />
              {position}
            </p>
          )}
          {currentInst && (
            <p className="mt-1 text-sm text-indigo-600 flex items-center gap-1">
              <Building2 className="w-4 h-4" />
              <Link href={`/${locale}/institutions/${currentInst.id}`} className="hover:underline">
                {isAr ? currentInst.name_ar : (currentInst.name_fr || currentInst.name_ar)}
              </Link>
            </p>
          )}
          {bio && (
            <p className="mt-4 text-gray-600 leading-relaxed max-w-3xl">{bio}</p>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Timeline */}
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center mb-6 border-b border-gray-100 pb-4">
              <Calendar className={`${isAr ? 'ml-3' : 'mr-3'} w-6 h-6 text-indigo-600`} />
              <h2 className="text-xl font-bold text-gray-900">
                {isAr ? 'السجل التاريخي (التعيينات والإعفاءات)' : 'Historique des fonctions'}
              </h2>
            </div>

            {history && history.length > 0 ? (
              <div className="relative border-s-2 border-gray-100 ms-3">
                {history.map((evt: any) => {
                  const { cls, label } = typeBadge(evt.appointment_type, isAr);
                  const doc = evt.instrument_document as any;
                  const inst = evt.institutions as any;
                  return (
                    <div key={evt.id} className="mb-8 ms-6 relative">
                      <span
                        className={`absolute flex items-center justify-center w-6 h-6 bg-white rounded-full -start-9 ring-4 ring-white border border-indigo-200`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full ${TYPE_DOT[evt.appointment_type] ?? 'bg-gray-400'}`}
                        />
                      </span>
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-2 gap-2">
                        <div>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${cls}`}>
                            {label}
                          </span>
                          <h3 className="text-base font-semibold text-gray-900 mt-1">
                            {isAr
                              ? evt.position_title_ar
                              : (evt.position_title_fr || evt.position_title_ar)}
                          </h3>
                          {inst && (
                            <Link
                              href={`/${locale}/institutions/${inst.id}`}
                              className="text-sm text-indigo-600 hover:underline"
                            >
                              {isAr ? inst.name_ar : (inst.name_fr || inst.name_ar)}
                            </Link>
                          )}
                        </div>
                        <time className="text-xs text-gray-400 whitespace-nowrap mt-1">
                          {evt.appointment_date
                            ? new Date(evt.appointment_date).toLocaleDateString(
                                isAr ? 'ar-MR' : 'fr-FR'
                              )
                            : '—'}
                        </time>
                      </div>
                      {doc && (
                        <p className="text-xs text-gray-500">
                          {isAr ? 'مرجع:' : 'Réf.:'}{' '}
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
                          {isAr ? 'الوظيفة الحالية' : 'Poste actuel'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-400 text-sm py-6 text-center">
                {isAr ? 'لا توجد تعيينات مسجلة.' : 'Aucun historique enregistré.'}
              </p>
            )}
          </section>

          {/* Mentions count */}
          {mentionCount && mentionCount > 0 ? (
            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
              <div className="flex items-center mb-4 border-b border-gray-100 pb-4">
                <FileText className={`${isAr ? 'ml-3' : 'mr-3'} w-6 h-6 text-slate-600`} />
                <h2 className="text-xl font-bold text-gray-900">
                  {isAr ? 'الوثائق المرتبطة' : 'Documents liés'}
                </h2>
              </div>
              <p className="text-gray-500 text-sm">
                {isAr
                  ? `ذُكر هذا الشخص في ${mentionCount} قرار أو مرسوم رسمي.`
                  : `Cette personne est mentionnée dans ${mentionCount} acte(s) officiel(s).`}
              </p>
              <Link
                href={`/${locale}/search?person_id=${id}`}
                className="mt-4 inline-flex items-center text-sm font-medium text-indigo-600 hover:underline"
              >
                {isAr ? 'عرض جميع الوثائق ←' : '→ Voir tous les documents'}
              </Link>
            </section>
          ) : null}
        </div>

        {/* Right: Quick info */}
        <div className="space-y-6">
          {/* Gender */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-base font-bold text-gray-700 mb-4">
              {isAr ? 'معلومات عامة' : 'Informations générales'}
            </h2>
            <dl className="space-y-3 text-sm">
              {person.gender && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">{isAr ? 'الجنس' : 'Genre'}</dt>
                  <dd className="font-medium text-gray-800">
                    {person.gender === 'M'
                      ? isAr ? 'ذكر' : 'Masculin'
                      : isAr ? 'أنثى' : 'Féminin'}
                  </dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-gray-500">{isAr ? 'عدد التعيينات' : 'Nominations'}</dt>
                <dd className="font-medium text-gray-800">{history?.length ?? 0}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">{isAr ? 'ذكر في الجريدة' : 'Mentions JO'}</dt>
                <dd className="font-medium text-gray-800">{mentionCount ?? 0}</dd>
              </div>
            </dl>
          </section>

          {/* Institution History from appointment_history */}
          {history && history.length > 0 && (
            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-5">
                <Building2 className={`${isAr ? 'ml-3' : 'mr-3'} w-5 h-5 text-gray-500`} />
                <h2 className="text-base font-bold text-gray-900">
                  {isAr ? 'الانتماء المؤسسي' : 'Appartenance institutionnelle'}
                </h2>
              </div>
              <ul className="space-y-3">
                {Array.from(
                  new Map(
                    history
                      .filter((h: any) => h.institutions)
                      .map((h: any) => [(h.institutions as any).id, h.institutions])
                  ).values()
                )
                  .slice(0, 5)
                  .map((inst: any) => (
                    <li key={inst.id}>
                      <Link
                        href={`/${locale}/institutions/${inst.id}`}
                        className="flex items-center p-3 bg-gray-50 rounded-xl border border-gray-100 hover:bg-indigo-50 hover:border-indigo-100 transition-colors gap-3"
                      >
                        <Building2 className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-800 leading-tight">
                          {isAr ? inst.name_ar : (inst.name_fr || inst.name_ar)}
                        </span>
                      </Link>
                    </li>
                  ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
