"use server";

import { prisma } from "../../lib/prisma";

export type DashboardStats = {
  totalSalesToday: number;
  totalOrdersToday: number;
  activeOrders: number;
  preparingOrders: number;
  pendingOrders: number;
  lastWebhookAt: string | null;
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Parallel queries untuk performa
  const [salesResult, totalOrdersToday, activeOrdersResult, lastPaidOrder] =
    await Promise.all([
      // Total penjualan hari ini (hanya order yang sudah settlement)
      prisma.orders.aggregate({
        _sum: { total_amount: true },
        where: {
          payment_status: "settlement",
          created_at: { gte: today },
        },
      }),

      // Jumlah order hari ini
      prisma.orders.count({
        where: { created_at: { gte: today } },
      }),

      // Active orders: pending + preparing + ready (belum selesai)
      prisma.orders.groupBy({
        by: ["status"],
        _count: { status: true },
        where: {
          status: { in: ["pending", "preparing", "ready"] },
        },
      }),

      // Webhook terakhir: order dengan payment_status terbaru
      prisma.orders.findFirst({
        where: { payment_status: "settlement" },
        orderBy: { updated_at: "desc" },
        select: { updated_at: true },
      }),
    ]);

  const statusMap = Object.fromEntries(
    activeOrdersResult.map((r) => [r.status, r._count.status])
  );

  const activeOrders =
    (statusMap["pending"] ?? 0) +
    (statusMap["preparing"] ?? 0) +
    (statusMap["ready"] ?? 0);

  return {
    totalSalesToday: Number(salesResult._sum.total_amount ?? 0),
    totalOrdersToday,
    activeOrders,
    preparingOrders: statusMap["preparing"] ?? 0,
    pendingOrders: statusMap["pending"] ?? 0,
    lastWebhookAt: lastPaidOrder?.updated_at?.toISOString() ?? null,
  };
}
