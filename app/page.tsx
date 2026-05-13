import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';

/**
 * DEGITALE - الصفحة الرئيسية (إصدار الإطلاق 2026)
 * تعتمد على Next.js 16 و Tailwind CSS و Supabase SSR
 */

export default async function Home() {
  const supabase = await createServerClient();
  
  // جلب آخر 4 منتجات نشطة
  const { data: featuredProducts } = await supabase
    .from('listings')
    .select('*, stores(name)')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(4);

  return (
    <div className="min-h-screen bg-[#08080E] text-[#F0EDE6] selection:bg-[#C9A84C] selection:text-black font-cairo overflow-x-hidden">
      
      {/* ── شريط التنقل (Navigation Bar) ────────────────────────────────────────── */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#08080E]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between w-full">
          
          {/* Logo Section */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 bg-[#C9A84C] rounded-xl flex items-center justify-center text-[#08080E] font-black italic text-xl shadow-[0_0_15px_rgba(201,168,76,0.3)]">
              D
            </div>
            <span className="text-2xl font-bold tracking-tighter uppercase hidden sm:block">Degitale</span>
          </div>

          {/* Center Links */}
          <div className="hidden md:flex items-center gap-10 text-sm font-medium text-gray-400">
            <Link href="/shop" className="hover:text-[#C9A84C] transition-all">المتجر</Link>
            <Link href="/categories" className="hover:text-[#C9A84C] transition-all">التصنيفات</Link>
            <Link href="/sell" className="hover:text-[#C9A84C] transition-all">ابدأ البيع</Link>
          </div>

          {/* Auth Button */}
          <Link href="/login" className="bg-white/5 border border-white/10 px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-[#C9A84C] hover:text-black transition-all shrink-0 text-white">
            دخول
          </Link>
        </div>
      </nav>

      {/* ── قسم الهيرو (Hero Section) ───────────────────────────────────────────── */}
      <section className="relative pt-52 pb-32 overflow-hidden flex flex-col items-center">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[700px] bg-[#C9A84C]/10 blur-[130px] rounded-full -z-10" />
        
        <div className="max-w-5xl mx-auto px-6 flex flex-col items-center text-center relative z-10 w-full font-serif">
          <div className="inline-block px-5 py-2 mb-8 rounded-full border border-[#C9A84C]/20 bg-[#C9A84C]/5 text-[#C9A84C] text-[10px] font-black tracking-[0.3em] uppercase">
            مستقبل التجارة الرقمية الحصرية
          </div>
          
          <h1 className="text-5xl md:text-8xl font-bold mb-10 leading-[1.2] text-white">
            امتلك أفضل <br /> 
            <span className="text-[#C9A84C] italic decoration-wavy">الأصول الرقمية</span>
          </h1>

          <p className="max-w-2xl text-gray-400 text-lg md:text-xl mb-14 leading-relaxed font-light font-sans">
            الوجهة الأولى للمبدعين والمحترفين لبيع وشراء القوالب المتطورة، الكتب الإلكترونية، والحلول البرمجية الحصرية.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center w-full max-w-md">
            <Link href="/shop" className="w-full sm:w-auto bg-[#C9A84C] text-[#08080E] px-14 py-4 rounded-full font-black text-lg hover:scale-105 transition-all shadow-[0_0_40px_rgba(201,168,76,0.25)] text-center">
              تصفح المنتجات
            </Link>
            <Link href="/sell" className="w-full sm:w-auto px-14 py-4 rounded-full border border-white/10 font-bold text-lg hover:bg-white/5 transition-all text-white text-center">
              ابدأ البيع
            </Link>
          </div>
        </div>
      </section>

      {/* ── قسم المنتجات (Featured Products) ────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-24 w-full">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6 w-full">
          <div className="text-right">
            <h2 className="text-4xl font-serif font-bold mb-3 tracking-tight">أحدث الإصدارات</h2>
            <p className="text-gray-500 font-medium italic">مختارات حصرية تمت مراجعتها يدوياً</p>
          </div>
          <Link href="/shop" className="text-[#C9A84C] font-bold border-b-2 border-[#C9A84C]/20 pb-1 hover:border-[#C9A84C] transition-all text-sm uppercase tracking-widest shrink-0">
            تصفح المتجر بالكامل ←
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 w-full">
          {featuredProducts && featuredProducts.length > 0 ? (
            featuredProducts.map((product) => (
              <Link key={product.id} href={`/product/${product.slug}`} className="group">
                <div className="relative aspect-[4/5] rounded-[2.5rem] overflow-hidden bg-[#12121A] border border-white/5 group-hover:border-[#C9A84C]/40 transition-all duration-700 shadow-2xl">
                  <img 
                    src={product.thumbnail_url || '/placeholder.png'} 
                    className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-1000"
                    alt={product.title}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#08080E] via-[#08080E]/40 to-transparent opacity-90" />
                  <div className="absolute bottom-10 left-8 right-8 text-right translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                    <div className="text-[10px] text-[#C9A84C] font-black uppercase mb-2 tracking-widest opacity-80">
                      {(product.stores as any)?.name ?? 'Degitale Exclusive'}
                    </div>
                    <h3 className="text-xl font-bold leading-tight mb-4 group-hover:text-[#C9A84C] transition-colors line-clamp-2 text-white">
                      {product.title}
                    </h3>
                    <div className="text-2xl font-serif font-black text-white">
                      ${product.base_price?.toFixed(2)}
                    </div>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            [1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-[4/5] rounded-[2.5rem] bg-white/5 border border-white/5 animate-pulse" />
            ))
          )}
        </div>
      </section>

      {/* ── التذييل (Footer) ─────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-24 bg-[#06060A] w-full">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-12 w-full">
          
          <div className="flex flex-col md:flex-row items-center gap-8 order-2 md:order-1">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-white/10 rounded flex items-center justify-center text-[10px] font-bold text-[#C9A84C]">D</div>
              <span className="font-bold text-white tracking-widest uppercase text-sm">Degitale</span>
            </div>
            <span className="text-xs text-gray-600 font-medium">© 2026 جميع الحقوق محفوظة لمنصة ديجيتال</span>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-12 text-xs font-bold text-gray-500 order-1 md:order-2 uppercase tracking-[0.2em]">
            <Link href="/terms" className="hover:text-[#C9A84C] transition-colors whitespace-nowrap">الشروط</Link>
            <Link href="/privacy" className="hover:text-[#C9A84C] transition-colors whitespace-nowrap">الخصوصية</Link>
            <Link href="/contact" className="hover:text-[#C9A84C] transition-colors whitespace-nowrap">الدعم</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
