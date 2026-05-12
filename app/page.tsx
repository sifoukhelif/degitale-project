import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-[#08080E] text-white">
      {/* Hero Section */}
      <section className="px-6 pt-32 pb-20 text-center">
        <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
          سوق المنتجات <span className="text-[#C9A84C]">الرقمية</span> المميزة
        </h1>
        <p className="text-gray-400 max-w-2xl mx-auto text-lg mb-10">
          اكتشف أفضل القوالب، الأدوات، والمحتوى الحصري من مبدعي العالم العربي.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/shop" className="bg-[#C9A84C] text-black px-8 py-3 rounded-full font-bold hover:bg-opacity-90 transition">
            تصفح المتجر
          </Link>
          <Link href="/sell" className="border border-white/20 px-8 py-3 rounded-full font-bold hover:bg-white/10 transition">
            ابدأ البيع
          </Link>
        </div>
      </section>

      {/* Featured Products Grid */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="flex justify-between items-end mb-12">
          <h2 className="text-3xl font-bold">أحدث الإضافات</h2>
          <Link href="/products" className="text-[#C9A84C] hover:underline">عرض الكل ←</Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* هذا الجزء سيتم ربطه لاحقاً ببيانات Supabase */}
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="group bg-[#12121A] rounded-2xl overflow-hidden border border-white/5 hover:border-[#C9A84C]/30 transition">
              <div className="aspect-square bg-gray-800 animate-pulse" /> {/* مكان الصورة */}
              <div className="p-6">
                <h3 className="font-bold text-lg mb-2">اسم المنتج الرقمي</h3>
                <div className="flex justify-between items-center text-sm text-gray-400">
                  <span>بواسطة المبدع</span>
                  <span className="text-[#C9A84C] font-bold">$49.00</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
