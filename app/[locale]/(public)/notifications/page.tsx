import DocumentCategoryEngine from '@/components/gazette/DocumentCategoryEngine';

export default async function NotificationsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <DocumentCategoryEngine 
      locale={locale} 
      documentType="notification" 
      titleAr="البلاغات" 
      titleFr="Avis" 
      descriptionAr="تصفح كافة البلاغات الرسمية."
      descriptionFr="Parcourir tous les avis officiels."
      icon="bell"
    />
  );
}
