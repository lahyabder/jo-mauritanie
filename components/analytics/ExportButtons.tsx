'use client';

import { Download, FileText, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export function ExportButtons({ 
  data, 
  filename, 
  pdfTargetId,
  isAr
}: { 
  data: any[], 
  filename: string, 
  pdfTargetId?: string,
  isAr: boolean
}) {
  
  const handleExportCSV = () => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
  };

  const handleExportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  };

  const handleExportPDF = async () => {
    if (!pdfTargetId) return;
    const element = document.getElementById(pdfTargetId);
    if (!element) return;

    // Temporarily hide export buttons during capture
    const buttons = document.getElementById('export-buttons-container');
    if (buttons) buttons.style.display = 'none';

    try {
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${filename}.pdf`);
    } finally {
      if (buttons) buttons.style.display = 'flex';
    }
  };

  return (
    <div id="export-buttons-container" className="flex items-center gap-2">
      <button 
        onClick={handleExportCSV}
        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <FileText className={`${isAr ? 'ml-1.5' : 'mr-1.5'} w-4 h-4`} />
        CSV
      </button>
      <button 
        onClick={handleExportExcel}
        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        <FileSpreadsheet className={`${isAr ? 'ml-1.5' : 'mr-1.5'} w-4 h-4 text-emerald-600`} />
        Excel
      </button>
      {pdfTargetId && (
        <button 
          onClick={handleExportPDF}
          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <Download className={`${isAr ? 'ml-1.5' : 'mr-1.5'} w-4 h-4 text-red-500`} />
          PDF Report
        </button>
      )}
    </div>
  );
}
