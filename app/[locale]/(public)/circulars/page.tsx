import DocumentCategoryEngine from '@/components/gazette/DocumentCategoryEngine';

export default async function CircularsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <DocumentCategoryEngine 
      locale={locale} 
      documentType="circular" 
      titleAr="التعميمات" 
      titleFr="Circulaires" 
      descriptionAr="تصفح كافة التعميمات والمذكرات الإدارية."
      descriptionFr="Parcourir toutes les circulaires et notes administratives."
      icon="send"
    />
  );
}
