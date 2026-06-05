// Quote-stage panel: bill of materials priced with the installer's margin.
// Prices are editable inline (placeholder demo costs until real pricing loads).
// The export action lives in the stage action bar; this panel is the editor.

import { useStore } from "../state/store";
import { deriveBom } from "../engine/catalog";
import { buildQuote } from "../engine/quote";

const money = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function QuotePanel() {
  const project = useStore((s) => s.project);
  const commit = useStore((s) => s.commit);

  const bom = deriveBom(project.cameras, project.recording, project.catalog);
  const quote = buildQuote(bom, project.catalog, project.pricing);
  const hasCameras = project.cameras.length > 0;

  if (!hasCameras) {
    return (
      <div className="inspector">
        <div className="card" style={{ color: "var(--muted)", fontSize: 12.5 }}>
          Place cameras in the Survey step to generate a bill of materials and
          price the job.
        </div>
      </div>
    );
  }

  return (
    <div className="inspector">
      {project.client.name && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: "var(--muted-2)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Prepared for
          </div>
          <div style={{ fontWeight: 650, marginTop: 2 }}>{project.client.name}</div>
          {project.client.company && (
            <div style={{ color: "var(--muted)", fontSize: 12.5 }}>{project.client.company}</div>
          )}
        </div>
      )}

      <div className="field">
        <div className="label">
          <span>Margin (markup)</span>
          <span style={{ color: "var(--accent)" }}>{Math.round(project.pricing.marginPct * 100)}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round(project.pricing.marginPct * 100)}
          onChange={(e) =>
            commit((d) => {
              d.pricing.marginPct = parseInt(e.target.value, 10) / 100;
            })
          }
        />
      </div>

      <div className="field row" style={{ gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div className="label">Sales tax %</div>
          <input
            type="number"
            min={0}
            step={0.5}
            value={Math.round((project.pricing.taxPct ?? 0) * 1000) / 10}
            onChange={(e) =>
              commit((d) => {
                d.pricing.taxPct = (parseFloat(e.target.value) || 0) / 100;
              })
            }
            style={{ width: "100%" }}
          />
        </div>
        <div style={{ flex: 1, alignSelf: "end", color: "var(--muted)", fontSize: 12 }}>on subtotal</div>
      </div>

      <div className="quote-table">
        <div className="quote-head">
          <span>Item</span>
          <span>Qty</span>
          <span>Unit cost</span>
          <span>Price</span>
        </div>
        {quote.lines.map((l) => (
          <div className="quote-line" key={l.productId}>
            <span className="q-name" title={l.sku}>{l.name}</span>
            <span className="q-qty">{l.qty}</span>
            <input
              className="q-cost"
              type="number"
              min={0}
              value={l.unitCost}
              onChange={(e) =>
                commit((d) => {
                  const p = d.catalog.find((p) => p.id === l.productId);
                  if (p) p.unitCost = parseFloat(e.target.value) || 0;
                })
              }
            />
            <span className="q-price">{money(l.linePrice)}</span>
          </div>
        ))}
      </div>

      <div className="summary" style={{ marginTop: 12 }}>
        <div className="summary-row">
          <span>Equipment + labor cost</span>
          <strong>{money(quote.totalCost)}</strong>
        </div>
        <div className="summary-row">
          <span>Your margin</span>
          <strong style={{ color: "var(--good)" }}>{money(quote.marginAmount)}</strong>
        </div>
        {quote.taxAmount > 0 && (
          <div className="summary-row">
            <span>Tax</span>
            <strong>{money(quote.taxAmount)}</strong>
          </div>
        )}
        <div className="summary-row" style={{ fontSize: 16, marginTop: 6, paddingTop: 8, borderTop: "1px solid var(--border-soft)" }}>
          <span style={{ color: "var(--text)" }}>Client price</span>
          <strong style={{ color: "var(--accent)" }}>{money(quote.total)}</strong>
        </div>
      </div>

      <p style={{ color: "var(--muted-2)", fontSize: 11.5, lineHeight: 1.5 }}>
        Prices are placeholder demo values — edit any unit cost to match your
        Vector Security pricing. Tap “Export client offer” below to generate the
        proposal PDF.
      </p>
    </div>
  );
}
