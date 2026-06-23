import { UserCircle2, Briefcase, Award, FileText, Building2, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

// Mock data to visualize the design before DB seed
const MOCK_PERSON = {
  id: '1',
  name_ar: 'محمد ولد الشيخ الغزواني',
  name_fr: 'Mohamed Ould Cheikh El Ghazouani',
  currentPosition_ar: 'رئيس الجمهورية',
  currentPosition_fr: 'Président de la République',
  institutions: [
    { id: 'inst1', name: 'رئاسة الجمهورية', role: 'الرئيس', startYear: '2019', endYear: 'الحاضر' }
  ],
  timeline: [
    { id: 't1', date: '2019-08-01', type: 'nomination', title: 'تنصيب رئيس الجمهورية', docId: 'doc1', docNumber: '2019-001' },
    { id: 't2', date: '2018-10-31', type: 'nomination', title: 'وزير الدفاع الوطني', docId: 'doc2', docNumber: '2018-144' },
    { id: 't3', date: '2013-02-28', type: 'promotion', title: 'ترقية إلى رتبة فريق أول', docId: 'doc3', docNumber: '2013-055' }
  ],
  decorations: [
    { id: 'd1', date: '2020-11-28', title: 'الوسام الوطني للاستحقاق', docNumber: '2020-090' }
  ],
  mentions: 42
};

export default async function PersonProfilePage({ params }: { params: Promise<{ id: string, locale: string }> }) {
  const { locale, id } = await params;
  const isAr = locale === 'ar';
  
  // In production, fetch from Supabase:
  // const person = await supabase.from('persons').select('*').eq('id', id).single()
  const person = MOCK_PERSON;

  const name = isAr ? person.name_ar : person.name_fr;
  const position = isAr ? person.currentPosition_ar : person.currentPosition_fr;

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      {/* Back Button */}
      <div className="mb-8">
        <Link href={`/${locale}/persons`} className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
          {isAr ? <ChevronRight className="ml-1 w-4 h-4" /> : <ChevronLeft className="mr-1 w-4 h-4" />}
          {isAr ? 'العودة إلى القائمة' : 'Back to list'}
        </Link>
      </div>

      {/* Header Profile Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-10">
        <div className="h-32 bg-gradient-to-r from-slate-800 to-slate-700"></div>
        <div className="px-8 pb-8">
          <div className="relative flex justify-between items-end -mt-16 mb-6">
            <div className="w-32 h-32 bg-white rounded-xl shadow-md p-1 flex items-center justify-center border border-gray-100">
              <div className="w-full h-full bg-slate-50 rounded-lg flex items-center justify-center text-slate-300">
                <UserCircle2 size={80} strokeWidth={1} />
              </div>
            </div>
            <div className="flex gap-3">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-50 text-green-700 border border-green-200">
                {isAr ? 'نشط' : 'Active'}
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200">
                {person.mentions} {isAr ? 'ذكر في الجريدة' : 'Mentions'}
              </span>
            </div>
          </div>
          
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{name}</h1>
            <p className="mt-2 text-xl text-gray-600 flex items-center">
              <Briefcase className={`${isAr ? 'ml-2' : 'mr-2'} w-5 h-5 text-gray-400`} />
              {position}
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column (Timeline) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Timeline Section */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center mb-6 border-b border-gray-100 pb-4">
              <Calendar className={`${isAr ? 'ml-3' : 'mr-3'} w-6 h-6 text-indigo-600`} />
              <h2 className="text-xl font-bold text-gray-900">{isAr ? 'السجل التاريخي (التعيينات والإعفاءات)' : 'Timeline & Appointments'}</h2>
            </div>
            
            <div className="relative border-l-2 border-gray-100 ms-3">
              {person.timeline.map((event, idx) => (
                <div key={event.id} className="mb-8 ms-6 relative">
                  <span className="absolute flex items-center justify-center w-6 h-6 bg-white rounded-full -start-9 ring-4 ring-white border border-indigo-200">
                    <div className={`w-2 h-2 rounded-full ${event.type === 'promotion' ? 'bg-amber-500' : 'bg-indigo-600'}`}></div>
                  </span>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1">
                    <h3 className="text-lg font-semibold text-gray-900">{event.title}</h3>
                    <time className="block mb-2 text-sm font-normal leading-none text-gray-400 sm:mb-0">
                      {new Date(event.date).toLocaleDateString(isAr ? 'ar-MR' : 'fr-FR')}
                    </time>
                  </div>
                  <p className="mb-2 text-sm font-normal text-gray-500">
                    {isAr ? 'تم النشر في الجريدة الرسمية رقم' : 'Published in Official Gazette N°'} 
                    <Link href={`/${locale}/documents/${event.docId}`} className="font-medium text-indigo-600 hover:underline mx-1">
                      {event.docNumber}
                    </Link>
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Related Documents Section */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
             <div className="flex items-center mb-6 border-b border-gray-100 pb-4">
              <FileText className={`${isAr ? 'ml-3' : 'mr-3'} w-6 h-6 text-slate-600`} />
              <h2 className="text-xl font-bold text-gray-900">{isAr ? 'الوثائق المرتبطة' : 'Related Documents'}</h2>
            </div>
            <p className="text-gray-500 text-sm">
              {isAr ? `تم ذكر هذا الشخص في ${person.mentions} وثيقة.` : `This person is mentioned in ${person.mentions} documents.`}
            </p>
            {/* Table would go here */}
          </section>
        </div>

        {/* Right Column (Institutions & Decorations) */}
        <div className="space-y-8">
          
          {/* Institution History */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-6">
              <Building2 className={`${isAr ? 'ml-3' : 'mr-3'} w-5 h-5 text-gray-600`} />
              <h2 className="text-lg font-bold text-gray-900">{isAr ? 'الارتباط المؤسسي' : 'Institution History'}</h2>
            </div>
            <ul className="space-y-4">
              {person.institutions.map(inst => (
                <li key={inst.id} className="flex flex-col p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="font-semibold text-gray-900">{inst.name}</span>
                  <span className="text-sm text-gray-600 mt-1">{inst.role}</span>
                  <span className="text-xs text-gray-400 mt-2">{inst.startYear} - {inst.endYear}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Decorations */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-6">
              <Award className={`${isAr ? 'ml-3' : 'mr-3'} w-5 h-5 text-amber-500`} />
              <h2 className="text-lg font-bold text-gray-900">{isAr ? 'الأوسمة والتكريمات' : 'Decorations'}</h2>
            </div>
            <ul className="space-y-4">
              {person.decorations.map(dec => (
                <li key={dec.id} className="flex flex-col">
                  <span className="font-medium text-gray-900">{dec.title}</span>
                  <span className="text-xs text-gray-500 mt-1">{new Date(dec.date).getFullYear()} — {isAr ? 'مرسوم' : 'Décret'} {dec.docNumber}</span>
                </li>
              ))}
            </ul>
          </section>

        </div>
      </div>
    </div>
  );
}
