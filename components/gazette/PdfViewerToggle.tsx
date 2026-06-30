'use client';

import { useState } from 'react';
import { FileText, ArrowLeft, ArrowRight, X, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function PdfViewerToggle({ pdfUrl, isAr, pageStart }: { pdfUrl: string, isAr: boolean, pageStart?: number | null }) {
  const [isOpen, setIsOpen] = useState(false);

  // Construct URL with page number if available
  const finalPdfUrl = pageStart ? `${pdfUrl}#page=${pageStart}&toolbar=0&navpanes=0` : `${pdfUrl}#toolbar=0&navpanes=0`;
  const externalPdfUrl = pageStart ? `${pdfUrl}#page=${pageStart}` : pdfUrl;

  if (!isOpen) {
    return (
      <div className="flex justify-center mt-12 mb-10">
        <button 
          onClick={() => setIsOpen(true)}
          className="group bg-gradient-to-r from-brand-green to-brand-green/90 hover:from-brand-green hover:to-brand-green text-white font-bold py-4 px-10 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center gap-3 text-lg"
        >
          <FileText className="w-6 h-6" />
          {isAr ? 'عرض النص الكامل في الجريدة (PDF)' : 'Voir le texte intégral (PDF)'}
          {isAr ? <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" /> : <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-12 mb-10 border border-slate-200 rounded-3xl overflow-hidden shadow-2xl bg-white animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex flex-wrap gap-4 justify-between items-center">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <FileText className="w-5 h-5 text-brand-green" />
          {isAr ? 'معاينة الجريدة الرسمية' : 'Aperçu du Journal Officiel'}
        </h3>
        <div className="flex items-center gap-4">
          <Link href={externalPdfUrl} target="_blank" className="flex items-center gap-1.5 text-sm font-semibold text-brand-green hover:text-brand-green/80 transition-colors">
            {isAr ? 'فتح في علامة تبويب جديدة' : 'Ouvrir dans un nouvel onglet'}
            <ExternalLink className="w-4 h-4" />
          </Link>
          <button 
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 rounded-full bg-slate-200 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-colors text-slate-500"
            title={isAr ? "إغلاق" : "Fermer"}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div className="h-[80vh] w-full bg-slate-100 flex items-center justify-center">
        <iframe 
          src={finalPdfUrl} 
          className="w-full h-full border-none" 
          title="PDF Viewer"
        />
      </div>
    </div>
  );
}
