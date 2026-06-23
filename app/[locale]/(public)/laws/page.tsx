import DocumentCategoryEngine from '@/components/gazette/DocumentCategoryEngine';

export default async function LawsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <DocumentCategoryEngine 
      locale={locale} 
      documentType="law" 
      titleAr="القوانين والأوامر القانونية" 
      titleFr="Lois et Ordonnances" 
      descriptionAr="تصفح كافة القوانين والأوامر القانونية الصادرة عن الجمهورية الإسلامية الموريتانية."
      descriptionFr="Parcourir toutes les lois et ordonnances publiées par la République Islamique de Mauritanie."
      icon="scale"
    />
  );
}
