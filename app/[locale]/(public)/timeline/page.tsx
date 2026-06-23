'use client';

import { useState, use, useEffect } from 'react';
import { History, Download, Image as ImageIcon, Filter, Calendar, Briefcase, FileText, Sparkles, AlertCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { createClient } from '@/utils/supabase/client';

export default function TimelinePage({ params }: { params: Promise<{ locale: string }> }) {
  const resolvedParams = use(params);
  const isAr = resolvedParams.locale === 'ar';
  const [filter, setFilter] = useState('all');
  const [events, setEvents] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    async function fetchEvents() {
      const { data } = await supabase
        .from('timeline_events')
        .select('*')
        .order('date', { ascending: false });
      if (data) setEvents(data);
    }
    fetchEvents();
  }, []);

  const filteredEvents = filter === 'all' ? events : events.filter(e => e.type.includes(filter) || (e.entity && e.entity.includes(filter)));

  const exportPDF = async () => {
    const element = document.getElementById('timeline-container');
    if (!element) return;
    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save('legal-timeline.pdf');
  };

  const exportImage = async () => {
    const element = document.getElementById('timeline-container');
    if (!element) return;
    const canvas = await html2canvas(element, { scale: 2 });
    const link = document.createElement('a');
    link.download = 'legal-timeline.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 sm:px-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <History className={`w-8 h-8 text-indigo-600 ${isAr ? 'ml-3' : 'mr-3'}`} />
            {isAr ? 'محرك الجداول الزمنية التفاعلية' : 'Interactive Timelines Engine'}
          </h1>
          <p className="mt-2 text-gray-500 max-w-2xl">
            {isAr ? 'تتبع مسار القوانين، الشخصيات، والمؤسسات عبر التاريخ من خلال تسلسل زمني دقيق مستخرج من الجريدة الرسمية.' : 'Track the evolution of laws, persons, and institutions through an accurate timeline extracted from the Official Gazette.'}
          </p>
        </div>
        
        <div className="flex gap-2 shrink-0">
          <button onClick={exportImage} className="inline-flex items-center px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 text-sm font-medium transition-colors">
            <ImageIcon className="w-4 h-4 mr-2 ml-2 text-gray-500" />
            {isAr ? 'تصدير كصورة' : 'Export Image'}
          </button>
          <button onClick={exportPDF} className="inline-flex items-center px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 text-sm font-medium transition-colors">
            <Download className="w-4 h-4 mr-2 ml-2" />
            PDF
          </button>
        </div>
      </div>

      {/* AI Summary Banner */}
      {events.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-6 mb-8 flex items-start gap-4 shadow-sm">
          <Sparkles className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-bold text-indigo-900 mb-2">{isAr ? 'الملخص الذكي للخط الزمني' : 'AI Timeline Summary'}</h3>
            <p className="text-sm text-indigo-800 leading-relaxed">
              {isAr 
                ? 'يُظهر الخط الزمني أن وزارة الداخلية شهدت نشاطاً تشريعياً مكثفاً منذ عام 2020، بدأ بتعيين الوزير الحالي، تلاه إصدار قانون الجمعيات في 2021. ورغم نقل بعض الصلاحيات في 2022، استمر تعديل القوانين المرتبطة بها لتسهيل الإجراءات.'
                : 'The timeline shows intense legislative activity for the Ministry of Interior since 2020. It began with the appointment of the current minister, followed by the Associations Law in 2021. Despite some transfers of power in 2022, associated laws were amended to ease procedures.'}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 mb-10 overflow-x-auto pb-2">
        <Filter className="w-5 h-5 text-gray-400 mr-2 ml-2 shrink-0" />
        {['all', 'appointment', 'law', 'repeal'].map((f) => (
          <button 
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filter === f ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {f === 'all' ? (isAr ? 'الكل' : 'All') : 
             f === 'appointment' ? (isAr ? 'تعيينات' : 'Appointments') : 
             f === 'law' ? (isAr ? 'قوانين ومراسيم' : 'Laws & Decrees') : 
             (isAr ? 'إلغاءات' : 'Repeals')}
          </button>
        ))}
      </div>

      {/* Vertical Timeline Container */}
      <div id="timeline-container" className="relative pl-4 sm:pl-0 bg-white p-4 rounded-xl">
        {/* Central Line */}
        <div className={`hidden sm:block absolute top-0 bottom-0 w-0.5 bg-gray-200 ${isAr ? 'right-1/2 translate-x-1/2' : 'left-1/2 -translate-x-1/2'}`}></div>
        
        {/* Mobile Line */}
        <div className={`sm:hidden absolute top-0 bottom-0 w-0.5 bg-gray-200 ${isAr ? 'right-4' : 'left-4'}`}></div>

        <div className="space-y-12">
          {filteredEvents.map((event, index) => {
            const isEven = index % 2 === 0;
            return (
              <div key={event.id} className="relative flex items-center justify-between sm:justify-center w-full">
                
                {/* Desktop Left Side / Right Side based on index */}
                <div className={`hidden sm:block w-5/12 ${isEven ? (isAr ? 'order-1 text-left' : 'order-1 text-right') : (isAr ? 'order-3 text-right' : 'order-3 text-left')}`}>
                  {isEven ? (
                    <div className="pr-8 rtl:pr-0 rtl:pl-8">
                       <span className="inline-block px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-semibold mb-2">{event.date}</span>
                       <h3 className="font-bold text-lg text-gray-900">{event.title}</h3>
                       <p className="text-sm text-gray-500 mt-1">{event.description}</p>
                    </div>
                  ) : (
                    <div className="pl-8 rtl:pl-0 rtl:pr-8">
                       <span className="inline-block px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-semibold mb-2">{event.date}</span>
                       <h3 className="font-bold text-lg text-gray-900">{event.title}</h3>
                       <p className="text-sm text-gray-500 mt-1">{event.description}</p>
                    </div>
                  )}
                </div>

                {/* Mobile View */}
                <div className={`sm:hidden w-full ${isAr ? 'pr-12' : 'pl-12'}`}>
                  <span className="inline-block px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-semibold mb-2">{event.date}</span>
                  <h3 className="font-bold text-lg text-gray-900">{event.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{event.description}</p>
                  
                  {/* Entity Badges for Mobile */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {event.entity && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700">
                        <Briefcase className="w-3 h-3 mr-1 ml-1" /> {event.entity}
                      </span>
                    )}
                    {event.reference_number && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200">
                        <FileText className="w-3 h-3 mr-1 ml-1" /> {event.reference_number}
                      </span>
                    )}
                  </div>
                </div>

                {/* Center Node */}
                <div className="absolute z-10 sm:static order-2 w-8 h-8 rounded-full border-4 border-white shadow-sm flex items-center justify-center shrink-0" style={{ right: isAr ? '-12px' : 'auto', left: isAr ? 'auto' : '-12px' }}>
                  <div className={`w-full h-full rounded-full ${event.color}`}></div>
                </div>

                {/* Desktop Badges (Opposite side) */}
                <div className={`hidden sm:block w-5/12 ${!isEven ? (isAr ? 'order-1 text-left' : 'order-1 text-right') : (isAr ? 'order-3 text-right' : 'order-3 text-left')}`}>
                  {isEven ? (
                    <div className="pl-8 rtl:pl-0 rtl:pr-8 flex flex-col items-start rtl:items-end gap-2 mt-4">
                      {event.entity && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700">
                          <Briefcase className="w-3 h-3 mr-1 ml-1" /> {event.entity}
                        </span>
                      )}
                      {event.reference_number && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200">
                          <FileText className="w-3 h-3 mr-1 ml-1" /> {event.reference_number}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="pr-8 rtl:pr-0 rtl:pl-8 flex flex-col items-end rtl:items-start gap-2 mt-4">
                      {event.entity && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700">
                          <Briefcase className="w-3 h-3 mr-1 ml-1" /> {event.entity}
                        </span>
                      )}
                      {event.reference_number && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200">
                          <FileText className="w-3 h-3 mr-1 ml-1" /> {event.reference_number}
                        </span>
                      )}
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      </div>
      
      {/* End Indicator */}
      <div className="flex justify-center mt-8">
        <div className="w-3 h-3 rounded-full bg-gray-300"></div>
      </div>

    </div>
  );
}
