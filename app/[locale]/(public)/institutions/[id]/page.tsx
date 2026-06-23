import { Building2, Users, FileText, Clock, BarChart3, Network, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

// Mock data to visualize the design before DB seed
const MOCK_INSTITUTION = {
  id: 'inst1',
  name_ar: 'وزارة الداخلية واللامركزية',
  name_fr: 'Ministère de l\'Intérieur et de la Décentralisation',
  description_ar: 'القطاع الحكومي المسؤول عن الإدارة الإقليمية، الأمن الداخلي، وتنسيق اللامركزية.',
  description_fr: 'Département gouvernemental responsable de l\'administration territoriale, de la sécurité intérieure et de la décentralisation.',
  category: 'ministry',
  stats: {
    totalDocuments: 1240,
    activeOfficials: 45,
    recentAppointments: 12
  },
  currentOfficials: [
    { id: 'p1', name: 'محمد أحمد ولد محمد الأمين', role: 'الوزير', date: '2022-03-31' },
    { id: 'p2', name: 'محفوظ ولد إبراهيم', role: 'الأمين العام', date: '2023-01-15' }
  ],
  timeline: [
    { id: 't1', date: '2022-03-31', type: 'appointment', title: 'تعيين وزير الداخلية', person: 'محمد أحمد', docNumber: '2022-040' },
    { id: 't2', date: '2020-08-09', type: 'decree', title: 'مرسوم تنظيم الوزارة', docNumber: '2020-104' },
    { id: 't3', date: '2019-08-08', type: 'appointment', title: 'تعيين وزير الداخلية السابق', person: 'محمد سالم', docNumber: '2019-030' }
  ],
  relationships: [
    { id: 'r1', target: 'الوكالة الوطنية لسجل السكان', type: 'supervises', label: 'وصاية على' },
    { id: 'r2', target: 'التجمع العام لأمن الطرق', type: 'supervises', label: 'وصاية على' }
  ]
};

export default async function InstitutionProfilePage({ params }: { params: Promise<{ id: string, locale: string }> }) {
  const { locale, id } = await params;
  const isAr = locale === 'ar';
  
  const inst = MOCK_INSTITUTION;
  const name = isAr ? inst.name_ar : inst.name_fr;
  const description = isAr ? inst.description_ar : inst.description_fr;

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      {/* Back Button */}
      <div className="mb-8">
        <Link href={`/${locale}/institutions`} className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
          {isAr ? <ChevronRight className="ml-1 w-4 h-4" /> : <ChevronLeft className="mr-1 w-4 h-4" />}
          {isAr ? 'العودة إلى القائمة' : 'Back to list'}
        </Link>
      </div>

      {/* Header Profile Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-10">
        <div className="h-32 bg-gradient-to-r from-slate-100 to-slate-200 flex items-center justify-center border-b border-gray-100">
          {/* Subtle background pattern or logo placeholder could go here */}
          <Building2 className="w-24 h-24 text-slate-300 opacity-50 absolute right-12" />
        </div>
        <div className="px-8 pb-8 pt-6">
          <div className="flex justify-between items-start">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 mb-3">
                 <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wider">
                  {isAr ? 'وزارة' : 'Ministry'}
                </span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{name}</h1>
              <p className="text-lg text-gray-600 leading-relaxed">
                {description}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center">
          <div className="p-3 bg-blue-50 rounded-xl mr-4">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">{isAr ? 'إجمالي الوثائق' : 'Total Documents'}</p>
            <p className="text-2xl font-bold text-gray-900">{inst.stats.totalDocuments}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center">
          <div className="p-3 bg-emerald-50 rounded-xl mr-4">
            <Users className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">{isAr ? 'المسؤولون الحاليون' : 'Active Officials'}</p>
            <p className="text-2xl font-bold text-gray-900">{inst.stats.activeOfficials}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center">
          <div className="p-3 bg-purple-50 rounded-xl mr-4">
            <BarChart3 className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">{isAr ? 'التعيينات الأخيرة' : 'Recent Appointments'}</p>
            <p className="text-2xl font-bold text-gray-900">{inst.stats.recentAppointments}</p>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column (Timeline & Docs) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Current Officials */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
             <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
              <div className="flex items-center">
                <Users className={`${isAr ? 'ml-3' : 'mr-3'} w-6 h-6 text-emerald-600`} />
                <h2 className="text-xl font-bold text-gray-900">{isAr ? 'الهيكل القيادي الحالي' : 'Current Leadership'}</h2>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {inst.currentOfficials.map(official => (
                <div key={official.id} className="p-4 border border-gray-100 rounded-xl bg-gray-50 hover:bg-white hover:shadow-sm transition-all">
                  <p className="text-xs text-gray-500 mb-1">{official.role}</p>
                  <Link href={`/${locale}/persons/${official.id}`} className="font-semibold text-gray-900 hover:text-indigo-600">
                    {official.name}
                  </Link>
                  <p className="text-xs text-gray-400 mt-2">
                    {isAr ? 'منذ' : 'Since'} {new Date(official.date).toLocaleDateString(isAr ? 'ar-MR' : 'fr-FR')}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Timeline Section */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center mb-6 border-b border-gray-100 pb-4">
              <Clock className={`${isAr ? 'ml-3' : 'mr-3'} w-6 h-6 text-indigo-600`} />
              <h2 className="text-xl font-bold text-gray-900">{isAr ? 'السجل التاريخي' : 'Timeline'}</h2>
            </div>
            
            <div className="relative border-l-2 border-gray-100 ms-3">
              {inst.timeline.map((event, idx) => (
                <div key={event.id} className="mb-8 ms-6 relative">
                  <span className="absolute flex items-center justify-center w-6 h-6 bg-white rounded-full -start-9 ring-4 ring-white border border-indigo-200">
                    <div className={`w-2 h-2 rounded-full ${event.type === 'decree' ? 'bg-rose-500' : 'bg-indigo-600'}`}></div>
                  </span>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {event.title}
                      {event.person && <span className="font-normal text-gray-600 mx-1">({event.person})</span>}
                    </h3>
                    <time className="block mb-2 text-sm font-normal leading-none text-gray-400 sm:mb-0">
                      {new Date(event.date).toLocaleDateString(isAr ? 'ar-MR' : 'fr-FR')}
                    </time>
                  </div>
                  <p className="mb-2 text-sm font-normal text-gray-500">
                    {isAr ? 'مرجع: المرسوم' : 'Ref: Decree'} 
                    <Link href={`/${locale}/documents/${event.docNumber}`} className="font-medium text-indigo-600 hover:underline mx-1">
                      {event.docNumber}
                    </Link>
                  </p>
                </div>
              ))}
            </div>
          </section>

        </div>

        {/* Right Column (Relations & Meta) */}
        <div className="space-y-8">
          
          {/* Relationships */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-6">
              <Network className={`${isAr ? 'ml-3' : 'mr-3'} w-5 h-5 text-gray-600`} />
              <h2 className="text-lg font-bold text-gray-900">{isAr ? 'الهيكلة والارتباطات' : 'Relationships'}</h2>
            </div>
            <ul className="space-y-4">
              {inst.relationships.map(rel => (
                <li key={rel.id} className="flex flex-col p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-xs text-indigo-600 font-medium mb-1">{rel.label}</span>
                  <span className="font-semibold text-gray-900">{rel.target}</span>
                </li>
              ))}
            </ul>
          </section>

        </div>
      </div>
    </div>
  );
}
