import DocumentCategoryEngine from '@/components/gazette/DocumentCategoryEngine';

export default async function AnnouncementsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <DocumentCategoryEngine 
      locale={locale} 
      documentType="announcement" 
      titleAr="الإعلانات" 
      titleFr="Annonces" 
      descriptionAr="تصفح كافة الإعلانات الرسمية المنشورة."
      descriptionFr="Parcourir toutes les annonces officielles publiées."
      icon="megaphone"
    />
  );
}
