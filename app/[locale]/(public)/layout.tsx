import Navbar from '@/components/layout/Navbar';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 bg-gray-50">
        {children}
      </main>
      <footer className="py-6 bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} الجريدة الرسمية الموريتانية. جميع الحقوق محفوظة.</p>
          <div className="flex space-x-4 space-x-reverse mt-4 sm:mt-0">
            <a href="#" className="hover:text-gray-900">سياسة الخصوصية</a>
            <a href="#" className="hover:text-gray-900">شروط الاستخدام</a>
            <a href="#" className="hover:text-gray-900">اتصل بنا</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
