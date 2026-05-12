import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = await createServerClient();
  
  // جلب آخر 4 منتجات من سوبابيس
  const { data: featuredProducts } = await supabase
    .from('listings')
    .select('*, stores(name)')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(4);

  return (
    <div className="min-h-screen bg-[#08080E] text-[#F0EDE6] selection:bg-[#C9A84C] selection:text-black font-cairo">
      
      {/* 1. Navigation Bar */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#08080E]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* Logo Section */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#C9A84C] rounded-lg flex items-center justify-center text-[#08080E] font-black italic">D</div>
            <span className="text-xl font-bold tracking-tighter uppercase">Degitale</span>
          </div>

          {/* Center Links (Hidden on mobile) */}
          <div className="hidden md:flex gap-10 text-sm font-medium text-gray-400">
            <Link href="/shop" className="hover:text-[#C9A84C] transition-colors">المتجر</Link>
            <Link href="/categories" className="hover:text-[#C9A84C] transition-colors">التصنيفات</Link>
            <Link href="/sell" className="hover:text-[#C9A84C] transition-colors">ابدأ البيع</Link>
          </div>

          {/* Auth Button */}
          <Link href="/login" className="bg-white/5 border border-white/10 px-6 py-2 rounded-full text-sm font-semibold hover:bg-[#C9A84C] hover:text-black transition-all">
            دخول
          </Link>
        </div>
      </nav>

      {/* 2. Hero Section */}
      <section className="relative pt-52 pb-32 overflow-hidden">
        {/* Glow Effect - Adjusted to stay centered in RTL */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-[#C9A84C]/10 blur-[120px] rounded-full -z-10" />
        
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center text-center">
          <div className="inline-block px-4 py-1.5 mb-8 rounded-full border border-[#C9A84C]/20 bg-[#C9A84C]/5 text-[#C9A84C] text-xs font-bold tracking-[0.2em] uppercase">
            مستقبل التجارة الرقمية
          </div>
          
          <h1 className="text-6xl md:text-8xl font-serif font-bold mb-8 leading-[1.15]">
            امتلك أفضل <br /> 
            <span className="text-[#C9A84C] italic">الأصول الرقمية</span>
          </h1>

          <p className="max-w-2xl text-gray-400 text-lg md:text-xl mb-12 leading-relaxed">
            منصة حصرية لبيع وشراء القوالب الاحترافية، الكتب الإلكترونية، والحلول البرمجية المتطورة.
          </p>

          <div className="flex flex-col sm:flex-row gap-5 justify-center items-center w-full">
            <Link href="/shop" className="w-full sm:w-auto bg-[#C9A84C] text-[#08080E] px-12 py-4 rounded-full font-bold text-lg hover:scale-105 transition-all shadow-[0_0_30px_rgba(201,168,76,0.2)]">
              اكتشف المنتجات
            </Link>
            <Link href="/sell" className="w-full sm:w-auto px-12 py-4 rounded-full border border-white/10 font-bold text-lg hover:bg-white/5 transition-all text-white">
              عرض أعمالك
            </Link>
          </div>
        </div>
      </section>

      {/* 3. Featured Products Grid */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
          <div className="text-right">
            <h2 className="text-4xl font-serif font-bold mb-3">أحدث الإصدارات</h2>
            <p className="text-gray-500">مختارات حصرية تمت مراجعتها بدقة من قبل فريقنا</p>
          </div>
          <Link href="/shop" className="text-[#C9A84C] font-semibold border-b border-[#C9A84C]/30 pb-1 hover:border-[#C9A84C] transition-all">
            تصفح المتجر بالكامل ←
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {featuredProducts?.map((product) => (
            <Link key={product.id} href={`/product/${product.slug}`} className="group">
              <div className="relative aspect-[4/5] rounded-3xl overflow-hidden bg-[#12121A] border border-white/5 group-hover:border-[#C9A84C]/40 transition-all duration-500 shadow-2xl">
                <img 
                  src={product.thumbnail_url || '/placeholder.png'} 
                  className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700"
                  alt={product.title}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#08080E] via-[#08080E]/20 to-transparent opacity-80" />
                
                <div className="absolute bottom-8 left-6 right-6 text-right">
                  <div className="text-xs text-[#C9A84C] font-bold uppercase mb-2 tracking-wider">
                    {(product.stores as any)?.name}
                  </div>
                  <h3 className="text-xl font-bold leading-snug mb-3 group-hover:text-[#C9A84C] transition-colors">
                    {product.title}
                  </h3>
                  <div className="text-2xl font-serif font-bold text-white">
                    ${product.base_price}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 4. Footer */}
      <footer className="border-t border-white/5 py-20 bg-[#06060A]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-4 order-2 md:order-1">
            <span className="font-bold text-white tracking-widest uppercase">Degitale</span>
            <span className="text-sm text-gray-600">© 2026 جميع الحقوق محفوظة</span>
          </div>
          
          <div className="flex gap-10 text-sm text-gray-500 order-1 md:order-2">
            <Link href="/terms" className="hover:text-[#C9A84C] transition-colors">الشروط والأحكام</Link>
            <Link href="/privacy" className="hover:text-[#C9A84C] transition-colors">سياسة الخصوصية</Link>
            <Link href="/contact" className="hover:text-[#C9A84C] transition-colors">اتصل بنا</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
