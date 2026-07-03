import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col gap-16">
      {/* Hero Section */}
      <section className="pt-12 text-center max-w-3xl mx-auto flex flex-col items-center gap-6">
        <h1 className="text-5xl md:text-6xl font-sans tracking-tight text-white font-light drop-shadow-md">
          Financial-grade POS & KDS
        </h1>
        <p className="text-lg text-white/90 font-sans max-w-xl font-light drop-shadow">
          A high-performance point of sale system with realtime Kitchen Display Synchronization, built on Go, Next.js, and Python AI.
        </p>
        <div className="flex gap-4 mt-4">
          <Link href="/dashboard" className="bg-white text-primary font-sans text-[16px] px-6 py-3 rounded-full hover:bg-canvas-soft transition-colors shadow-lg">
            Open Dashboard
          </Link>
          <Link href="/kds" className="bg-transparent text-white font-sans text-[16px] px-6 py-3 rounded-full border border-white/40 shadow-sm hover:bg-white/10 transition-colors">
            Launch KDS View
          </Link>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1 */}
        <div className="bg-white p-8 rounded-xl border border-hairline shadow-sm">
          <h3 className="text-2xl font-light text-ink mb-2">Realtime Sync</h3>
          <p className="text-ink-mute font-light text-[15px]">
            Orders are synced instantly to the kitchen display via WebSockets, ensuring zero delay between payment and preparation.
          </p>
        </div>
        
        {/* Card 2 */}
        <div className="bg-canvas-cream p-8 rounded-xl border border-hairline shadow-sm">
          <h3 className="text-2xl font-light text-ink mb-2">AI Assistant</h3>
          <p className="text-ink-mute font-light text-[15px]">
            Integrated Ollama Langchain models to suggest cross-sells, handle smart inventory queries, and summarize daily earnings.
          </p>
        </div>

        {/* Card 3 (Dark Feature) */}
        <div className="bg-brand-dark text-white p-8 rounded-xl shadow-md">
          <h3 className="text-2xl font-light mb-2">Secure Payments</h3>
          <p className="text-white/80 font-light text-[15px] mb-6">
            Webhook integration with Midtrans for seamless QRIS and virtual account settlements.
          </p>
          <div className="font-sans tabular-nums text-2xl bg-black/20 p-4 rounded-lg">
            $24,050.00
          </div>
        </div>
      </section>
    </div>
  );
}
