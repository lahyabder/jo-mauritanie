'use client';

import { useState, use, useEffect, useRef } from 'react';
import UploadDropzone from '@/components/gazette/UploadDropzone';
import { createClient } from '@/utils/supabase/client';

// Map sync_log DB status → visual step (1=uploaded, 2=ocr, 3=structure, 4=ai, 5=done)
function statusToStep(row: any): number {
  if (!row) return 1;
  const s = row.status as string;
  if (s === 'completed' || s === 'done') return 5;
  if (s === 'error' || s === 'failed') return 5; // show as done to unblock UI
  if (row.persons_extracted > 0 || row.institutions_extracted > 0) return 4;
  if (row.documents_extracted > 0) return 3;
  if (s === 'processing') return 2;
  return 1;
}

interface StepMeta {
  label_ar: string;
  label_fr: string;
  desc_ar: string;
  desc_fr: string;
}

const STEPS: StepMeta[] = [
  { label_ar: 'اكتمل الرفع', label_fr: 'Téléversement terminé', desc_ar: 'تم حفظ الملف بأمان في Supabase', desc_fr: 'Fichier stocké dans Supabase' },
  { label_ar: 'استخراج النصوص (OCR)', label_fr: 'Extraction OCR', desc_ar: 'جاري قراءة صفحات الـ PDF…', desc_fr: 'Lecture des pages PDF…' },
  { label_ar: 'التحليل الهيكلي', label_fr: 'Analyse structurelle', desc_ar: 'تقسيم العدد إلى مراسيم وقوانين', desc_fr: 'Découpage en documents juridiques' },
  { label_ar: 'التصنيف الذكي', label_fr: 'Classification IA', desc_ar: 'استخراج البيانات الوصفية عبر الذكاء الاصطناعي', desc_fr: 'Extraction des métadonnées via Gemini' },
];

function JobStatusViewer({ jobId, isAr = false, onReset }: { jobId: string; isAr?: boolean; onReset: () => void }) {
  const [step, setStep] = useState(1);
  const [row, setRow] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);

  useEffect(() => {
    const supabase = createClient();

    // 1. Initial fetch of current state
    supabase
      .from('sync_logs')
      .select('*')
      .eq('id', jobId)
      .single()
      .then(({ data, error: e }) => {
        if (e) { setError(e.message); return; }
        if (data) { setRow(data); setStep(statusToStep(data)); }
      });

    // 2. Subscribe to real-time changes on this specific row
    const channel = supabase
      .channel(`sync_log_${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sync_logs',
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          const updated = payload.new as any;
          setRow(updated);
          setStep(statusToStep(updated));
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [jobId]);

  const isDone = step >= 5;
  const isError = row?.status === 'error' || row?.status === 'failed';

  return (
    <div className="w-full max-w-2xl mx-auto mt-8 bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
      <h2 className="text-xl font-bold mb-6 text-gray-900">
        {isAr ? 'جاري المعالجة والتحليل' : 'Traitement en cours'}
      </h2>

      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {isAr ? 'خطأ في قراءة الحالة:' : 'Erreur de lecture:'} {error}
        </div>
      )}

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-xs font-semibold text-gray-500 mb-2 px-1">
          <span>{isAr ? 'التقدم' : 'Progression'}</span>
          <span>{Math.min(100, Math.round((step / STEPS.length) * 100))}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
          <div 
            className={`h-2.5 rounded-full transition-all duration-1000 ease-out ${isError ? 'bg-red-500' : 'bg-indigo-600'}`}
            style={{ width: `${Math.min(100, (step / STEPS.length) * 100)}%` }}
          />
        </div>
      </div>

      <div className="space-y-0 relative">
        {STEPS.map((s, idx) => {
          const stepNum = idx + 1;
          const done = step > stepNum;
          const active = step === stepNum;
          const isLast = idx === STEPS.length - 1;
          
          return (
            <div key={idx} className={`relative flex items-start transition-opacity duration-500 pb-8 ${stepNum <= step ? 'opacity-100' : 'opacity-35'}`}>
              {/* Vertical connector line */}
              {!isLast && (
                <div className={`absolute top-9 left-[33px] rtl:right-[33px] rtl:left-auto w-0.5 h-[calc(100%-36px)] transition-colors duration-500 ${done ? 'bg-green-200' : 'bg-gray-100'}`} />
              )}
              
              <div className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center mx-4 flex-shrink-0 font-bold transition-all duration-500 border-2
                ${done ? 'bg-green-100 text-green-600 border-green-200' : active && !isError ? 'bg-blue-100 text-blue-600 border-blue-200 animate-pulse' : 'bg-white text-gray-400 border-gray-200'}`}>
                {done ? '✓' : active ? <span className="w-2.5 h-2.5 bg-blue-500 rounded-full" /> : stepNum}
              </div>
              <div className="flex-1 text-start pt-1">
                <h4 className="font-semibold text-gray-900">{isAr ? s.label_ar : s.label_fr}</h4>
                <p className="text-sm text-gray-500 mt-1">
                  {isAr ? s.desc_ar : s.desc_fr}
                  {active && stepNum === 2 && row?.error_details?.chunk_progress && (
                    <span className="inline-block mx-2 text-indigo-600 font-bold rtl:mr-2">
                      ({row.error_details.chunk_progress}%)
                    </span>
                  )}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live stats from DB */}
      {row && (row.documents_extracted > 0 || row.persons_extracted > 0) && (
        <div className="mt-6 pt-5 border-t border-gray-100 grid grid-cols-3 gap-3 text-center">
          {[
            { label: isAr ? 'وثائق' : 'Documents', value: row.documents_extracted ?? 0 },
            { label: isAr ? 'أشخاص' : 'Personnes', value: row.persons_extracted ?? 0 },
            { label: isAr ? 'مؤسسات' : 'Institutions', value: row.institutions_extracted ?? 0 },
          ].map((stat) => (
            <div key={stat.label} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              <p className="text-2xl font-bold text-indigo-700">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {isDone && (
        <div className="mt-8 text-center">
          {isError ? (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {row?.error_message || (isAr ? 'حدث خطأ أثناء المعالجة.' : 'Une erreur s\'est produite.')}
            </div>
          ) : (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm font-medium">
              {isAr ? '✓ اكتملت المعالجة بنجاح' : '✓ Traitement terminé avec succès'}
            </div>
          )}
          <button
            onClick={onReset}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
          >
            {isAr ? 'رفع عدد آخر' : 'Téléverser un autre numéro'}
          </button>
        </div>
      )}

      <div className="mt-8 pt-5 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
        <span>{isAr ? 'رقم العملية:' : 'ID:'} <code className="font-mono">{jobId.slice(0, 8)}…</code></span>
        <span className={`px-2 py-0.5 rounded-full border text-xs font-medium ${
          isError ? 'bg-red-50 border-red-200 text-red-600' :
          isDone ? 'bg-green-50 border-green-200 text-green-600' :
          'bg-blue-50 border-blue-200 text-blue-600 animate-pulse'
        }`}>
          {row?.status ?? 'processing'}
        </span>
      </div>
    </div>
  );
}

export default function UploadCenterPage({ params }: { params: Promise<{ locale: string }> }) {
  const resolvedParams = use(params);
  const isAr = resolvedParams.locale === 'ar';
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            {isAr ? 'مركز الرفع والمعالجة' : 'Centre de téléversement'}
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            {isAr
              ? 'قم برفع الأعداد الجديدة من الجريدة الرسمية. سيقوم النظام باستخراج النصوص وتصنيفها آلياً.'
              : 'Téléversez les nouveaux numéros du Journal Officiel. Le système extraira et classifiera automatiquement les textes.'}
          </p>
        </div>

        {!activeJobId ? (
          <UploadDropzone onUploadSuccess={setActiveJobId} isAr={isAr} />
        ) : (
          <JobStatusViewer jobId={activeJobId} isAr={isAr} onReset={() => setActiveJobId(null)} />
        )}
      </div>
    </div>
  );
}
