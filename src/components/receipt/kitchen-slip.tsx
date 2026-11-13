import type { KitchenSlipModel } from "@/lib/receipt";

/**
 * The kitchen slip, printed after the receipt. It starts on a new page
 * (`break-before: page`), so a thermal printer set to cut at the end of each page
 * cuts the receipt off before the slip and the slip off at its end.
 */
export function KitchenSlip({ model, paperSize }: { model: KitchenSlipModel; paperSize: string }) {
  return (
    <>
      <style>{`
        .kitchen-slip { width: ${paperSize}; max-width: 100%; margin: 12px auto 0; padding: 4mm 3mm; background: #fff; color: #000;
          font-family: "Courier New", ui-monospace, monospace; font-size: 14px; line-height: 1.35; }
        .kitchen-slip * { color: #000; }
        .kitchen-slip .center { text-align: center; }
        .kitchen-slip .title { font-size: 18px; font-weight: 700; letter-spacing: 2px; }
        .kitchen-slip .big { font-size: 20px; font-weight: 700; }
        .kitchen-slip hr { border: 0; border-top: 1px dashed #000; margin: 6px 0; }
        .kitchen-slip .row { display: flex; gap: 10px; font-size: 16px; font-weight: 700; padding: 2px 0; }
        .kitchen-slip .qty { min-width: 3ch; text-align: right; }
        .kitchen-slip .detail { padding-left: calc(3ch + 10px); font-size: 13px; font-weight: 400; }
        @media print {
          .kitchen-slip { width: auto; max-width: none; margin: 0; padding: 0; break-before: page; page-break-before: always; }
        }
      `}</style>
      <article className="kitchen-slip" aria-label={`Kitchen slip ${model.billNo}`}>
        <div className="center title">KITCHEN</div>
        <hr />
        <div className="big">{model.billNo}</div>
        {model.orderLine ? <div className="big">{model.orderLine}</div> : null}
        <div>{model.dateText}</div>
        <hr />
        {model.items.map((item, index) => (
          <div key={`${item.name}-${index}`}>
            <div className="row">
              <span className="qty">{item.quantity}</span>
              <span>x {item.name}</span>
            </div>
            {item.details.map((d) => (
              <div className="detail" key={d}>{d}</div>
            ))}
          </div>
        ))}
        {model.notes ? (
          <>
            <hr />
            <div>Note: {model.notes}</div>
          </>
        ) : null}
      </article>
    </>
  );
}
