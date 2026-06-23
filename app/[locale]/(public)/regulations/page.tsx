import DocumentCategoryEngine from '@/components/gazette/DocumentCategoryEngine';

export default async function RegulationsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <DocumentCategoryEngine 
      locale={locale} 
      documentType="regulation" 
      titleAr="الأنظمة واللوائح" 
      titleFr="Règlements" 
      descriptionAr="تصفح كافة الأنظمة واللوائح التنظيمية المنشورة في الجريدة الرسمية."
      descriptionFr="Parcourir tous les règlements publiés au Journal Officiel."
      icon="book-marked"
    />
  );
}
