import Breadcrumbs from '@/components/ui/Breadcrumbs';

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isAr = locale === 'ar';

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6">
      <Breadcrumbs items={[{ label: isAr ? 'شروط الاستخدام' : 'Conditions d\'Utilisation' }]} />
      
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 sm:p-12 mt-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 border-b border-gray-100 pb-4">
          {isAr ? 'شروط الاستخدام' : 'Conditions d\'Utilisation'}
        </h1>
        
        <div className={`prose prose-brand-green max-w-none text-gray-700 leading-loose ${isAr ? 'text-right' : 'text-left'}`}>
          {isAr ? (
            <>
              <p>مرحباً بك في منصة الجريدة الرسمية الموريتانية. يرجى قراءة شروط الاستخدام هذه بعناية قبل استخدام الموقع. باستخدامك لهذا الموقع، فإنك توافق على الالتزام بهذه الشروط.</p>
              
              <h3>1. طبيعة الخدمة</h3>
              <p>توفر هذه المنصة وصولاً رقمياً إلى الأعداد والوثائق والمراسيم الصادرة في الجريدة الرسمية للجمهورية الإسلامية الموريتانية. يتم توفير هذه المعلومات لأغراض إعلامية وتوثيقية.</p>
              
              <h3>2. حقوق الملكية الفكرية</h3>
              <p>جميع المحتويات المنشورة على هذا الموقع (بما في ذلك النصوص والوثائق والشعارات والتصميم) هي ملكية حصرية لـ afrikyia.com والجهات الحكومية المعنية. يُمنع إعادة إنتاج أو توزيع المحتوى لأغراض تجارية دون إذن كتابي مسبق.</p>
              
              <h3>3. دقة المعلومات</h3>
              <p>نبذل قصارى جهدنا لضمان دقة وتحديث المعلومات المقدمة. ومع ذلك، تبقى النسخ الورقية المطبوعة رسمياً هي المرجع القانوني النهائي في حال وجود أي تعارض.</p>
              
              <h3>4. استخدام الموقع</h3>
              <p>يجب استخدام هذا الموقع للأغراض المشروعة فقط. يُمنع استخدام الموقع بأي طريقة قد تسبب ضرراً للخوادم، أو تتداخل مع استخدام الآخرين للموقع، أو تنتهك القوانين المعمول بها.</p>
              
              <h3>5. إخلاء المسؤولية</h3>
              <p>المنصة غير مسؤولة عن أي أضرار مباشرة أو غير مباشرة تنشأ عن استخدام أو عدم القدرة على استخدام الموقع أو الاعتماد على المعلومات المقدمة فيه.</p>
              
              <h3>6. التعديلات</h3>
              <p>نحتفظ بالحق في تعديل شروط الاستخدام في أي وقت. استمرارك في استخدام الموقع بعد إجراء أي تعديلات يعتبر قبولاً منك لهذه التعديلات.</p>
            </>
          ) : (
            <>
              <p>Bienvenue sur la plateforme du Journal Officiel de Mauritanie. Veuillez lire attentivement ces conditions d'utilisation avant d'utiliser le site. En utilisant ce site, vous acceptez d'être lié par ces conditions.</p>
              
              <h3>1. Nature du service</h3>
              <p>Cette plateforme permet un accès numérique aux numéros, documents et décrets publiés dans le Journal Officiel de la République Islamique de Mauritanie. Ces informations sont fournies à des fins d'information et de documentation.</p>
              
              <h3>2. Propriété intellectuelle</h3>
              <p>Tous les contenus publiés sur ce site (y compris les textes, documents, logos et design) sont la propriété exclusive de afrikyia.com et des autorités gouvernementales concernées. La reproduction ou la distribution du contenu à des fins commerciales sans autorisation écrite préalable est interdite.</p>
              
              <h3>3. Exactitude des informations</h3>
              <p>Nous faisons de notre mieux pour garantir l'exactitude et la mise à jour des informations fournies. Cependant, les copies papier officiellement imprimées restent la référence légale ultime en cas de conflit.</p>
              
              <h3>4. Utilisation du site</h3>
              <p>Ce site ne doit être utilisé qu'à des fins légales. Il est interdit d'utiliser le site d'une manière qui pourrait endommager les serveurs, interférer avec l'utilisation du site par d'autres, ou violer les lois applicables.</p>
              
              <h3>5. Avis de non-responsabilité</h3>
              <p>La plateforme n'est pas responsable des dommages directs ou indirects résultant de l'utilisation ou de l'impossibilité d'utiliser le site ou de la confiance accordée aux informations qui y sont fournies.</p>
              
              <h3>6. Modifications</h3>
              <p>Nous nous réservons le droit de modifier les conditions d'utilisation à tout moment. Votre utilisation continue du site après toute modification constitue votre acceptation de ces modifications.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
