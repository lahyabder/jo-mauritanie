import DocumentCategoryEngine from '@/components/gazette/DocumentCategoryEngine';
import { Gavel } from 'lucide-react';

export default async function DecisionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <DocumentCategoryEngine 
      locale={locale} 
      documentType="decision" 
      titleAr="المقررات" 
      titleFr="Arrêtés" 
      descriptionAr="تصفح كافة المقررات والقرارات الوزارية والإدارية."
      descriptionFr="Parcourir tous les arrêtés et décisions ministérielles et administratives."
      icon={Gavel}
    />
  );
}
