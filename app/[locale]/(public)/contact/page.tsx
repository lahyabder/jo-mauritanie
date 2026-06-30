import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { Mail, MapPin, Phone } from 'lucide-react';

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isAr = locale === 'ar';

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6">
      <Breadcrumbs items={[{ label: isAr ? 'اتصل بنا' : 'Nous Contacter' }]} />
      
      <div className="mt-6">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
            {isAr ? 'تواصل معنا' : 'Contactez-nous'}
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            {isAr 
              ? 'يسعدنا تواصلكم معنا لأي استفسارات أو ملاحظات حول منصة الجريدة الرسمية. نحن هنا لخدمتكم.' 
              : 'Nous sommes ravis de recevoir vos questions ou commentaires sur la plateforme du Journal Officiel. Nous sommes là pour vous servir.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Contact Info Cards */}
          <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center hover:shadow-md transition-shadow">
            <div className="w-14 h-14 bg-brand-green/10 text-brand-green rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{isAr ? 'البريد الإلكتروني' : 'Email'}</h3>
            <p className="text-gray-600 mb-4">{isAr ? 'للتواصل الإلكتروني السريع:' : 'Pour une communication rapide:'}</p>
            <a href="mailto:contact@afrikyia.com" className="text-brand-green font-semibold hover:underline">contact@afrikyia.com</a>
          </div>

          <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center hover:shadow-md transition-shadow">
            <div className="w-14 h-14 bg-brand-yellow/20 text-brand-yellow rounded-full flex items-center justify-center mx-auto mb-4">
              <Phone className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{isAr ? 'الهاتف' : 'Téléphone'}</h3>
            <p className="text-gray-600 mb-4">{isAr ? 'نستقبل مكالماتكم خلال أوقات العمل الرسمية:' : 'Nous recevons vos appels pendant les heures de bureau:'}</p>
            <a href="tel:+22200000000" className="text-brand-yellow font-semibold hover:underline" dir="ltr">+222 00 00 00 00</a>
          </div>

          <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center hover:shadow-md transition-shadow">
            <div className="w-14 h-14 bg-brand-red/10 text-brand-red rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{isAr ? 'العنوان' : 'Adresse'}</h3>
            <p className="text-gray-600 mb-4">{isAr ? 'نرحب بزيارتكم في مكاتبنا:' : 'Nous vous accueillons dans nos bureaux:'}</p>
            <address className="not-italic text-brand-red font-semibold">
              {isAr ? 'نواكشوط، موريتانيا' : 'Nouakchott, Mauritanie'}
            </address>
          </div>
        </div>
      </div>
    </div>
  );
}
