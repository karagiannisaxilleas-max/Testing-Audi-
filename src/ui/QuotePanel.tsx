// The field-sales quote: derives a bill of materials from the plan, applies the
// installer's margin, and produces a client-ready priced offer (PDF). Prices are
// editable inline (placeholder demo costs until real pricing is loaded).

import { useState } from "react";
import { useStore } from "../state/store";
import { deriveBom } from "../engine/catalog";
import { buildQuote } from "../engine/quote";

const money = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function QuotePanel() {
  const project = useStore((s) => s.project);
  const commit = useStore((s) => s.commit);
  const [exporting, setExporting] = useState(false);

  const bom = deriveBom(project.cameras, project.recording, project.catalog);
  const quote = buildQuote(bom, project.catalog, project.pricing);
  const hasCameras = project.cameras.length > 0;

  async function exportProposal() {
    setExporting(true);
    try {
      const { generateReport } = await import("./report");
      const { analyzeForReport } = await import("./reportAnalysis");
      generateReport(project, quote, analyzeForReport(project));
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <h2 style={{ marginTop: 20 }}>Quote</h2>

      {!hasCameras ? (
        <p style={{ color: "var(--muted)", fontSize: 12 }}>
          Place cameras to generate a bill of materials and price the job.
        </p>
      ) : (
        <>
          <div className="field">
            <div className="label">
              <span>Margin (markup)</span>
              <span>{Math.round(project.pricing.marginPct * 100)}%</span>
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
              <div className="label">Sales tax</div>
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
            <div style={{ flex: 1, alignSelf: "end", color: "var(--muted)", fontSize: 12 }}>
              % on subtotal
            </div>
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

          <div className="summary" style={{ marginTop: 10 }}>
            <div className="summary-row">
              <span>Equipment + labor cost</span>
              <strong>{money(quote.totalCost)}</strong>
            </div>
            <div className="summary-row" style={{ color: "#22c55e" }}>
              <span>Your margin</span>
              <strong>{money(quote.marginAmount)}</strong>
            </div>
            {quote.taxAmount > 0 && (
              <div className="summary-row">
                <span>Tax</span>
                <strong>{money(quote.taxAmount)}</strong>
              </div>
            )}
            <div className="summary-row" style={{ fontSize: 15, marginTop: 4 }}>
              <span>Client price</span>
              <strong style={{ color: "var(--accent)" }}>{money(quote.total)}</strong>
            </div>
          </div>

          <ClientFields />

          <button
            className="active"
            style={{ width: "100%", marginTop: 10 }}
            disabled={exporting}
            onClick={exportProposal}
          >
            {exporting ? "Generating…" : "Export client offer (PDF)"}
          </button>
        </>
      )}
    </>
  );
}

function ClientFields() {
  const client = useStore((s) => s.project.client);
  const commit = useStore((s) => s.commit);
  const set = (field: keyof typeof client) => (v: string) =>
    commit((d) => {
      d.client[field] = v;
    });

  return (
    <>
      <h2 style={{ marginTop: 16 }}>Client</h2>
      <div className="field">
        <input
          placeholder="Client name"
          style={{ width: "100%" }}
          value={client.name}
          onChange={(e) => set("name")(e.target.value)}
        />
      </div>
      <div className="field">
        <input
          placeholder="Company"
          style={{ width: "100%" }}
          value={client.company}
          onChange={(e) => set("company")(e.target.value)}
        />
      </div>
      <div className="field row" style={{ gap: 8 }}>
        <input
          placeholder="Email"
          style={{ flex: 1, minWidth: 0 }}
          value={client.email}
          onChange={(e) => set("email")(e.target.value)}
        />
        <input
          placeholder="Phone"
          style={{ flex: 1, minWidth: 0 }}
          value={client.phone}
          onChange={(e) => set("phone")(e.target.value)}
        />
      </div>
    </>
  );
}
