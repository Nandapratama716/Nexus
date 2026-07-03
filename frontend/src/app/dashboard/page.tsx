"use client";

import Link from "next/link";

export default function DashboardOverview() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-light text-ink tracking-tight mb-2">Dashboard Overview</h1>
        <p className="text-[15px] text-ink-mute font-light">Welcome back! Here is what's happening at Nexus today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-hairline shadow-sm">
          <h3 className="text-[14px] text-ink-mute uppercase tracking-widest mb-2">Total Sales</h3>
          <div className="text-3xl font-light text-ink tabular-nums">Rp 1.450.000</div>
          <div className="text-[13px] text-[#10B981] mt-2">+12% from yesterday</div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-hairline shadow-sm">
          <h3 className="text-[14px] text-ink-mute uppercase tracking-widest mb-2">Active Orders</h3>
          <div className="text-3xl font-light text-ink tabular-nums">24</div>
          <div className="text-[13px] text-ink-mute mt-2">12 in kitchen, 12 pending</div>
        </div>

        <div className="bg-brand-dark p-6 rounded-xl shadow-md text-white">
          <h3 className="text-[14px] text-white/70 uppercase tracking-widest mb-2">Midtrans Webhook</h3>
          <div className="text-3xl font-light tabular-nums">Online</div>
          <div className="text-[13px] text-[#10B981] mt-2">Last sync: 2 mins ago</div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-xl border border-hairline shadow-sm flex flex-col items-center justify-center text-center py-16">
        <h2 className="text-xl font-light text-ink mb-2">Manage your Menu</h2>
        <p className="text-[15px] text-ink-mute font-light mb-6">Keep your offerings up to date for the KDS and POS.</p>
        <Link href="/dashboard/menu" className="bg-primary text-white px-6 py-2 rounded-full hover:bg-primary-press transition-colors">
          Go to Menu Manager
        </Link>
      </div>
    </div>
  );
}
