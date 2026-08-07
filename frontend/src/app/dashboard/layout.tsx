"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-canvas-soft font-sans font-light overflow-hidden">
      {/* Sidebar (Dark Chrome per DESIGN.md) */}
      <aside className="w-64 bg-brand-dark text-white flex flex-col p-6 shadow-md z-10 shrink-0">
        <div className="mb-8">
          <h2 className="text-xl tracking-tight text-white/90 font-light">Nexus Dashboard</h2>
        </div>
        
        <nav className="flex flex-col gap-2">
          <Link href="/dashboard" className={`px-4 py-2.5 rounded-lg transition-colors text-[14px] ${pathname === "/dashboard" ? "bg-white/15 text-white font-normal" : "text-white/70 hover:bg-white/5"}`}>
            Overview
          </Link>
          <Link href="/dashboard/menu" className={`px-4 py-2.5 rounded-lg transition-colors text-[14px] ${pathname === "/dashboard/menu" ? "bg-white/15 text-white font-normal" : "text-white/70 hover:bg-white/5"}`}>
            Menu Manager
          </Link>
          <Link href="/dashboard/floor-plan" className={`px-4 py-2.5 rounded-lg transition-colors text-[14px] ${pathname === "/dashboard/floor-plan" ? "bg-white/15 text-white font-normal" : "text-white/70 hover:bg-white/5"}`}>
            Floor Plan Grid
          </Link>
          <Link href="/dashboard/reports" className={`px-4 py-2.5 rounded-lg transition-colors text-[14px] ${pathname === "/dashboard/reports" ? "bg-white/15 text-white font-normal" : "text-white/70 hover:bg-white/5"}`}>
            Reports & Analytics
          </Link>
          <Link href="/kds" className="px-4 py-2.5 rounded-lg text-white/70 hover:bg-white/5 transition-colors text-[14px]">
            Open KDS
          </Link>
        </nav>

        <div className="mt-auto text-xs text-white/40 tabular-nums">
          Server Status: <span className="text-emerald-400">Online</span>
        </div>
      </aside>

      {/* Main Content Area Canvas — Clean top-aligned layout */}
      <main className="flex-1 overflow-y-auto p-8 md:p-12">
        <div className="max-w-5xl">
          {children}
        </div>
      </main>
    </div>
  );
}
