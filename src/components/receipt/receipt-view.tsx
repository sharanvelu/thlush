import { D } from "@/lib/money";
import { money, type ReceiptModel } from "@/lib/receipt";
import { formatMoney } from "@/lib/money";

/**
 * The thermal receipt. Always black on white, whatever the app theme, and sized
 * to the paper (`@page size: 80mm auto`) so the printer feeds exactly the right length.
 */
export function ReceiptView({ model }: { model: ReceiptModel }) {
  const m = (value: string) => money(model, value);
  const wide = model.paperSize === "80mm";
  const total = formatMoney(model.totals.total, { currency: model.currency, locale: model.locale });

  return (
    <>
      <style>{`
        @page { size: ${model.paperSize} auto; margin: 2mm; }
        .receipt { width: ${model.paperSize}; max-width: 100%; margin: 0 auto; padding: 4mm 3mm; background: #fff; color: #000;
          font-family: "Courier New", ui-monospace, monospace; font-size: 11px; line-height: 1.35; }
        .receipt * { color: #000; }
        .receipt .center { text-align: center; }
        .receipt .right { text-align: right; }
        .receipt .bold { font-weight: 700; }
        .receipt .name { font-size: 15px; font-weight: 700; }
        .receipt hr { border: 0; border-top: 1px dashed #000; margin: 6px 0; }
        .receipt table { width: 100%; border-collapse: collapse; }
        .receipt th { text-align: left; font-weight: 700; padding-bottom: 2px; }
        .receipt th.num, .receipt td.num { text-align: right; white-space: nowrap; padding-left: 8px; }
        .receipt td { vertical-align: top; padding: 1px 0; }
        .receipt .kv { display: flex; justify-content: space-between; gap: 8px; }
        .receipt .total { font-size: 14px; font-weight: 700; }
        .receipt .note { font-style: italic; padding-left: 8px; }
        .receipt .stamp { font-size: 14px; font-weight: 700; letter-spacing: 2px; margin: 4px 0; }
        @media print {
          html, body { background: #fff !important; }
          .receipt { width: auto; max-width: none; padding: 0; margin: 0; box-shadow: none; }
        }
      `}</style>
      <article className="receipt" aria-label={`Receipt ${model.billNo}`}>
        <header className="center">
          {model.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- a small logo saved in settings
            <img src={model.logoUrl} alt="" style={{ maxHeight: 48, maxWidth: "60%", margin: "0 auto 4px", filter: "grayscale(1) contrast(1.2)" }} />
          ) : null}
          <div className="name">{model.businessName}</div>
          {model.addressLines.map((line) => (
            <div key={line}>{line}</div>
          ))}
          {model.phone ? <div>Phone: {model.phone}</div> : null}
          {model.gstin ? <div>GSTIN: {model.gstin}</div> : null}
          {model.headerText ? <div>{model.headerText}</div> : null}
        </header>
        <hr />

        {model.statusNote ? <div className="center stamp">{model.statusNote}</div> : null}
        <div className="kv"><span>Bill no</span><span className="bold">{model.billNo}</span></div>
        <div className="kv"><span>Date</span><span>{model.dateText}</span></div>
        <div className="kv"><span>Customer</span><span>{model.customerName}</span></div>
        {model.customerPhone ? <div className="kv"><span>Phone</span><span>{model.customerPhone}</span></div> : null}
        {model.cashierName ? <div className="kv"><span>Cashier</span><span>{model.cashierName}</span></div> : null}
        {model.orderLine ? <div className="kv"><span>Order</span><span>{model.orderLine}</span></div> : null}
        <hr />

        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th className="num">Qty</th>
              {wide ? <th className="num">Price</th> : null}
              <th className="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {model.items.map((item, index) => (
              <tr key={`${item.name}-${index}`}>
                <td>
                  {item.name}
                  {item.note ? <div className="note">{item.note}</div> : null}
                </td>
                <td className="num">{item.quantity}</td>
                {wide ? <td className="num">{m(item.unitPrice)}</td> : null}
                <td className="num">{m(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <hr />

        <div className="kv"><span>Items</span><span>{model.itemCount}</span></div>
        <div className="kv"><span>Subtotal</span><span>{m(model.totals.subtotal)}</span></div>
        {new D(model.totals.discount).greaterThan(0) ? (
          <div className="kv"><span>Discount</span><span>-{m(model.totals.discount)}</span></div>
        ) : null}
        {model.showTax ? (
          <>
            <div className="kv"><span>SGST</span><span>{m(model.totals.sgst)}</span></div>
            <div className="kv"><span>CGST</span><span>{m(model.totals.cgst)}</span></div>
          </>
        ) : null}
        <hr />
        <div className="kv total"><span>TOTAL</span><span>{total}</span></div>
        <hr />

        {model.payments.map((p, index) => (
          <div className="kv" key={`${p.label}-${index}`}>
            <span>Paid by {p.label}{p.reference ? ` (${p.reference})` : ""}</span>
            <span>{m(p.amount)}</span>
          </div>
        ))}
        {model.received ? <div className="kv"><span>Cash received</span><span>{m(model.received)}</span></div> : null}
        {model.change ? <div className="kv"><span>Change</span><span>{m(model.change)}</span></div> : null}
        {model.notes ? <div style={{ marginTop: 4 }}>Note: {model.notes}</div> : null}

        {model.footerText ? (
          <>
            <hr />
            <footer className="center">{model.footerText}</footer>
          </>
        ) : null}
      </article>
    </>
  );
}
