// Review-stage panel: aggregate coverage summary + the recording/storage plan.
// A legend explains the quality bands so the installer can read the canvas.

import { CoverageSummary } from "./Inspector";
import { SystemPanel } from "./SystemPanel";

const LEGEND = [
  { c: "var(--accent)", label: "Identify", note: "≥250 px/m — recognise a face" },
  { c: "rgba(124,208,205,0.55)", label: "Recognize", note: "≥125 px/m" },
  { c: "rgba(124,208,205,0.32)", label: "Detect", note: "≥25 px/m — presence" },
  { c: "var(--bad)", label: "Blind spot", note: "no coverage" },
];

export function ReviewPanel() {
  return (
    <div className="inspector">
      <CoverageSummary />

      <h2>Quality legend</h2>
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {LEGEND.map((l) => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 14, height: 14, borderRadius: 4, background: l.c, flexShrink: 0 }} />
            <span style={{ fontWeight: 600, width: 78 }}>{l.label}</span>
            <span style={{ color: "var(--muted)", fontSize: 12 }}>{l.note}</span>
          </div>
        ))}
      </div>

      <SystemPanel />
    </div>
  );
}
