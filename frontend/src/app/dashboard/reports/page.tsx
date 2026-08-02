"use client";

import { useEffect, useState } from "react";
import { getFinancialReports, FinancialReportData } from "@/app/actions/reports";

export default function ReportsPage() {
  const [period, setPeriod] = useState<"today" | "week" | "month" | "all">("all");
  const [data, setData] = useState<FinancialReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReport(period);
  }, [period]);

  const fetchReport = async (selectedPeriod: "today" | "week" | "month" | "all") => {
    setLoading(true);
    try {
      const res = await getFinancialReports(selectedPeriod);
      setData(res);
    } catch (err) {
      console.error("Failed to fetch report data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!data || data.rawTransactions.length === 0) {
      alert("No transaction data to export.");
      return;
    }

    const headers = [
      "Order ID",
      "Date",
      "Table",
      "Order Type",
      "Payment Method",
      "Subtotal (Rp)",
      "Discount (Rp)",
      "Tax 10% (Rp)",
      "Service 5% (Rp)",
      "Total Final (Rp)",
      "Status",
    ];

    const rows = data.rawTransactions.map((tx) => [
      `"${tx.id}"`,
      `"${new Date(tx.createdAt).toLocaleString("id-ID")}"`,
      `"${tx.tableNumber}"`,
      `"${tx.orderType}"`,
      `"${tx.paymentMethod}"`,
      tx.subtotal,
      tx.discount,
      tx.tax,
      tx.service,
      tx.total,
      `"${tx.status}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Nexus_Financial_Report_${period}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="flex flex-col gap-8 font-sans pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-light text-ink tracking-tight mb-2">Financial Reports & Analytics</h1>
          <p className="text-[15px] text-ink-mute font-light">
            Comprehensive revenue breakdown, tax reports, best sellers, and exportable accounting data.
          </p>
        </div>

        {/* Date Filter Buttons */}
        <div className="flex gap-2 bg-white border border-hairline p-1.5 rounded-full shadow-sm">
          {(["today", "week", "month", "all"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`text-[13px] px-4 py-1.5 rounded-full transition-colors cursor-pointer capitalize ${
                period === p
                  ? "bg-primary text-white font-medium shadow-xs"
                  : "text-ink-mute hover:text-ink"
              }`}
            >
              {p === "today" ? "Today" : p === "week" ? "This Week" : p === "month" ? "This Month" : "All Time"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-ink-mute font-light">Loading financial analytics...</div>
      ) : !data ? (
        <div className="p-12 text-center text-ink-mute font-light">No report data available.</div>
      ) : (
        <>
          {/* KPI Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-hairline p-5 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-[12px] font-medium text-ink-mute uppercase tracking-widest">Net Revenue</span>
                <h3 className="text-2xl font-normal text-primary mt-1">
                  Rp {data.netRevenue.toLocaleString("id-ID")}
                </h3>
              </div>
              <div className="text-[12px] text-ink-mute mt-3 pt-3 border-t border-hairline flex justify-between">
                <span>Gross: Rp {data.grossRevenue.toLocaleString("id-ID")}</span>
                {data.totalDiscounts > 0 && (
                  <span className="text-emerald-600">-Disc: Rp {data.totalDiscounts.toLocaleString("id-ID")}</span>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-hairline p-5 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-[12px] font-medium text-ink-mute uppercase tracking-widest">Total Orders</span>
                <h3 className="text-2xl font-normal text-ink mt-1">{data.totalOrders} Pesanan</h3>
              </div>
              <div className="text-[12px] text-ink-mute mt-3 pt-3 border-t border-hairline">
                Avg Basket Value: Rp {Math.round(data.avgOrderValue).toLocaleString("id-ID")}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-hairline p-5 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-[12px] font-medium text-ink-mute uppercase tracking-widest">Pajak & Service</span>
                <h3 className="text-2xl font-normal text-ink mt-1">
                  Rp {(data.totalTaxes + data.totalService).toLocaleString("id-ID")}
                </h3>
              </div>
              <div className="text-[12px] text-ink-mute mt-3 pt-3 border-t border-hairline flex justify-between">
                <span>Pajak (10%): Rp {data.totalTaxes.toLocaleString("id-ID")}</span>
                <span>Service (5%): Rp {data.totalService.toLocaleString("id-ID")}</span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-hairline p-5 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-[12px] font-medium text-ink-mute uppercase tracking-widest">Metode Pembayaran</span>
                <div className="flex justify-between items-baseline mt-1">
                  <span className="text-lg font-normal text-emerald-700">💵 Rp {data.cashRevenue.toLocaleString("id-ID")}</span>
                  <span className="text-lg font-normal text-primary">📱 Rp {data.qrisRevenue.toLocaleString("id-ID")}</span>
                </div>
              </div>
              <div className="text-[12px] text-ink-mute mt-3 pt-3 border-t border-hairline flex items-center gap-2">
                <div className="flex-1 bg-primary/20 h-2 rounded-full overflow-hidden flex">
                  <div
                    className="bg-emerald-500 h-full"
                    style={{
                      width: `${data.netRevenue > 0 ? (data.cashRevenue / data.netRevenue) * 100 : 50}%`,
                    }}
                  />
                  <div
                    className="bg-primary h-full"
                    style={{
                      width: `${data.netRevenue > 0 ? (data.qrisRevenue / data.netRevenue) * 100 : 50}%`,
                    }}
                  />
                </div>
                <span>Cash vs QRIS</span>
              </div>
            </div>
          </div>

          {/* Export Action Buttons */}
          <div className="flex justify-between items-center bg-canvas-soft border border-hairline p-4 rounded-xl print:hidden">
            <span className="text-[14px] text-ink-mute">
              Showing {data.totalOrders} transaction records for period: <strong className="text-ink capitalize">{period}</strong>
            </span>
            <div className="flex gap-3">
              <button
                onClick={handlePrintPDF}
                className="bg-white border border-hairline text-ink text-[14px] px-4 py-2 rounded-full hover:bg-canvas-soft transition-colors cursor-pointer"
              >
                📄 Print PDF Report
              </button>
              <button
                onClick={handleExportCSV}
                className="bg-primary text-white text-[14px] px-5 py-2 rounded-full hover:bg-primary-press transition-colors shadow-xs cursor-pointer"
              >
                📥 Export Excel / CSV
              </button>
            </div>
          </div>

          {/* Top Selling Items Section */}
          <div className="bg-white rounded-xl border border-hairline shadow-xs p-6">
            <h2 className="text-lg font-light text-ink mb-4">🏆 Top 5 Best Selling Items</h2>
            {data.topSellingItems.length === 0 ? (
              <p className="text-[14px] text-ink-mute font-light">No item breakdown data available for this period.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-hairline text-[12px] font-normal text-ink-mute uppercase tracking-widest">
                      <th className="py-3 px-4">Rank</th>
                      <th className="py-3 px-4">Product Name</th>
                      <th className="py-3 px-4 text-center">Quantity Sold</th>
                      <th className="py-3 px-4 text-right">Total Revenue Generated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topSellingItems.map((item, idx) => (
                      <tr key={idx} className="border-b border-hairline hover:bg-canvas-soft transition-colors">
                        <td className="py-3 px-4 text-[14px] font-medium text-ink">#{idx + 1}</td>
                        <td className="py-3 px-4 text-[14px] text-ink font-medium">{item.name}</td>
                        <td className="py-3 px-4 text-center text-[14px] text-ink">{item.quantity} porsi</td>
                        <td className="py-3 px-4 text-right text-[14px] text-primary font-medium">
                          Rp {item.totalRevenue.toLocaleString("id-ID")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Transaction History Log Table */}
          <div className="bg-white rounded-xl border border-hairline shadow-xs overflow-hidden">
            <div className="p-6 border-b border-hairline">
              <h2 className="text-lg font-light text-ink">📋 Transaction History Log</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-hairline bg-canvas-soft text-[12px] font-normal text-ink-mute uppercase tracking-widest">
                    <th className="p-4">Order ID</th>
                    <th className="p-4">Date & Time</th>
                    <th className="p-4">Table</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Method</th>
                    <th className="p-4 text-right">Subtotal</th>
                    <th className="p-4 text-right">Discount</th>
                    <th className="p-4 text-right">Tax (10%)</th>
                    <th className="p-4 text-right">Total Final</th>
                    <th className="p-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rawTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-ink-mute font-light">
                        No transactions recorded for this period.
                      </td>
                    </tr>
                  ) : (
                    data.rawTransactions.map((tx) => (
                      <tr key={tx.id} className="border-b border-hairline hover:bg-canvas-soft transition-colors text-[14px]">
                        <td className="p-4 font-mono text-[13px] text-ink-mute">{tx.id.substring(0, 12)}</td>
                        <td className="p-4 text-ink-mute">{new Date(tx.createdAt).toLocaleString("id-ID")}</td>
                        <td className="p-4 text-ink">Table {tx.tableNumber}</td>
                        <td className="p-4 text-ink capitalize">{tx.orderType.replace("_", " ")}</td>
                        <td className="p-4 text-ink uppercase font-medium">
                          {tx.paymentMethod === "cash" ? "💵 Cash" : "📱 QRIS"}
                        </td>
                        <td className="p-4 text-right text-ink">Rp {tx.subtotal.toLocaleString("id-ID")}</td>
                        <td className="p-4 text-right text-emerald-600">
                          {tx.discount > 0 ? `-Rp ${tx.discount.toLocaleString("id-ID")}` : "-"}
                        </td>
                        <td className="p-4 text-right text-ink-mute">Rp {tx.tax.toLocaleString("id-ID")}</td>
                        <td className="p-4 text-right text-primary font-medium">Rp {tx.total.toLocaleString("id-ID")}</td>
                        <td className="p-4 text-center">
                          <span
                            className={`text-[11px] px-2.5 py-1 rounded-full uppercase font-medium ${
                              tx.status === "done"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : tx.status === "cancelled"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
