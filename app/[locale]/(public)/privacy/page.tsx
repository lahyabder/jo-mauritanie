import Breadcrumbs from '@/components/ui/Breadcrumbs';

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isAr = locale === 'ar';

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6">
      <Breadcrumbs items={[{ label: isAr ? 'سياسة الخصوصية' : 'Politique de Confidentialité' }]} />
      
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 sm:p-12 mt-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 border-b border-gray-100 pb-4">
          {isAr ? 'سياسة الخصوصية' : 'Politique de Confidentialité'}
        </h1>
        
        <div className={`prose prose-brand-green max-w-none text-gray-700 leading-loose ${isAr ? 'text-right' : 'text-left'}`}>
          {isAr ? (
            <>
              <p>تلتزم منصة الجريدة الرسمية الموريتانية بحماية خصوصيتك وبياناتك الشخصية. توضح سياسة الخصوصية هذه كيفية جمعنا للمعلومات واستخدامها وحمايتها.</p>
              
              <h3>1. جمع المعلومات</h3>
              <p>نحن نقوم بجمع المعلومات التي تقدمها لنا طواعية، مثل عنوان البريد الإلكتروني عند التواصل معنا، بالإضافة إلى بيانات الاستخدام الأساسية (مثل نوع المتصفح والصفحات التي تمت زيارتها) لتحسين تجربة المستخدم.</p>
              
              <h3>2. استخدام المعلومات</h3>
              <p>نستخدم المعلومات المجمعة للأغراض التالية:</p>
              <ul>
                <li>تحسين وتطوير خدمات المنصة.</li>
                <li>الرد على استفسارات المستخدمين.</li>
                <li>تحليل إحصائيات الزيارات لضمان كفاءة الموقع.</li>
              </ul>
              
              <h3>3. حماية البيانات</h3>
              <p>نتخذ تدابير أمنية تقنية وتنظيمية مناسبة لحماية بياناتك من الوصول غير المصرح به أو التعديل أو الإفشاء أو الإتلاف.</p>
              
              <h3>4. مشاركة المعلومات</h3>
              <p>لا نقوم ببيع أو تأجير أو مشاركة معلوماتك الشخصية مع أطراف ثالثة لأغراض تسويقية. قد نشارك المعلومات فقط استجابة لطلب قانوني أو لحماية حقوقنا.</p>
              
              <h3>5. التغييرات في سياسة الخصوصية</h3>
              <p>نحتفظ بالحق في تحديث سياسة الخصوصية هذه في أي وقت. سيتم نشر التغييرات على هذه الصفحة مع تحديث تاريخ المراجعة.</p>
            </>
          ) : (
            <>
              <p>La plateforme du Journal Officiel de Mauritanie s'engage à protéger votre vie privée et vos données personnelles. Cette politique de confidentialité explique comment nous collectons, utilisons et protégeons vos informations.</p>
              
              <h3>1. Collecte d'informations</h3>
              <p>Nous collectons les informations que vous nous fournissez volontairement, telles que votre adresse e-mail lorsque vous nous contactez, ainsi que des données d'utilisation de base (comme le type de navigateur et les pages visitées) pour améliorer l'expérience utilisateur.</p>
              
              <h3>2. Utilisation des informations</h3>
              <p>Nous utilisons les informations collectées aux fins suivantes :</p>
              <ul>
                <li>Améliorer et développer les services de la plateforme.</li>
                <li>Répondre aux demandes des utilisateurs.</li>
                <li>Analyser les statistiques de visite pour garantir l'efficacité du site.</li>
              </ul>
              
              <h3>3. Protection des données</h3>
              <p>Nous prenons des mesures de sécurité techniques et organisationnelles appropriées pour protéger vos données contre tout accès, modification, divulgation ou destruction non autorisés.</p>
              
              <h3>4. Partage d'informations</h3>
              <p>Nous ne vendons, ne louons ni ne partageons vos informations personnelles avec des tiers à des fins de marketing. Nous pouvons partager des informations uniquement en réponse à une demande légale ou pour protéger nos droits.</p>
              
              <h3>5. Modifications de la politique de confidentialité</h3>
              <p>Nous nous réservons le droit de mettre à jour cette politique de confidentialité à tout moment. Les modifications seront publiées sur cette page avec la date de révision mise à jour.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
