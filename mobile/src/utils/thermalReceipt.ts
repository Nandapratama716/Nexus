export interface ReceiptData {
  orderId: string;
  tableNumber: string;
  orderType: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    subtotal: number;
    notes?: string;
  }>;
  subtotal: number;
  promoCode?: string;
  discountAmount: number;
  taxAmount: number;
  serviceCharge: number;
  totalAmount: number;
  paymentMethod: string;
  cashPaid?: number;
  cashChange?: number;
  dateStr?: string;
}

/**
 * Generates formatted text layout for 58mm / 80mm ESC/POS Thermal Receipt Printers.
 */
export function generateThermalReceiptText(data: ReceiptData): string {
  const dateStr = data.dateStr || new Date().toLocaleString("id-ID");
  const line = "--------------------------------";
  const doubleLine = "================================";

  let text = "";
  text += "        NEXUS RESTO & CAFE       \n";
  text += "    Jl. Malioboro No. 12, YGK   \n";
  text += "       Telp: (0274) 555-1234    \n";
  text += `${line}\n`;
  text += `Order ID : ${data.orderId.substring(0, 16)}\n`;
  text += `Tgl      : ${dateStr}\n`;
  text += `Meja     : ${data.tableNumber || "-"} (${data.orderType === "takeaway" ? "Takeaway" : "Dine In"})\n`;
  text += `${line}\n`;

  // Item List
  data.items.forEach((item) => {
    text += `${item.name}\n`;
    const qtyPrice = `${item.quantity} x Rp ${item.price.toLocaleString("id-ID")}`;
    const itemSubtotal = `Rp ${item.subtotal.toLocaleString("id-ID")}`;
    text += `${qtyPrice.padEnd(20)}${itemSubtotal.padStart(12)}\n`;
    if (item.notes) {
      text += `  * Notes: ${item.notes}\n`;
    }
  });

  text += `${line}\n`;

  // Financial Breakdown
  const subtotalStr = `Rp ${data.subtotal.toLocaleString("id-ID")}`;
  text += `Subtotal           :${subtotalStr.padStart(13)}\n`;

  if (data.discountAmount > 0) {
    const discStr = `-Rp ${data.discountAmount.toLocaleString("id-ID")}`;
    text += `Promo (${data.promoCode || "DISC"}):${discStr.padStart(13)}\n`;
  }

  const taxStr = `Rp ${data.taxAmount.toLocaleString("id-ID")}`;
  text += `Pajak PB1 (10%)    :${taxStr.padStart(13)}\n`;

  const serviceStr = `Rp ${data.serviceCharge.toLocaleString("id-ID")}`;
  text += `Service (5%)       :${serviceStr.padStart(13)}\n`;

  text += `${doubleLine}\n`;

  const totalStr = `Rp ${data.totalAmount.toLocaleString("id-ID")}`;
  text += `TOTAL              :${totalStr.padStart(13)}\n`;

  const methodStr = data.paymentMethod.toUpperCase();
  text += `Metode Bayar       :${methodStr.padStart(13)}\n`;

  if (data.paymentMethod === "cash" && data.cashPaid) {
    const paidStr = `Rp ${data.cashPaid.toLocaleString("id-ID")}`;
    const changeStr = `Rp ${(data.cashChange || 0).toLocaleString("id-ID")}`;
    text += `Uang Diterima      :${paidStr.padStart(13)}\n`;
    text += `Kembalian          :${changeStr.padStart(13)}\n`;
  }

  text += `${doubleLine}\n`;
  text += "   Terima kasih atas kunjungan! \n";
  text += "      Powered by Nexus POS      \n\n\n";

  return text;
}
