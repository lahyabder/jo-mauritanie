import DocumentCategoryEngine from '@/components/gazette/DocumentCategoryEngine';

export default async function DecreesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <DocumentCategoryEngine 
      locale={locale} 
      documentType="decree" 
      titleAr="المراسيم" 
      titleFr="Décrets" 
      descriptionAr="تصفح كافة المراسيم الرئاسية والوزارية الصادرة في الجريدة الرسمية."
      descriptionFr="Parcourir tous les décrets présidentiels et ministériels publiés au Journal Officiel."
      icon="file-signature"
    />
  );
}
