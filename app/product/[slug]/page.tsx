import { createServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';

// 1. تعريف واجهة الخصائص (Props)
interface ProductPageProps {
  params: Promise<{ slug: string }>; // في Next.js 15+ الـ params أصبحت Promise
}

// 2. الدالة الأساسية يجب أن تكون Export Default
export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const supabase = await createServerClient();

  // جلب بيانات المنتج
  const { data: product } = await supabase
    .from('listings')
    .select('*, stores(name)')
    .eq('slug', slug)
    .single();

  if (!product) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#08080E] pt-32 px-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-white">{product.title}</h1>
        {/* باقي تفاصيل صفحة المنتج هنا */}
      </div>
    </main>
  );
}

// 3. إذا كنت تستخدم توليد الميتا (اختياري)
export async function generateMetadata({ params }: ProductPageProps) {
  const { slug } = await params;
  // كود الميتا هنا...
}
