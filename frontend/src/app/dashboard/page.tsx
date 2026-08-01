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
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-light text-ink tracking-tight mb-2">
          Dashboard Overview
        </h1>
        <p className="text-[15px] text-ink-mute font-light">
          Welcome back! Here is what&apos;s happening at Nexus today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Sales */}
        <div className="bg-white p-6 rounded-xl border border-hairline shadow-sm">
          <h3 className="text-[14px] text-ink-mute uppercase tracking-widest mb-2">
            Total Sales Today
          </h3>
          <div className="text-3xl font-light text-ink tabular-nums">
            {formatRupiah(stats.totalSalesToday)}
          </div>
          <div className="text-[13px] text-ink-mute mt-2">
            {stats.totalOrdersToday} orders placed today
          </div>
        </div>

        {/* Active Orders */}
        <div className="bg-white p-6 rounded-xl border border-hairline shadow-sm">
          <h3 className="text-[14px] text-ink-mute uppercase tracking-widest mb-2">
            Active Orders
          </h3>
          <div className="text-3xl font-light text-ink tabular-nums">
            {stats.activeOrders}
          </div>
          <div className="text-[13px] text-ink-mute mt-2">
            {stats.preparingOrders} in kitchen &middot; {stats.pendingOrders} pending
          </div>
        </div>

        {/* Midtrans Webhook */}
        <div className="bg-brand-dark p-6 rounded-xl shadow-md text-white">
          <h3 className="text-[14px] text-white/70 uppercase tracking-widest mb-2">
            Midtrans Webhook
          </h3>
          <div className="text-3xl font-light tabular-nums">
            {stats.lastWebhookAt ? "Online" : "Standby"}
          </div>
          <div className="text-[13px] text-[#10B981] mt-2">
            Last sync: {formatRelativeTime(stats.lastWebhookAt)}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-xl border border-hairline shadow-sm flex flex-col items-start gap-4">
          <div>
            <h2 className="text-xl font-light text-ink mb-1">Menu Manager</h2>
            <p className="text-[15px] text-ink-mute font-light">
              Add, update, or toggle availability. Changes sync to AI & KDS instantly.
            </p>
          </div>
          <Link
            href="/dashboard/menu"
            className="bg-primary text-white px-6 py-2 rounded-full hover:bg-primary-press transition-colors text-[15px]"
          >
            Manage Menus
          </Link>
        </div>

        <div className="bg-white p-8 rounded-xl border border-hairline shadow-sm flex flex-col items-start gap-4">
          <div>
            <h2 className="text-xl font-light text-ink mb-1">Kitchen Display</h2>
            <p className="text-[15px] text-ink-mute font-light">
              Monitor and update order statuses in real-time via WebSocket.
            </p>
          </div>
          <Link
            href="/kds"
            className="bg-brand-dark text-white px-6 py-2 rounded-full hover:opacity-90 transition-opacity text-[15px]"
          >
            Open KDS
          </Link>
        </div>
      </div>
    </div>
  );
}
