'use client';

import { use, useState } from 'react';
import { Settings, Globe, Rss, Bell, Save, CheckCircle, ExternalLink } from 'lucide-react';

export default function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const isAr = locale === 'ar';

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://jo.afrikyia.com';

  const configItems = [
    {
      icon: Globe,
      title: isAr ? 'معلومات الموقع' : 'Site Information',
      color: 'bg-blue-50 text-blue-600',
      fields: [
        { label: isAr ? 'عنوان الموقع'     : 'Site URL',        value: siteUrl,                  readonly: true },
        { label: isAr ? 'اسم المنصة'       : 'Platform Name',   value: isAr ? 'الجريدة الرسمية' : 'Official Gazette', readonly: false },
        { label: isAr ? 'البريد الإلكتروني للتواصل' : 'Contact Email', value: 'contact@jo.afrikyia.com', readonly: false },
      ],
    },
    {
      icon: Rss,
      title: isAr ? 'إعدادات RSS Feed' : 'RSS Feed Settings',
      color: 'bg-orange-50 text-orange-600',
      fields: [
        { label: isAr ? 'رابط الـ RSS'    : 'RSS URL',          value: `${siteUrl}/api/rss`,      readonly: true },
        { label: isAr ? 'عدد العناصر'    : 'Max Items',         value: '20',                      readonly: false },
        { label: isAr ? 'مدة الكاش (دقيقة)' : 'Cache TTL (min)', value: '60',                    readonly: false },
      ],
    },
    {
      icon: Bell,
      title: isAr ? 'إعدادات النظام' : 'System Settings',
      color: 'bg-purple-50 text-purple-600',
      fields: [
        { label: isAr ? 'بيئة النشر'     : 'Environment',       value: 'Production (Vercel)',      readonly: true },
        { label: isAr ? 'قاعدة البيانات' : 'Database',          value: 'Supabase PostgreSQL',      readonly: true },
        { label: isAr ? 'نموذج الذكاء'  : 'AI Model',           value: 'gemini-2.5-flash',         readonly: true },
      ],
    },
  ];

  const quickLinks = [
    { label: isAr ? 'Supabase Dashboard' : 'Supabase Dashboard', href: 'https://supabase.com/dashboard/project/xtwcuuyygocwlkdesvmq', icon: ExternalLink },
    { label: isAr ? 'Vercel Dashboard'   : 'Vercel Dashboard',   href: 'https://vercel.com/dashboard',  icon: ExternalLink },
    { label: isAr ? 'Google AI Studio'   : 'Google AI Studio',   href: 'https://aistudio.google.com',   icon: ExternalLink },
    { label: isAr ? 'RSS Feed'           : 'RSS Feed',           href: `${siteUrl}/api/rss`,            icon: Rss },
  ];

  return (
    <div className="w-full" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="text-indigo-600" size={28} />
            {isAr ? 'الإعدادات العامة' : 'General Settings'}
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            {isAr ? 'إعدادات النظام والمنصة وتهيئة الخدمات المرتبطة' : 'Platform configuration and connected services'}
          </p>
        </div>
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm ${
            saved ? 'bg-emerald-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
        >
          {saved ? <><CheckCircle size={14} /> {isAr ? 'تم الحفظ!' : 'Saved!'}</> : <><Save size={14} /> {isAr ? 'حفظ الإعدادات' : 'Save Settings'}</>}
        </button>
      </div>

      {/* Config Sections */}
      <div className="space-y-6 mb-8">
        {configItems.map((section, si) => {
          const Icon = section.icon;
          return (
            <div key={si} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${section.color}`}>
                  <Icon size={16} />
                </div>
                <h2 className="font-bold text-gray-900">{section.title}</h2>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                {section.fields.map((field, fi) => (
                  <div key={fi}>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">{field.label}</label>
                    <input
                      type="text"
                      defaultValue={field.value}
                      readOnly={field.readonly}
                      className={`w-full text-sm px-3 py-2 rounded-lg border transition-colors ${
                        field.readonly
                          ? 'bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed'
                          : 'bg-white border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
                      }`}
                    />
                    {field.readonly && (
                      <p className="text-xs text-gray-400 mt-1">
                        {isAr ? 'محدد من المتغيرات البيئية' : 'Set via environment variables'}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Links */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">{isAr ? 'روابط سريعة للخدمات' : 'Quick Links to Services'}</h2>
        </div>
        <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickLinks.map((link, i) => {
            const Icon = link.icon;
            return (
              <a
                key={i}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-3 bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 rounded-lg text-sm font-medium text-gray-700 hover:text-indigo-700 transition-all group"
              >
                <Icon size={14} className="text-gray-400 group-hover:text-indigo-500" />
                {link.label}
              </a>
            );
          })}
        </div>
      </div>

      {/* Note */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <strong>{isAr ? 'ملاحظة: ' : 'Note: '}</strong>
        {isAr
          ? 'الإعدادات المحددة بـ "متغيرات بيئية" تُعدَّل من ملف .env.local في الكود أو من لوحة Vercel → Settings → Environment Variables.'
          : 'Fields marked as "environment variables" must be edited in .env.local or via Vercel Dashboard → Settings → Environment Variables.'}
      </div>
    </div>
  );
}
