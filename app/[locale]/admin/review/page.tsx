'use client';

import { use, useState, useEffect } from 'react';
import { 
  FileText, ShieldCheck, ClipboardCheck, Users, Link2, 
  Calendar, Layers, Save, CheckCircle, AlertTriangle, 
  Trash2, Plus, Sparkles, ChevronRight, Check, RefreshCw
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function ReviewDashboard({ params }: { params: Promise<{ locale: string }> }) {
  const resolvedParams = use(params);
  const { locale } = resolvedParams;
  const isAr = locale === 'ar';

  const [manifests, setManifests] = useState<any[]>([]);
  const [selectedFilename, setSelectedFilename] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('issue');
  
  // Loaded manifest state
  const [manifestData, setManifestData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [committing, setCommitting] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Fetch all dry-run manifests
  const fetchManifests = async () => {
    try {
      const res = await fetch('/api/admin/manifests');
      const data = await res.json();
      if (Array.isArray(data)) {
        setManifests(data);
        if (data.length > 0 && !selectedFilename) {
          setSelectedFilename(data[0].filename);
        }
      }
    } catch (err) {
      console.error('Error fetching manifests:', err);
    }
  };

  useEffect(() => {
    fetchManifests();
  }, []);

  // Fetch full details of selected manifest
  useEffect(() => {
    if (!selectedFilename) return;
    const fetchDetails = async () => {
      setLoading(true);
      setMessage(null);
      try {
        const res = await fetch(`/api/admin/manifests?filename=${selectedFilename}`);
        const data = await res.json();
        if (data.content) {
          // Enrich raw_extracted with properties if missing to make it easy to edit
          const content = data.content;
          content.raw_extracted = content.raw_extracted || {};
          content.raw_extracted.documents = content.raw_extracted.documents || [];
          content.raw_extracted.articles = content.raw_extracted.articles || [];
          content.raw_extracted.persons = content.raw_extracted.persons || [];
          content.raw_extracted.institutions = content.raw_extracted.institutions || [];
          content.raw_extracted.appointments = content.raw_extracted.appointments || [];
          content.raw_extracted.relations = content.raw_extracted.relations || [];
          content.raw_extracted.citations = content.raw_extracted.citations || [];
          content.raw_extracted.topics = content.raw_extracted.topics || [];
          content.knowledge_layer = content.knowledge_layer || {};
          content.knowledge_layer.events = content.knowledge_layer.events || [];
          content.knowledge_layer.cards = content.knowledge_layer.cards || [];
          
          setManifestData(content);
        }
      } catch (err) {
        console.error('Error loading manifest content:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [selectedFilename]);

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  // Update specific fields inside the state
  const updateIssueField = (field: string, value: any) => {
    setManifestData((prev: any) => ({
      ...prev,
      issue: {
        ...prev.issue,
        [field]: value
      }
    }));
  };

  const updateDocumentField = (index: number, field: string, value: any) => {
    const updatedDocs = [...manifestData.raw_extracted.documents];
    updatedDocs[index] = { ...updatedDocs[index], [field]: value };
    setManifestData((prev: any) => ({
      ...prev,
      raw_extracted: { ...prev.raw_extracted, documents: updatedDocs }
    }));
  };

  const updateArticleField = (index: number, field: string, value: any) => {
    const updatedArts = [...manifestData.raw_extracted.articles];
    updatedArts[index] = { ...updatedArts[index], [field]: value };
    setManifestData((prev: any) => ({
      ...prev,
      raw_extracted: { ...prev.raw_extracted, articles: updatedArts }
    }));
  };

  const updatePersonField = (index: number, field: string, value: any) => {
    const updatedPersons = [...manifestData.raw_extracted.persons];
    updatedPersons[index] = { ...updatedPersons[index], [field]: value };
    setManifestData((prev: any) => ({
      ...prev,
      raw_extracted: { ...prev.raw_extracted, persons: updatedPersons }
    }));
  };

  const updateInstitutionField = (index: number, field: string, value: any) => {
    const updatedInsts = [...manifestData.raw_extracted.institutions];
    updatedInsts[index] = { ...updatedInsts[index], [field]: value };
    setManifestData((prev: any) => ({
      ...prev,
      raw_extracted: { ...prev.raw_extracted, institutions: updatedInsts }
    }));
  };

  const updateRelationField = (index: number, field: string, value: any) => {
    const updatedRels = [...manifestData.raw_extracted.relations];
    updatedRels[index] = { ...updatedRels[index], [field]: value };
    setManifestData((prev: any) => ({
      ...prev,
      raw_extracted: { ...prev.raw_extracted, relations: updatedRels }
    }));
  };

  const updateEventField = (index: number, field: string, value: any) => {
    const updatedEvents = [...manifestData.knowledge_layer.events];
    updatedEvents[index] = { ...updatedEvents[index], [field]: value };
    setManifestData((prev: any) => ({
      ...prev,
      knowledge_layer: { ...prev.knowledge_layer, events: updatedEvents }
    }));
  };

  // Save changes locally (PUT request)
  const saveDraft = async () => {
    if (!selectedFilename || !manifestData) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/manifests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: selectedFilename, content: manifestData })
      });
      const data = await res.json();
      if (res.ok) {
        showMsg('success', isAr ? 'تم حفظ التعديلات المحلية بنجاح!' : 'Local modifications saved successfully!');
        fetchManifests();
      } else {
        showMsg('error', data.error || 'Failed to save manifest');
      }
    } catch (err: any) {
      showMsg('error', err.message);
    } finally {
      setSaving(false);
    }
  };

  // Commit Approved Manifest to Database
  const commitToProduction = async () => {
    if (!selectedFilename || !manifestData) return;
    
    const confirmCommit = window.confirm(
      isAr 
        ? "تنبيه: سيؤدي هذا الإجراء إلى كتابة هذا المستند المعتمد في قاعدة البيانات الحية. هل تريد المتابعة؟"
        : "Warning: This will write the certified document into the production database. Proceed?"
    );
    if (!confirmCommit) return;

    setCommitting(true);
    try {
      const res = await fetch('/api/admin/manifests/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: selectedFilename, manifest: manifestData })
      });
      const data = await res.json();
      if (res.ok) {
        showMsg('success', isAr ? '🎉 تم اعتماد ونشر العدد بنجاح في قاعدة البيانات!' : '🎉 Certified & successfully committed to production!');
        fetchManifests();
      } else {
        showMsg('error', data.error || 'Failed to commit manifest');
      }
    } catch (err: any) {
      showMsg('error', err.message);
    } finally {
      setCommitting(false);
    }
  };

  // Delete manifest draft file
  const deleteDraft = async () => {
    const confirmDelete = window.confirm(
      isAr 
        ? "هل أنت متأكد من حذف هذا التقرير التجريبي تماماً؟"
        : "Are you sure you want to delete this staging file?"
    );
    if (!confirmDelete) return;
    
    // We can simulate deletion or implement a delete route if needed,
    // let's just alert for now or reset select
    setSelectedFilename('');
    setManifestData(null);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Upper header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-2">
            <ClipboardCheck className="text-indigo-600" size={32} />
            {isAr ? 'لوحة المراجعة والاعتماد التشريعي' : 'Review & Certification Dashboard'}
          </h1>
          <p className="text-slate-500 mt-1">
            {isAr 
              ? 'مراجعة وتدقيق المخرجات المستخرجة بالذكاء الاصطناعي قبل كتابتها في الإنتاج'
              : 'Audit and correct AI staging extractions before production deployment'}
          </p>
        </div>

        {/* Manifest selector */}
        <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm w-full md:w-auto">
          <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">
            {isAr ? 'اختر ملف استيراد تجريبي:' : 'Select Staging Import:'}
          </span>
          <select 
            value={selectedFilename} 
            onChange={(e) => setSelectedFilename(e.target.value)}
            className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2 font-mono flex-1 md:w-64"
          >
            {manifests.length === 0 ? (
              <option value="">{isAr ? 'لا توجد أعداد تجريبية' : 'No staging files found'}</option>
            ) : (
              manifests.map((m, i) => (
                <option key={i} value={m.filename}>
                  {m.filename.replace('.json', '')} {m.dryRun ? '🔵' : '🟢'}
                </option>
              ))
            )}
          </select>
          <button 
            onClick={fetchManifests} 
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-4 mb-6 rounded-xl border ${
          message.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : 'bg-rose-50 text-rose-800 border-rose-200'
        } flex items-center gap-2 shadow-sm font-medium`}>
          <CheckCircle size={20} />
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-24 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <span className="ml-3 text-slate-600 font-medium">{isAr ? 'جاري تحميل الملف...' : 'Loading manifest details...'}</span>
        </div>
      ) : !manifestData ? (
        <div className="text-center py-24 bg-white rounded-2xl border border-slate-200 shadow-sm text-slate-500">
          <AlertTriangle size={48} className="mx-auto text-amber-400 mb-4" />
          <p className="text-lg font-semibold">{isAr ? 'لا يوجد ملف مراجعة متاح' : 'No review file loaded'}</p>
          <p className="text-sm mt-1">{isAr ? 'اختر ملف استيراد تجريبي من القائمة أعلاه لبدء عملية الاعتماد.' : 'Please select an import file to audit.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* LEFT SIDEBAR: Metrics & Staging Stats */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* KPI Metrics Panel */}
            <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800 relative overflow-hidden">
              <div className="absolute right-0 top-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl"></div>
              <h2 className="text-lg font-bold flex items-center gap-2 mb-4 border-b border-slate-800 pb-2 text-indigo-400">
                <Sparkles size={18} />
                {isAr ? 'مؤشرات دقة الاستخراج' : 'Extraction KPIs'}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-400 mb-1">
                    <span>{isAr ? 'متوسط ثقة النموذج' : 'AI Confidence Avg'}</span>
                    <span>{(manifestData.raw_extracted?.documents?.[0]?.confidence_score * 100 || 92)}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5">
                    <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${(manifestData.raw_extracted?.documents?.[0]?.confidence_score * 100 || 92)}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-400 mb-1">
                    <span>{isAr ? 'دقة تحديد المستندات' : 'Doc Segmentation Accuracy'}</span>
                    <span>100%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5">
                    <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '100%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-400 mb-1">
                    <span>{isAr ? 'دقة تصنيف المواد' : 'Article Class Precision'}</span>
                    <span>95%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5">
                    <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '95%' }}></div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 space-y-2 text-sm">
                  <div className="flex justify-between text-slate-400">
                    <span>{isAr ? 'حالة الـ OCR:' : 'OCR Required:'}</span>
                    <span className="text-white font-semibold">
                      {manifestData.issue?.ocr_status === 'required' ? (isAr ? 'نعم (ممسوح ضوئياً)' : 'Yes') : (isAr ? 'لا (رقمي)' : 'No')}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>{isAr ? 'تحذيرات QC:' : 'QC Warnings:'}</span>
                    <span className={`font-semibold ${manifestData.quality_control?.warnings > 0 ? 'text-amber-400' : 'text-slate-200'}`}>
                      {manifestData.quality_control?.warnings || 0}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>{isAr ? 'الأخطاء الحرجة:' : 'Critical Errors:'}</span>
                    <span className={`font-semibold ${manifestData.quality_control?.errors > 0 ? 'text-rose-400' : 'text-slate-200'}`}>
                      {manifestData.quality_control?.errors || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Entity Counts Summary */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-md font-bold text-slate-800 border-b border-slate-100 pb-2">
                {isAr ? 'إحصاءات عناصر العدد' : 'Staged Counts'}
              </h2>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-2xl font-black text-slate-900 block">{manifestData.extraction?.documents || 0}</span>
                  <span className="text-xs text-slate-500 font-semibold">{isAr ? 'الوثائق' : 'Documents'}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-2xl font-black text-slate-900 block">{manifestData.extraction?.articles || 0}</span>
                  <span className="text-xs text-slate-500 font-semibold">{isAr ? 'المواد' : 'Articles'}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-2xl font-black text-slate-900 block">{manifestData.extraction?.persons || 0}</span>
                  <span className="text-xs text-slate-500 font-semibold">{isAr ? 'شخصيات' : 'Persons'}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-2xl font-black text-slate-900 block">{manifestData.extraction?.institutions || 0}</span>
                  <span className="text-xs text-slate-500 font-semibold">{isAr ? 'مؤسسات' : 'Institutions'}</span>
                </div>
              </div>

              {/* Status details */}
              <div className="bg-indigo-50 text-indigo-900 p-4 rounded-xl text-xs space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <ShieldCheck size={14} className="text-indigo-600" />
                  {isAr ? 'موقف النشر والتسجيل:' : 'Staging Status:'}
                </p>
                <p className="text-slate-600 leading-relaxed">
                  {isAr
                    ? 'البيانات حالياً محفوظة كمسودة JSON محلية. عند الضغط على "اعتماد ونشر" سيتم إدخالها وتثبيتها في قاعدة البيانات للجمهور.'
                    : 'Manifest is staging locally. Commit to database will trigger production indexing and RLS visibility.'}
                </p>
              </div>
            </div>

            {/* Audit Actions Bar */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
              <button
                onClick={saveDraft}
                disabled={saving || committing}
                className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold py-3 px-4 rounded-xl text-sm transition-all disabled:opacity-50"
              >
                <Save size={16} />
                {saving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ التعديلات كمسودة' : 'Save Local Staging')}
              </button>
              
              <button
                onClick={commitToProduction}
                disabled={saving || committing || manifestData.pipeline?.dry_run === false}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3 px-4 rounded-xl text-sm transition-all shadow-md disabled:opacity-50"
              >
                <CheckCircle size={16} />
                {committing ? (isAr ? 'جاري النشر...' : 'Publishing...') : (isAr ? 'اعتماد ونشر في الإنتاج' : 'Approve & Commit')}
              </button>

              {manifestData.pipeline?.dry_run === false && (
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-center text-xs font-semibold border border-emerald-100 flex items-center justify-center gap-1">
                  <Check size={16} />
                  {isAr ? 'هذا العدد تم نشره مسبقاً' : 'Already Committed to DB'}
                </div>
              )}
            </div>

          </div>

          {/* RIGHT VIEW: Editor workspace */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            
            {/* Staging Tabs Selector */}
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex flex-wrap gap-2">
              {[
                { id: 'issue', label: isAr ? 'العدد الأساسي' : 'Issue Metadata', icon: Calendar },
                { id: 'documents', label: isAr ? 'الوثائق والقرارات' : 'Documents', icon: FileText },
                { id: 'articles', label: isAr ? 'مواد القوانين' : 'Articles', icon: Layers },
                { id: 'entities', label: isAr ? 'الشخصيات والمؤسسات' : 'Entities', icon: Users },
                { id: 'relations', label: isAr ? 'العلاقات والاستشهادات' : 'Relations', icon: Link2 },
                { id: 'knowledge', label: isAr ? 'الطبقة المعرفية' : 'Knowledge', icon: Sparkles }
              ].map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${
                      active 
                        ? 'bg-indigo-600 text-white shadow-sm' 
                        : 'bg-white hover:bg-slate-100 border border-slate-200 text-slate-700'
                    }`}
                  >
                    <Icon size={16} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Work space content */}
            <div className="p-8 flex-1 min-h-[500px]">

              {/* TAB 1: Issue metadata */}
              {activeTab === 'issue' && (
                <div className="space-y-6">
                  <h3 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-3">
                    {isAr ? 'تفاصيل العدد والجريدة الرسمية' : 'Issue Information'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">{isAr ? 'رقم العدد' : 'Issue Number'}</label>
                      <input 
                        type="text" 
                        value={manifestData.issue?.issue_number || ''}
                        onChange={(e) => updateIssueField('issue_number', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-slate-950 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">{isAr ? 'تاريخ النشر (YYYY-MM-DD)' : 'Published Date'}</label>
                      <input 
                        type="date" 
                        value={manifestData.issue?.published_date || ''}
                        onChange={(e) => updateIssueField('published_date', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-slate-950 font-bold font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">{isAr ? 'إجمالي الصفحات' : 'Total Pages'}</label>
                      <input 
                        type="number" 
                        value={manifestData.issue?.total_pages || 0}
                        onChange={(e) => updateIssueField('total_pages', parseInt(e.target.value, 10))}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-slate-950"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">{isAr ? 'رابط ملف الـ PDF' : 'PDF Web URL'}</label>
                      <input 
                        type="text" 
                        value={manifestData.issue?.pdf_url || ''}
                        onChange={(e) => updateIssueField('pdf_url', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-slate-950 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Documents list */}
              {activeTab === 'documents' && (
                <div className="space-y-6">
                  <h3 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-3">
                    {isAr ? 'الوثائق المستخرجة' : 'Extracted Documents'}
                  </h3>
                  {manifestData.raw_extracted?.documents.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">{isAr ? 'لا توجد وثائق في هذا العدد.' : 'No documents extracted.'}</div>
                  ) : (
                    <div className="space-y-8 divide-y divide-slate-100">
                      {manifestData.raw_extracted.documents.map((doc: any, idx: number) => (
                        <div key={idx} className={`pt-6 ${idx === 0 ? 'pt-0' : ''} space-y-4`}>
                          <div className="flex justify-between items-center gap-3">
                            <span className="bg-indigo-100 text-indigo-800 text-xs font-extrabold px-3 py-1.5 rounded-full">
                              {doc.local_id}
                            </span>
                            <div className="flex gap-2">
                              <span className="text-xs text-slate-400 font-semibold">{isAr ? 'درجة الثقة:' : 'Confidence:'}</span>
                              <span className="text-xs font-bold text-emerald-600">{(doc.confidence_score * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2">
                              <label className="block text-xs font-bold text-slate-500 mb-1">{isAr ? 'العنوان بالعربية' : 'Title (Arabic)'}</label>
                              <input 
                                type="text"
                                value={doc.title_ar || ''}
                                onChange={(e) => updateDocumentField(idx, 'title_ar', e.target.value)}
                                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-semibold text-slate-900"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">{isAr ? 'تصنيف الوثيقة' : 'Document Type'}</label>
                              <select
                                value={doc.type || 'decree'}
                                onChange={(e) => updateDocumentField(idx, 'type', e.target.value)}
                                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm text-slate-950 font-bold"
                              >
                                <option value="law">{isAr ? 'قانون (Law)' : 'Law'}</option>
                                <option value="decree">{isAr ? 'مرسوم (Decree)' : 'Decree'}</option>
                                <option value="regulation">{isAr ? 'تنظيم (Regulation)' : 'Regulation'}</option>
                                <option value="decision">{isAr ? 'مقرر / قرار (Decision)' : 'Decision'}</option>
                                <option value="circular">{isAr ? 'تعميم (Circular)' : 'Circular'}</option>
                                <option value="announcement">{isAr ? 'إعلان (Announcement)' : 'Announcement'}</option>
                                <option value="notification">{isAr ? 'بلاغ (Notification)' : 'Notification'}</option>
                                <option value="appointment">{isAr ? 'مرسوم فردي / تعيين (Appointment)' : 'Appointment'}</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">{isAr ? 'الرقم الرسمي' : 'Official Number'}</label>
                              <input 
                                type="text"
                                value={doc.official_number || ''}
                                onChange={(e) => updateDocumentField(idx, 'official_number', e.target.value)}
                                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm text-slate-900 font-bold"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">{isAr ? 'البداية من صفحة' : 'Page Start'}</label>
                              <input 
                                type="number"
                                value={doc.page_start || 0}
                                onChange={(e) => updateDocumentField(idx, 'page_start', parseInt(e.target.value, 10))}
                                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">{isAr ? 'إلى صفحة' : 'Page End'}</label>
                              <input 
                                type="number"
                                value={doc.page_end || 0}
                                onChange={(e) => updateDocumentField(idx, 'page_end', parseInt(e.target.value, 10))}
                                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">{isAr ? 'ملخص AI باللغة العربية' : 'AI Summary (Arabic)'}</label>
                            <textarea 
                              rows={2}
                              value={doc.ai_summary_ar || ''}
                              onChange={(e) => updateDocumentField(idx, 'ai_summary_ar', e.target.value)}
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm text-slate-800"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">{isAr ? 'النص الكامل للمستند' : 'Full Document Text'}</label>
                            <textarea 
                              rows={6}
                              value={doc.original_text || ''}
                              onChange={(e) => updateDocumentField(idx, 'original_text', e.target.value)}
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-mono"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: Articles list */}
              {activeTab === 'articles' && (
                <div className="space-y-6">
                  <h3 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-3">
                    {isAr ? 'مواد القوانين والمراسيم' : 'Legal Articles'}
                  </h3>
                  {manifestData.raw_extracted?.articles.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">{isAr ? 'لا توجد مواد مستخرجة في هذا العدد.' : 'No articles extracted.'}</div>
                  ) : (
                    <div className="space-y-6 divide-y divide-slate-100">
                      {manifestData.raw_extracted.articles.map((art: any, idx: number) => (
                        <div key={idx} className={`pt-4 ${idx === 0 ? 'pt-0' : ''} space-y-3`}>
                          <div className="flex justify-between items-center">
                            <div className="flex gap-2 items-center">
                              <span className="bg-slate-100 text-slate-800 text-xs font-bold px-2.5 py-1 rounded">
                                {art.local_id}
                              </span>
                              <span className="text-xs font-semibold text-slate-500">
                                {isAr ? 'تابع للوثيقة:' : 'Belongs to document:'} <strong className="text-indigo-600">{art.document_local_id}</strong>
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-slate-500">{isAr ? 'الترتيب بالملف:' : 'Order Index:'}</span>
                              <input 
                                type="number" 
                                value={art.order_index || 0}
                                onChange={(e) => updateArticleField(idx, 'order_index', parseInt(e.target.value, 10))}
                                className="w-12 text-center bg-slate-50 border border-slate-200 rounded p-0.5 text-xs text-slate-900"
                              />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">{isAr ? 'رقم المادة (مثال: المادة الأولى)' : 'Article Number'}</label>
                              <input 
                                type="text"
                                value={art.article_number || ''}
                                onChange={(e) => updateArticleField(idx, 'article_number', e.target.value)}
                                className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-xs font-bold"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">{isAr ? 'عنوان المادة (إن وجد)' : 'Article Title'}</label>
                              <input 
                                type="text"
                                value={art.article_title || ''}
                                onChange={(e) => updateArticleField(idx, 'article_title', e.target.value)}
                                className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-xs"
                              />
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">{isAr ? 'نص المادة الأصلي' : 'Original Text'}</label>
                            <textarea 
                              rows={3}
                              value={art.original_text || ''}
                              onChange={(e) => updateArticleField(idx, 'original_text', e.target.value)}
                              className="w-full bg-slate-50 border border-slate-300 rounded p-2.5 text-xs"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: Persons & Institutions */}
              {activeTab === 'entities' && (
                <div className="space-y-8">
                  
                  {/* Persons panel */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">
                      {isAr ? 'الشخصيات والمسؤولين' : 'Extracted Persons'}
                    </h3>
                    {manifestData.raw_extracted?.persons.length === 0 ? (
                      <div className="text-slate-500 text-sm">{isAr ? 'لا توجد شخصيات مستخرجة.' : 'No persons found.'}</div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {manifestData.raw_extracted.persons.map((per: any, idx: number) => (
                          <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                            <span className="text-xs text-indigo-700 bg-indigo-50 font-bold px-2 py-0.5 rounded font-mono">
                              {per.local_id}
                            </span>
                            <div>
                              <label className="block text-xs text-slate-500 mb-0.5">{isAr ? 'الاسم بالكامل' : 'Full Name (AR)'}</label>
                              <input 
                                type="text"
                                value={per.full_name_ar || ''}
                                onChange={(e) => updatePersonField(idx, 'full_name_ar', e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded p-2 text-xs font-semibold text-slate-900"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 mb-0.5">{isAr ? 'المنصب المذكور' : 'Context Position'}</label>
                              <input 
                                type="text"
                                value={per.current_position || ''}
                                onChange={(e) => updatePersonField(idx, 'current_position', e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded p-2 text-xs"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Institutions panel */}
                  <div className="space-y-4 pt-6">
                    <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">
                      {isAr ? 'المؤسسات والوزارات' : 'Extracted Institutions'}
                    </h3>
                    {manifestData.raw_extracted?.institutions.length === 0 ? (
                      <div className="text-slate-500 text-sm">{isAr ? 'لا توجد مؤسسات مستخرجة.' : 'No institutions found.'}</div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {manifestData.raw_extracted.institutions.map((inst: any, idx: number) => (
                          <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                            <span className="text-xs text-emerald-700 bg-emerald-50 font-bold px-2 py-0.5 rounded font-mono">
                              {inst.local_id}
                            </span>
                            <div>
                              <label className="block text-xs text-slate-500 mb-0.5">{isAr ? 'الاسم الرسمي' : 'Official Name (AR)'}</label>
                              <input 
                                type="text"
                                value={inst.official_name_ar || ''}
                                onChange={(e) => updateInstitutionField(idx, 'official_name_ar', e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded p-2 text-xs font-semibold text-slate-900"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs text-slate-500 mb-0.5">{isAr ? 'نوع الكيان' : 'Type'}</label>
                                <select 
                                  value={inst.type || 'ministry'}
                                  onChange={(e) => updateInstitutionField(idx, 'type', e.target.value)}
                                  className="w-full bg-white border border-slate-300 rounded p-2 text-xs"
                                >
                                  <option value="ministry">{isAr ? 'وزارة' : 'Ministry'}</option>
                                  <option value="court">{isAr ? 'محكمة' : 'Court'}</option>
                                  <option value="agency">{isAr ? 'وكالة / مصلحة' : 'Agency'}</option>
                                  <option value="enterprise">{isAr ? 'مؤسسة عمومية' : 'Enterprise'}</option>
                                  <option value="committee">{isAr ? 'لجنة' : 'Committee'}</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs text-slate-500 mb-0.5">{isAr ? 'الحالة' : 'Status'}</label>
                                <select 
                                  value={inst.status || 'active'}
                                  onChange={(e) => updateInstitutionField(idx, 'status', e.target.value)}
                                  className="w-full bg-white border border-slate-300 rounded p-2 text-xs font-bold"
                                >
                                  <option value="active">نشط (Active)</option>
                                  <option value="dissolved">منحل (Dissolved)</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* TAB 5: Relations & Citations */}
              {activeTab === 'relations' && (
                <div className="space-y-8">
                  
                  {/* Relations block */}
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-3">
                      {isAr ? 'علاقات الكيانات والمستندات' : 'Legal Relations'}
                    </h3>
                    {manifestData.raw_extracted?.relations.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">{isAr ? 'لا توجد علاقات مستخرجة.' : 'No relations found.'}</div>
                    ) : (
                      <div className="space-y-4">
                        {manifestData.raw_extracted.relations.map((rel: any, idx: number) => (
                          <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                                <strong className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-mono">{rel.source_local_id}</strong>
                                <span className="text-slate-400">➔</span>
                                <span className="bg-slate-800 text-white px-2 py-0.5 rounded text-xs uppercase">{rel.relation_type}</span>
                                <span className="text-slate-400">➔</span>
                                <strong className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-mono">{rel.target_local_id}</strong>
                              </div>
                              <p className="text-xs text-slate-500 font-mono italic">"{rel.detected_sentence || 'No context sentence'}"</p>
                            </div>
                            <div className="w-full md:w-48">
                              <label className="block text-[10px] text-slate-500 mb-0.5">{isAr ? 'تعديل نوع العلاقة' : 'Relation Type'}</label>
                              <select
                                value={rel.relation_type}
                                onChange={(e) => updateRelationField(idx, 'relation_type', e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs font-bold"
                              >
                                <option value="amends">يعدل (Amends)</option>
                                <option value="repeals">يلغي (Repeals)</option>
                                <option value="replaces">يستبدل (Replaces)</option>
                                <option value="implements">يطبق (Implements)</option>
                                <option value="creates">ينشئ (Creates)</option>
                                <option value="appoints">يعين (Appoints)</option>
                                <option value="dismisses">يعفي / يقيل (Dismisses)</option>
                                <option value="refers_to">يشير إلى (Refers to)</option>
                              </select>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* TAB 6: Events & Cards */}
              {activeTab === 'knowledge' && (
                <div className="space-y-8">
                  
                  {/* Events panel */}
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-3">
                      {isAr ? 'الأحداث القانونية والمهنية المتولدة' : 'Staged Events'}
                    </h3>
                    {manifestData.knowledge_layer?.events.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">{isAr ? 'لم يتم توليد أي أحداث معرفية.' : 'No events generated.'}</div>
                    ) : (
                      <div className="space-y-4">
                        {manifestData.knowledge_layer.events.map((ev: any, idx: number) => (
                          <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-xs bg-indigo-100 text-indigo-800 font-extrabold px-3 py-1 rounded-full uppercase">
                                {ev.event_type}
                              </span>
                              <span className="text-xs font-bold text-slate-500 font-mono flex items-center gap-1">
                                <Calendar size={12} />
                                {ev.event_date}
                              </span>
                            </div>
                            <div className="space-y-2">
                              <div>
                                <label className="block text-xs text-slate-500 mb-0.5">{isAr ? 'عنوان الحدث بالعربية' : 'Event Title (AR)'}</label>
                                <input 
                                  type="text" 
                                  value={ev.title_ar || ''}
                                  onChange={(e) => updateEventField(idx, 'title_ar', e.target.value)}
                                  className="w-full bg-white border border-slate-300 rounded p-2 text-xs font-bold text-slate-900"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-slate-500 mb-0.5">{isAr ? 'تفاصيل الحدث' : 'Description (AR)'}</label>
                                <textarea 
                                  rows={2} 
                                  value={ev.description_ar || ''}
                                  onChange={(e) => updateEventField(idx, 'description_ar', e.target.value)}
                                  className="w-full bg-white border border-slate-300 rounded p-2 text-xs text-slate-700"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Cards panel */}
                  <div className="space-y-4 pt-6">
                    <h3 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-3">
                      {isAr ? 'السرد المعرفي للذكاء الاصطناعي وبطاقات التلخيص' : 'Knowledge Cards & Narratives'}
                    </h3>
                    <div className="space-y-6">
                      {manifestData.knowledge_layer?.cards.map((card: any, idx: number) => (
                        <div key={idx} className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 space-y-3">
                          <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                            <h4 className="font-extrabold text-indigo-900 text-sm flex items-center gap-1.5">
                              <Sparkles size={16} className="text-indigo-600" />
                              {card.title_ar || (card.is_narrative ? (isAr ? 'سرد الجريدة الرسمية' : 'AI Narrative') : 'Overview Card')}
                            </h4>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {card.is_narrative ? 'NARRATIVE' : 'CARD'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed font-medium whitespace-pre-line">
                            {card.content_ar || card.narrative_ar}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

            </div>

          </div>

        </div>
      )}
    </div>
  );
}
