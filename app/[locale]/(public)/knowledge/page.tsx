'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import {
  Brain, Zap, BookOpen, Users, Building2,
  Scale, Flame, Calendar, ChevronRight, ChevronLeft,
  Layers, Network, TrendingUp, Sparkles
} from 'lucide-react';

// ──────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────
type Tab = 'events' | 'collections' | 'scores';

const EVENT_ICONS: Record<string, any> = {
  law_created: Scale,
  law_amended: Scale,
  decree_issued: BookOpen,
  decision_issued: Flame,
  appointment: Users,
  dismissal: Users,
  nomination: Users,
  budget_approved: TrendingUp,
  treaty_signed: Network,
  default: Zap,
};

const EVENT_COLORS: Record<string, string> = {
  legal:       'bg-blue-50 border-blue-200 text-blue-800',
  governmental:'bg-violet-50 border-violet-200 text-violet-800',
  career:      'bg-emerald-50 border-emerald-200 text-emerald-800',
};

const CATEGORY_FR: Record<string, string> = {
  legal: 'Juridique',
  governmental: 'Gouvernemental',
  career: 'Carrière',
};

// ──────────────────────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────────────────────
function EventCard({ evt, isAr, locale }: { evt: any; isAr: boolean; locale: string }) {
  const Icon = EVENT_ICONS[evt.event_type] ?? EVENT_ICONS['default'];
  const colorCls = EVENT_COLORS[evt.category] ?? 'bg-gray-50 border-gray-200 text-gray-800';
  const catLabel = isAr ? evt.category : (CATEGORY_FR[evt.category] ?? evt.category);

  return (
    <div className={`flex items-start gap-4 p-4 rounded-xl border ${colorCls.replace(/text-\S+/, '')} bg-white border-gray-100 hover:shadow-sm transition-shadow`}>
      <div className={`p-2 rounded-lg ${colorCls} flex-shrink-0`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${colorCls}`}>
            {catLabel}
          </span>
          {evt.event_date && (
            <span className="text-xs text-gray-400">
              {new Date(evt.event_date).toLocaleDateString(isAr ? 'ar-MR' : 'fr-FR')}
            </span>
          )}
        </div>
        <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">
          {evt.title_ar}
        </p>
        {evt.description_ar && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{evt.description_ar}</p>
        )}
        <div className="flex flex-wrap gap-2 mt-2">
          {evt.document_id && (
            <Link
              href={`/${locale}/documents/${evt.document_id}`}
              className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
            >
              <BookOpen className="w-3 h-3" />
              {isAr ? 'الوثيقة' : 'Document'}
            </Link>
          )}
          {evt.person_id && (
            <Link
              href={`/${locale}/persons/${evt.person_id}`}
              className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
            >
              <Users className="w-3 h-3" />
              {isAr ? 'الشخص' : 'Personne'}
            </Link>
          )}
          {evt.institution_id && (
            <Link
              href={`/${locale}/institutions/${evt.institution_id}`}
              className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
            >
              <Building2 className="w-3 h-3" />
              {isAr ? 'المؤسسة' : 'Institution'}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function CollectionCard({ col, isAr, locale }: { col: any; isAr: boolean; locale: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all p-6 flex flex-col gap-3">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg"
        style={{ background: col.color ?? '#6366f1' }}
      >
        {col.icon ?? '📁'}
      </div>
      <div>
        <p className="font-bold text-gray-900 leading-snug">{col.title_ar}</p>
        {col.description_ar && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{col.description_ar}</p>
        )}
      </div>
      <div className="mt-auto flex items-center justify-between">
        <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
          {col.document_count ?? 0} {isAr ? 'وثيقة' : 'doc.'}
        </span>
        {col.is_featured && (
          <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            {isAr ? 'مميزة' : 'En vedette'}
          </span>
        )}
      </div>
    </div>
  );
}

function ScoreRow({ doc, isAr, locale, rank }: { doc: any; isAr: boolean; locale: string; rank: number }) {
  const score = Math.round(doc.total_score ?? 0);
  const pct = doc.percentile_rank ? Math.round(doc.percentile_rank) : null;
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-white border border-gray-100 hover:border-indigo-100 hover:shadow-sm transition-all">
      <span className="text-2xl font-extrabold text-gray-200 w-10 text-center flex-shrink-0">
        {rank}
      </span>
      <div className="flex-1 min-w-0">
        <Link
          href={`/${locale}/documents/${doc.document_id}`}
          className="text-sm font-semibold text-gray-900 hover:text-indigo-600 line-clamp-1"
        >
          {doc.documents?.title_ar ?? doc.document_id}
        </Link>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
          {doc.citation_score > 0 && (
            <span className="text-xs text-gray-500">
              {isAr ? 'استشهاد:' : 'Citations:'} <b>{Math.round(doc.citation_score)}</b>
            </span>
          )}
          {doc.amendment_score > 0 && (
            <span className="text-xs text-gray-500">
              {isAr ? 'تعديل:' : 'Amendements:'} <b>{Math.round(doc.amendment_score)}</b>
            </span>
          )}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-xl font-bold text-indigo-600">{score}</div>
        {pct !== null && (
          <div className="text-xs text-gray-400">P{pct}</div>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────────────────────────────────────
export default function KnowledgePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  const isAr = locale === 'ar';
  const supabase = createClient();

  const [tab, setTab] = useState<Tab>('events');
  const [category, setCategory] = useState<string>('');

  // Data states
  const [events, setEvents] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [scores, setScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Counts
  const [counts, setCounts] = useState({ events: 0, collections: 0 });

  // Load counts on mount
  useEffect(() => {
    Promise.all([
      supabase.from('legal_events').select('id', { count: 'exact', head: true }),
      supabase.from('document_collections').select('id', { count: 'exact', head: true }),
    ]).then(([e, c]) => {
      setCounts({ events: e.count ?? 0, collections: c.count ?? 0 });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load tab data
  useEffect(() => {
    setLoading(true);
    if (tab === 'events') {
      let q = supabase
        .from('legal_events')
        .select('*')
        .order('event_date', { ascending: false })
        .limit(50);
      if (category) q = q.eq('category', category);
      q.then(({ data }) => {
        setEvents(data ?? []);
        setLoading(false);
      });
    } else if (tab === 'collections') {
      supabase
        .from('document_collections')
        .select('*')
        .order('document_count', { ascending: false })
        .limit(30)
        .then(({ data }) => {
          setCollections(data ?? []);
          setLoading(false);
        });
    } else if (tab === 'scores') {
      supabase
        .from('knowledge_scores')
        .select('*, documents:document_id ( id, title_ar, type )')
        .order('total_score', { ascending: false })
        .limit(30)
        .then(({ data }) => {
          setScores(data ?? []);
          setLoading(false);
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, category]);

  const tabs: { key: Tab; labelAr: string; labelFr: string; icon: any; count?: number }[] = [
    { key: 'events', labelAr: 'الأحداث القانونية', labelFr: 'Événements juridiques', icon: Calendar, count: counts.events },
    { key: 'collections', labelAr: 'المجموعات الموضوعية', labelFr: 'Collections thématiques', icon: Layers, count: counts.collections },
    { key: 'scores', labelAr: 'أهم الوثائق', labelFr: 'Documents clés', icon: TrendingUp },
  ];

  const CATEGORIES = [
    { key: '', labelAr: 'الكل', labelFr: 'Tous' },
    { key: 'legal', labelAr: 'قانونية', labelFr: 'Juridiques' },
    { key: 'governmental', labelAr: 'حكومية', labelFr: 'Gouvernementaux' },
    { key: 'career', labelAr: 'مسارات', labelFr: 'Carrières' },
  ];

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 sm:px-6" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Page Header */}
      <div className="mb-10 pb-8 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-indigo-600 rounded-xl">
            <Brain className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900">
            {isAr ? 'طبقة المعرفة' : 'Knowledge Layer'}
          </h1>
        </div>
        <p className="text-gray-500 max-w-2xl text-base">
          {isAr
            ? 'رؤية تحليلية وذكية مستخلصة من بيانات الجريدة الرسمية — أحداث قانونية، مجموعات موضوعية، وترتيب أهمية الوثائق.'
            : 'Vue analytique et intelligente extraite des données du Journal Officiel — événements, collections thématiques, et classement des documents clés.'}
        </p>
        {/* Stats pills */}
        <div className="flex flex-wrap gap-3 mt-6">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-sm font-medium">
            <Calendar className="w-4 h-4" />
            {counts.events} {isAr ? 'حدث مسجل' : 'événements'}
          </span>
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-50 text-violet-700 border border-violet-200 text-sm font-medium">
            <Layers className="w-4 h-4" />
            {counts.collections} {isAr ? 'مجموعة' : 'collections'}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap mb-8">
        {tabs.map(({ key, labelAr, labelFr, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
              tab === key
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-200 hover:text-indigo-600'
            }`}
          >
            <Icon className="w-4 h-4" />
            {isAr ? labelAr : labelFr}
            {count !== undefined && count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === key ? 'bg-white/20' : 'bg-gray-100'}`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Category filter (events only) */}
      {tab === 'events' && (
        <div className="flex gap-2 flex-wrap mb-6">
          {CATEGORIES.map(({ key, labelAr, labelFr }) => (
            <button
              key={key}
              onClick={() => setCategory(key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                category === key
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              {isAr ? labelAr : labelFr}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-24">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
        </div>
      ) : (
        <>
          {/* Events */}
          {tab === 'events' && (
            events.length === 0 ? (
              <EmptyState isAr={isAr} />
            ) : (
              <div className="space-y-3">
                {events.map((evt) => (
                  <EventCard key={evt.id} evt={evt} isAr={isAr} locale={locale} />
                ))}
              </div>
            )
          )}

          {/* Collections */}
          {tab === 'collections' && (
            collections.length === 0 ? (
              <EmptyState isAr={isAr} />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {collections.map((col) => (
                  <CollectionCard key={col.id} col={col} isAr={isAr} locale={locale} />
                ))}
              </div>
            )
          )}

          {/* Scores */}
          {tab === 'scores' && (
            scores.length === 0 ? (
              <EmptyState isAr={isAr} />
            ) : (
              <div className="space-y-3">
                {scores.map((doc, idx) => (
                  <ScoreRow key={doc.document_id} doc={doc} isAr={isAr} locale={locale} rank={idx + 1} />
                ))}
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}

function EmptyState({ isAr }: { isAr: boolean }) {
  return (
    <div className="text-center py-20 border border-dashed border-gray-200 rounded-2xl bg-gray-50">
      <Brain className="w-12 h-12 text-gray-300 mx-auto mb-4" />
      <p className="text-gray-500 font-medium">
        {isAr
          ? 'لا توجد بيانات بعد. قم بتشغيل pipeline لتوليد طبقة المعرفة.'
          : 'Aucune donnée disponible. Lancez le pipeline pour générer la Knowledge Layer.'}
      </p>
    </div>
  );
}
