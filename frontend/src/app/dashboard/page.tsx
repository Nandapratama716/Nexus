import Link from "next/link";
import { getDashboardStats } from "../actions/dashboard";

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatRelativeTime(isoString: string | null): string {
  if (!isoString) return "No data yet";
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m ago`;
}

// Server Component — re-renders on every request (no cache)
export const dynamic = "force-dynamic";

export default async function DashboardOverview() {
  const stats = await getDashboardStats();

  return (
    <div className="flex flex-col gap-6 py-2">
      <div>
        <h1 className="text-2xl font-light text-ink tracking-tight mb-1">
          Dashboard Overview
        </h1>
        <p className="text-[14px] text-ink-mute font-light">
          Welcome back! Here is what&apos;s happening at Nexus today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Total Sales */}
        <div className="bg-white p-5 rounded-xl border border-hairline shadow-xs flex flex-col justify-between">
          <h3 className="text-[12px] text-ink-mute uppercase tracking-widest font-medium mb-1">
            Total Sales Today
          </h3>
          <div className="text-2xl font-light text-ink tabular-nums my-1">
            {formatRupiah(stats.totalSalesToday)}
          </div>
          <div className="text-[12px] text-ink-mute">
            {stats.totalOrdersToday} orders placed today
          </div>
        </div>

        {/* Active Orders */}
        <div className="bg-white p-5 rounded-xl border border-hairline shadow-xs flex flex-col justify-between">
          <h3 className="text-[12px] text-ink-mute uppercase tracking-widest font-medium mb-1">
            Active Orders
          </h3>
          <div className="text-2xl font-light text-ink tabular-nums my-1">
            {stats.activeOrders}
          </div>
          <div className="text-[12px] text-ink-mute">
            {stats.preparingOrders} in kitchen &middot; {stats.pendingOrders} pending
          </div>
        </div>

        {/* Midtrans Webhook */}
        <div className="bg-brand-dark p-5 rounded-xl shadow-xs text-white flex flex-col justify-between">
          <h3 className="text-[12px] text-white/70 uppercase tracking-widest font-medium mb-1">
            Midtrans Webhook
          </h3>
          <div className="text-2xl font-light tabular-nums my-1">
            {stats.lastWebhookAt ? "Online" : "Standby"}
          </div>
          <div className="text-[12px] text-emerald-400">
            Last sync: {formatRelativeTime(stats.lastWebhookAt)}
          </div>
        </div>
      </div>

      {/* Quick Actions Grid — 3 Columns for balanced proportions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-xl border border-hairline shadow-xs flex flex-col justify-between items-start gap-4">
          <div>
            <h2 className="text-lg font-light text-ink mb-1">Menu Manager</h2>
            <p className="text-[13px] text-ink-mute font-light leading-relaxed">
              Add products, prices, & stock. Auto-syncs to AI & KDS.
            </p>
          </div>
          <Link
            href="/dashboard/menu"
            className="bg-primary text-white px-5 py-2 rounded-full hover:bg-primary-press transition-colors text-[13px] font-medium"
          >
            Manage Menus
          </Link>
        </div>

        <div className="bg-white p-6 rounded-xl border border-hairline shadow-xs flex flex-col justify-between items-start gap-4">
          <div>
            <h2 className="text-lg font-light text-ink mb-1">Reports & Analytics</h2>
            <p className="text-[13px] text-ink-mute font-light leading-relaxed">
              View revenue, best sellers, & export Excel/CSV files.
            </p>
          </div>
          <Link
            href="/dashboard/reports"
            className="bg-primary text-white px-5 py-2 rounded-full hover:bg-primary-press transition-colors text-[13px] font-medium"
          >
            View Reports
          </Link>
        </div>

        <div className="bg-white p-6 rounded-xl border border-hairline shadow-xs flex flex-col justify-between items-start gap-4">
          <div>
            <h2 className="text-lg font-light text-ink mb-1">Kitchen Display</h2>
            <p className="text-[13px] text-ink-mute font-light leading-relaxed">
              Real-time order statuses via WebSocket for staff.
            </p>
          </div>
          <Link
            href="/kds"
            className="bg-brand-dark text-white px-5 py-2 rounded-full hover:opacity-90 transition-opacity text-[13px] font-medium"
          >
            Open KDS
          </Link>
        </div>
      </div>
    </div>
  );
}
