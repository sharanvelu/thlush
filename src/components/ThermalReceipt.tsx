import {BillingItem as TypeBillingItem} from "@/types/billing";
import {calculateTotalTaxPriceValue, calculateTotalValue, shouldIgnoreTax} from "@/helpers";

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function buildReceiptHtml(
  billId: number,
  customerName: string,
  billingItems: TypeBillingItem[],
  date: string,
): string {
  const subtotal = billingItems.reduce(
    (sum: number, item: TypeBillingItem): number => sum + (item.price * item.quantity), 0
  );
  const tax = billingItems.reduce(
    (sum: number, item: TypeBillingItem): number => sum + calculateTotalTaxPriceValue(item.price, item.sgst, item.cgst, item.quantity), 0
  );
  const total = billingItems.reduce(
    (sum: number, item: TypeBillingItem): number => sum + calculateTotalValue(item.price, item.sgst, item.cgst, item.quantity), 0
  );
  const totalQty = billingItems.reduce(
    (sum: number, item: TypeBillingItem): number => sum + item.quantity, 0
  );

  const itemRows: string = billingItems.map((item: TypeBillingItem): string => {
    // Price = base price + tax per unit
    const unitPrice: number = calculateTotalValue(item.price, item.sgst, item.cgst, 1);
    // Amount = Price * Qty
    const amount: number = calculateTotalValue(item.price, item.sgst, item.cgst, item.quantity);
    return `
      <tr>
        <td>${escapeHtml(item.name)}</td>
        <td class="right">${item.quantity}</td>
        <td class="right">${unitPrice.toFixed(2)}</td>
        <td class="right">${amount.toFixed(2)}</td>
      </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt #${billId}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 2mm;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      width: 80mm;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      color: #000;
      background: #fff;
      padding: 4mm;
    }
    .header {
      text-align: center;
      margin-bottom: 8px;
    }
    .header h2 {
      font-size: 16px;
      font-weight: bold;
    }
    .header p {
      font-size: 11px;
      margin-top: 2px;
    }
    .divider {
      border: none;
      border-top: 1px dashed #000;
      margin: 6px 0;
    }
    .info {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      margin-bottom: 2px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    th {
      text-align: left;
      padding: 2px 0;
      border-bottom: 1px solid #000;
      font-size: 10px;
    }
    th.right, td.right {
      text-align: right;
    }
    td {
      padding: 2px 0;
      vertical-align: top;
    }
    .totals {
      font-size: 11px;
    }
    .totals .row {
      display: flex;
      justify-content: space-between;
      padding: 1px 0;
    }
    .totals .grand-total {
      font-size: 14px;
      font-weight: bold;
    }
    .footer {
      text-align: center;
      font-size: 11px;
      margin-top: 8px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h2>Thlush</h2>
    <p>Thank you for your order!</p>
  </div>

  <hr class="divider">

  <div class="info">
    <span>Bill #: ${billId}</span>
    <span>${escapeHtml(date)}</span>
  </div>
  <div class="info">
    <span>Customer: ${escapeHtml(customerName)}</span>
  </div>

  <hr class="divider">

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th class="right">Qty</th>
        <th class="right">Price</th>
        <th class="right">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <hr class="divider">

  <div class="totals">
    <div class="row">
      <span>Total Items: ${totalQty}</span>
    </div>
    <div class="row">
      <span>Subtotal:</span>
      <span>₹${subtotal.toFixed(2)}</span>
    </div>
    ${!shouldIgnoreTax() ? `
    <div class="row">
      <span>Tax:</span>
      <span>₹${tax.toFixed(2)}</span>
    </div>
    ` : ''}
    <hr class="divider">
    <div class="row grand-total">
      <span>TOTAL:</span>
      <span>₹${total.toFixed(2)}</span>
    </div>
  </div>

  <hr class="divider">

  <div class="footer">
    <p>Thank you, visit again!</p>
  </div>
</body>
</html>`;
}
