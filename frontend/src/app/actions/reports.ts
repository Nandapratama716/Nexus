"use server";

import { prisma } from "../../lib/prisma";

export interface TopSellingItem {
  name: string;
  quantity: number;
  totalRevenue: number;
}

export interface FinancialReportData {
  period: string;
  totalOrders: number;
  grossRevenue: number;
  totalDiscounts: number;
  totalTaxes: number;
  totalService: number;
  netRevenue: number;
  cashRevenue: number;
  qrisRevenue: number;
  avgOrderValue: number;
  topSellingItems: TopSellingItem[];
  rawTransactions: Array<{
    id: string;
    createdAt: string;
    tableNumber: string;
    orderType: string;
    paymentMethod: string;
    subtotal: number;
    discount: number;
    tax: number;
    service: number;
    total: number;
    status: string;
  }>;
}

export async function getFinancialReports(period: "today" | "week" | "month" | "all" = "all"): Promise<FinancialReportData> {
  const now = new Date();
  let startDate: Date | undefined;

  if (period === "today") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === "week") {
    startDate = new Date(now);
    startDate.setDate(now.getDate() - 7);
  } else if (period === "month") {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const whereClause = startDate
    ? { created_at: { gte: startDate } }
    : {};

  const orders = await prisma.orders.findMany({
    where: whereClause,
    orderBy: { created_at: "desc" },
  });

  let grossRevenue = 0;
  let totalDiscounts = 0;
  let totalTaxes = 0;
  let totalService = 0;
  let netRevenue = 0;
  let cashRevenue = 0;
  let qrisRevenue = 0;

  const itemMap: Record<string, { quantity: number; totalRevenue: number }> = {};

  const rawTransactions = orders.map((order) => {
    const total = order.total_amount ? Number(order.total_amount.toString()) : 0;
    let subtotal = order.subtotal ? Number(order.subtotal.toString()) : 0;
    let discount = order.discount_amount ? Number(order.discount_amount.toString()) : 0;
    let tax = order.tax_amount ? Number(order.tax_amount.toString()) : 0;
    let service = order.service_charge ? Number(order.service_charge.toString()) : 0;
    const method = (order.payment_method || "qris").toLowerCase();
    const status = order.status || "pending";

    // Fallback kalkulasi jika kolom database lama bernilai 0 / null
    if (subtotal === 0 && total > 0) {
      subtotal = Math.round(total / 1.15); // 10% PB1 tax + 5% service charge = 15%
    }
    if (tax === 0 && subtotal > 0) {
      tax = Math.round((subtotal - discount) * 0.10);
    }
    if (service === 0 && subtotal > 0) {
      service = Math.round((subtotal - discount) * 0.05);
    }

    // Hitung omset & pajak HANYA untuk pesanan yang TIDAK dibatalkan (non-cancelled)
    if (status !== "cancelled") {
      grossRevenue += subtotal;
      totalDiscounts += discount;
      totalTaxes += tax;
      totalService += service;
      netRevenue += total;

      if (method === "cash") {
        cashRevenue += total;
      } else {
        qrisRevenue += total;
      }

      // Hitung item terlaris HANYA untuk pesanan aktif/sukses
      if (order.items) {
        try {
          const items = typeof order.items === "string" ? JSON.parse(order.items) : order.items;
          if (Array.isArray(items)) {
            for (const item of items) {
              const name = item.menu_name || item.name || "Unknown Item";
              const qty = Number(item.quantity) || 1;
              const price = Number(item.price) || 0;
              const itemRev = qty * price;

              if (!itemMap[name]) {
                itemMap[name] = { quantity: 0, totalRevenue: 0 };
              }
              itemMap[name].quantity += qty;
              itemMap[name].totalRevenue += itemRev;
            }
          }
        } catch (err) {
          console.warn("Failed to parse items for order:", order.id, err);
        }
      }
    }

    return {
      id: order.id,
      createdAt: order.created_at ? new Date(order.created_at).toISOString() : new Date().toISOString(),
      tableNumber: order.table_number || "-",
      orderType: order.order_type || "dine_in",
      paymentMethod: method,
      subtotal,
      discount,
      tax,
      service,
      total,
      status,
    };
  });

  const topSellingItems: TopSellingItem[] = Object.entries(itemMap)
    .map(([name, stat]) => ({
      name,
      quantity: stat.quantity,
      totalRevenue: stat.totalRevenue,
    }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  const validOrdersCount = rawTransactions.filter((t) => t.status !== "cancelled").length;
  const avgOrderValue = validOrdersCount > 0 ? netRevenue / validOrdersCount : 0;

  return {
    period,
    totalOrders: orders.length,
    grossRevenue,
    totalDiscounts,
    totalTaxes,
    totalService,
    netRevenue,
    cashRevenue,
    qrisRevenue,
    avgOrderValue,
    topSellingItems,
    rawTransactions,
  };
}
