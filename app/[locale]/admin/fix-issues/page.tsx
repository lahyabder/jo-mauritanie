'use client';

import { use, useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { FileText, AlertCircle, Plus, X, Search, CheckCircle2, FileQuestion } from 'lucide-react';
import Link from 'next/link';

export default function FixIssuesPage({ params }: { params: Promise<{ locale: string }> }) {
  const resolvedParams = use(params);
  const { locale } = resolvedParams;
  const isAr = locale === 'ar';
  
  const supabase = createClient();
  
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<any>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    title_ar: '',
    title_fr: '',
    type: 'law',
    official_number: '',
    summary_ar: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const documentTypes = [
    { id: 'law', labelAr: 'قانون', labelFr: 'Loi' },
    { id: 'decree', labelAr: 'مرسوم', labelFr: 'Décret' },
    { id: 'decision', labelAr: 'مقرر', labelFr: 'Arrêté' },
    { id: 'regulation', labelAr: 'تنظيم/لائحة', labelFr: 'Règlement' },
    { id: 'circular', labelAr: 'تعميم', labelFr: 'Circulaire' },
    { id: 'announcement', labelAr: 'إعلان', labelFr: 'Annonce' },
    { id: 'notification', labelAr: 'بلاغ', labelFr: 'Avis' },
    { id: 'other', labelAr: 'أخرى', labelFr: 'Autre' },
  ];

  const fetchEmptyIssues = async () => {
    setLoading(true);
    // Fetch issues and count their documents
    const { data: allIssues, error } = await supabase
      .from('issues')
      .select('id, issue_number, publication_date, language, pdf_url, documents(id)');
      
    if (!error && allIssues) {
      // Filter issues that have exactly 0 documents
      const empty = allIssues.filter((issue: any) => !issue.documents || issue.documents.length === 0);
      // Sort by latest publication date
      empty.sort((a, b) => new Date(b.publication_date).getTime() - new Date(a.publication_date).getTime());
      setIssues(empty);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEmptyIssues();
  }, [supabase]);

  const openModal = (issue: any) => {
    setSelectedIssue(issue);
    setFormData({
      title_ar: '',
      title_fr: '',
      type: 'law',
      official_number: '',
      summary_ar: '',
    });
    setSuccessMsg('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedIssue(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue) return;
    
    setSubmitting(true);
    
    const { error } = await supabase.from('documents').insert({
      issue_id: selectedIssue.id,
      type: formData.type,
      title_ar: formData.title_ar || null,
      title_fr: formData.title_fr || null,
      official_number: formData.official_number || null,
      summary_ar: formData.summary_ar || null,
      document_date: selectedIssue.publication_date,
      original_language: selectedIssue.language || 'ar',
      status: 'active'
    });
    
    setSubmitting(false);
    
    if (error) {
      alert(isAr ? 'حدث خطأ أثناء الحفظ: ' + error.message : 'Erreur de sauvegarde: ' + error.message);
    } else {
      setSuccessMsg(isAr ? 'تمت إضافة الوثيقة بنجاح!' : 'Document ajouté avec succès!');
      setTimeout(() => {
        closeModal();
        // Remove this issue from the list since it's no longer empty
        setIssues(issues.filter(i => i.id !== selectedIssue.id));
      }, 1500);
    }
  };

  return (
    <div className="w-full" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AlertCircle className="text-amber-500" />
            {isAr ? 'إصلاح الأعداد الفارغة' : 'Réparer les numéros vides'}
          </h1>
          <p className="text-gray-500 mt-1">
            {isAr 
              ? 'الأعداد التاريخية التي لم يتمكن الذكاء الاصطناعي من استخراج نصوص منها بسبب رداءة الجودة.'
              : 'Numéros historiques dont l\'IA n\'a pas pu extraire de texte en raison de la mauvaise qualité.'}
          </p>
        </div>
        <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm font-bold text-gray-700">
          {issues.length} {isAr ? 'أعداد تتطلب التدخل' : 'numéros nécessitant une intervention'}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
          </div>
        ) : issues.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <CheckCircle2 className="w-16 h-16 text-emerald-400 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">{isAr ? 'كل شيء ممتاز!' : 'Tout est parfait !'}</h3>
            <p className="text-gray-500">{isAr ? 'لا توجد أي أعداد فارغة في قاعدة البيانات حالياً.' : 'Aucun numéro vide dans la base de données actuellement.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left rtl:text-right text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
                <tr>
                  <th scope="col" className="px-6 py-4">{isAr ? 'رقم العدد' : 'N°'}</th>
                  <th scope="col" className="px-6 py-4">{isAr ? 'تاريخ الإصدار' : 'Date'}</th>
                  <th scope="col" className="px-6 py-4">{isAr ? 'اللغة' : 'Langue'}</th>
                  <th scope="col" className="px-6 py-4">{isAr ? 'ملف الـ PDF' : 'Fichier PDF'}</th>
                  <th scope="col" className="px-6 py-4 text-center">{isAr ? 'الإجراء' : 'Action'}</th>
                </tr>
              </thead>
              <tbody>
                {issues.map((issue) => (
                  <tr key={issue.id} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-bold text-gray-900">
                      {issue.issue_number}
                    </td>
                    <td className="px-6 py-4">
                      {issue.publication_date}
                    </td>
                    <td className="px-6 py-4 uppercase font-semibold">
                      {issue.language}
                    </td>
                    <td className="px-6 py-4">
                      {issue.pdf_url ? (
                        <Link href={issue.pdf_url} target="_blank" className="text-blue-600 hover:underline flex items-center gap-1">
                          <FileText size={16} /> {isAr ? 'عرض الملف' : 'Voir le fichier'}
                        </Link>
                      ) : (
                        <span className="text-gray-400 flex items-center gap-1"><FileQuestion size={16}/> {isAr ? 'غير متوفر' : 'Indisponible'}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => openModal(issue)}
                        className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-black transition-colors shadow-sm"
                      >
                        <Plus size={16} />
                        {isAr ? 'إضافة وثيقة' : 'Ajouter un document'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Entry Modal */}
      {isModalOpen && selectedIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">
                {isAr ? `إضافة وثيقة يدوياً للعدد رقم ${selectedIssue.issue_number}` : `Ajout manuel - Numéro ${selectedIssue.issue_number}`}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-700 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              
              {selectedIssue.pdf_url && (
                <div className="mb-6 p-4 bg-blue-50 text-blue-800 rounded-xl flex items-start gap-3 border border-blue-100">
                  <FileText className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold text-sm mb-1">{isAr ? 'نصيحة للمساعدة:' : 'Astuce :'}</p>
                    <p className="text-sm">
                      {isAr ? 'قم بفتح ' : 'Ouvrez '}
                      <Link href={selectedIssue.pdf_url} target="_blank" className="underline font-bold text-blue-900">
                        {isAr ? 'ملف الـ PDF الأصلي في نافذة جديدة' : 'le fichier PDF original dans une nouvelle fenêtre'}
                      </Link>
                      {isAr ? ' واقرأ محتواه لتقوم بإدخال تفاصيل الوثيقة هنا.' : ' et lisez son contenu pour saisir les détails du document ici.'}
                    </p>
                  </div>
                </div>
              )}

              {successMsg ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4 animate-bounce" />
                  <h4 className="text-xl font-bold text-gray-900">{successMsg}</h4>
                </div>
              ) : (
                <form id="manual-doc-form" onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">{isAr ? 'نوع الوثيقة' : 'Type de document'} *</label>
                      <select 
                        required
                        value={formData.type}
                        onChange={(e) => setFormData({...formData, type: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      >
                        {documentTypes.map(t => (
                          <option key={t.id} value={t.id}>{isAr ? t.labelAr : t.labelFr}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">{isAr ? 'الرقم الرسمي (إن وجد)' : 'Numéro officiel (si dispo)'}</label>
                      <input 
                        type="text" 
                        value={formData.official_number}
                        onChange={(e) => setFormData({...formData, official_number: e.target.value})}
                        placeholder={isAr ? 'مثال: مرسوم رقم 59-001' : 'Ex: Décret N° 59-001'}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">{isAr ? 'العنوان باللغة العربية' : 'Titre en arabe'} *</label>
                    <textarea 
                      required={isAr || selectedIssue.language === 'ar'}
                      value={formData.title_ar}
                      onChange={(e) => setFormData({...formData, title_ar: e.target.value})}
                      rows={2}
                      dir="rtl"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
                      placeholder="أدخل عنوان الوثيقة كما هو مكتوب في الجريدة..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">{isAr ? 'العنوان باللغة الفرنسية (اختياري)' : 'Titre en français'} {(!isAr && selectedIssue.language === 'fr') && '*'}</label>
                    <textarea 
                      required={!isAr && selectedIssue.language === 'fr'}
                      value={formData.title_fr}
                      onChange={(e) => setFormData({...formData, title_fr: e.target.value})}
                      rows={2}
                      dir="ltr"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
                      placeholder="Saisissez le titre du document..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">{isAr ? 'ملخص الوثيقة' : 'Résumé'}</label>
                    <textarea 
                      value={formData.summary_ar}
                      onChange={(e) => setFormData({...formData, summary_ar: e.target.value})}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
                      placeholder={isAr ? "اكتب ملخصاً قصيراً أو انسخ الفقرة الأولى من الوثيقة..." : "Rédigez un court résumé..."}
                    />
                  </div>
                </form>
              )}
            </div>
            
            {!successMsg && (
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={closeModal}
                  className="px-5 py-2.5 text-gray-700 font-bold hover:bg-gray-200 rounded-lg transition-colors"
                >
                  {isAr ? 'إلغاء' : 'Annuler'}
                </button>
                <button 
                  type="submit" 
                  form="manual-doc-form"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting && <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>}
                  {isAr ? 'حفظ ونشر الوثيقة' : 'Enregistrer et publier'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
