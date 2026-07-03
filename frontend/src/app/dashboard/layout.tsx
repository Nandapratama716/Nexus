"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-canvas-soft font-sans font-light">
      {/* Sidebar (Dark Chrome per DESIGN.md) */}
      <aside className="w-64 bg-brand-dark text-white flex flex-col p-6 shadow-md z-10">
        <div className="mb-12">
          <h2 className="text-xl tracking-tight text-white/90">Nexus Dashboard</h2>
        </div>
        
        <nav className="flex flex-col gap-2">
          <Link href="/dashboard" className={`px-4 py-2 rounded-sm transition-colors text-[15px] ${pathname === "/dashboard" ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5"}`}>
            Overview
          </Link>
          <Link href="/dashboard/menu" className={`px-4 py-2 rounded-sm transition-colors text-[15px] ${pathname === "/dashboard/menu" ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5"}`}>
            Menu Manager
          </Link>
          <Link href="/kds" className="px-4 py-2 rounded-sm text-white/70 hover:bg-white/5 transition-colors text-[15px]">
            Open KDS
          </Link>
        </nav>

        <div className="mt-auto text-xs text-white/50 tabular-nums">
          Server Status: Online
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto p-12">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
