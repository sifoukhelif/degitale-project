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

          {/* Center Links (إضافة gap-10 لمنع الالتصاق) */}
          <div className="hidden md:flex items-center gap-10 text-sm font-medium text-gray-400">
            <Link href="/shop" className="hover:text-[#C9A84C] transition-all">المتجر</Link>
            <Link href="/categories" className="hover:text-[#C9A84C] transition-all">التصنيفات</Link>
            <Link href="/sell" className="hover:text-[#C9A84C] transition-all">ابدأ البيع</Link>
          </div>

          {/* Auth Button */}
          <Link href="/login" className="bg-white/5 border border-white/10 px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-[#C9A84C] hover:text-black transition-all shrink-0">
            دخول
          </Link>
        </div>
      </nav>

      {/* ── قسم الهيرو (Hero Section) ───────────────────────────────────────────── */}
      <section className="relative pt-52 pb-32 overflow-hidden flex flex-col items-center">
        {/* Glow Effect - التمركز في المنتصف تماماً */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[700px] bg-[#C9A84C]/10 blur-[130px] rounded-full -z-10" />
        
        <div className="max-w-5xl mx-auto px-6 flex flex-col items-center text-center relative z-10 w-full">
          <div className="inline-block px-5 py-2 mb-8 rounded-full border border-[#C9A84C]/20 bg-[#C9A84C]/5 text-[#C9A84C] text-[10px] font-black tracking-[0.3em] uppercase">
            مستقبل التجارة الرقمية الحصرية
          </div>
          
          <h1 className="text-5xl md:text-8xl font-serif font-bold mb-10 leading-[1.2] text-white">
            امتلك أفضل <br /> 
            <span className="text-[#C9A84C] italic decoration-wavy">الأصول الرقمية</span>
          </h1>

          <p className="max-w-2xl text-gray-400 text-lg md:text-xl mb-14 leading-relaxed font-light">
            الوجهة الأولى للمبدعين والمحترفين لبيع وشراء القوالب المتطورة، الكتب الإلكترونية، والحلول البرمجية الحصرية.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center w-full max-w-md">
            <Link href="/shop" className="w-full sm:w-auto bg-[#C9A84C] text-[#08080E] px-14 py-4 rounded-full font-black text-lg hover:scale-105 transition-all text-center">
  تصفح المنتجات
</Link>
