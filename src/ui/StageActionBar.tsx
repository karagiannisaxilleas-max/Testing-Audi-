// The persistent bottom bar that drives the guided flow: contextual guidance on
// the left, Back / primary action on the right. On the Quote stage the primary
// action exports the client offer and shows a success confirmation.

import { useState } from "react";
import { FLOW_STAGES, useStore, type Stage } from "../state/store";
import { STAGE_META, useGoToStage } from "./flow";
import { buildQuote } from "../engine/quote";
import { deriveBom } from "../engine/catalog";
import { VectorMark } from "./brand";

export function StageActionBar() {
  const stage = useStore((s) => s.stage) as Exclude<Stage, "welcome">;
  const project = useStore((s) => s.project);
  const go = useGoToStage();
  const [exporting, setExporting] = useState(false);
  const [done, setDone] = useState(false);

  const idx = FLOW_STAGES.indexOf(stage);
  const meta = STAGE_META[stage];

  const hasPlan = project.floorPlan !== null;
  const hasCameras = project.cameras.length > 0;
  const calibrated = project.scale !== null;

  // Gate the primary "advance" action and tailor its label + hint.
  let nextLabel = "Continue";
  let canAdvance = true;
  let hint = meta.hint;
  if (stage === "setup") {
    nextLabel = "Start survey";
    canAdvance = hasPlan;
    if (!hasPlan) hint = "Load a floor plan to begin.";
  } else if (stage === "survey") {
    nextLabel = "Review coverage";
    canAdvance = hasCameras;
    if (!hasCameras) hint = "Place at least one camera to continue.";
    else if (!calibrated) hint = "Tip: calibrate the scale so ranges are accurate.";
  } else if (stage === "review") {
    nextLabel = "Build quote";
    canAdvance = hasCameras;
  }

  async function exportOffer() {
    setExporting(true);
    try {
      const { generateReport } = await import("./report");
      const { analyzeForReport } = await import("./reportAnalysis");
      const bom = deriveBom(project.cameras, project.recording, project.catalog);
      const quote = buildQuote(bom, project.catalog, project.pricing);
      generateReport(project, quote, analyzeForReport(project));
      setDone(true);
    } finally {
      setExporting(false);
    }
  }

  function advance() {
    const next = FLOW_STAGES[idx + 1];
    if (next) go(next);
  }

  return (
    <>
      <div className="stage-actions">
        <span className="sa-hint">{hint}</span>
        {idx > 0 && (
          <button onClick={() => go(FLOW_STAGES[idx - 1])}>Back</button>
        )}
        {stage === "quote" ? (
          <button
            className="btn-primary"
            disabled={!hasCameras || exporting}
            onClick={exportOffer}
          >
            {exporting ? "Generating…" : "Export client offer"}
          </button>
        ) : (
          <button className="btn-primary" disabled={!canAdvance} onClick={advance}>
            {nextLabel} →
          </button>
        )}
      </div>

      {done && (
        <div className="success-overlay" onClick={() => setDone(false)}>
          <div className="success-card" onClick={(e) => e.stopPropagation()}>
            <div className="success-check">✓</div>
            <h2 style={{ margin: "0 0 6px", fontSize: 18, textTransform: "none", letterSpacing: 0, color: "var(--text)" }}>
              Offer ready
            </h2>
            <p style={{ color: "var(--muted)", fontSize: 13.5, margin: "0 0 18px" }}>
              Your proposal PDF has been downloaded
              {project.client.name ? ` for ${project.client.name}` : ""}. Send it
              across and you're done.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => setDone(false)}>Keep editing</button>
              <button className="btn-primary" onClick={exportOffer}>Export again</button>
            </div>
            <div style={{ marginTop: 18, opacity: 0.5, display: "grid", placeItems: "center" }}>
              <VectorMark size={22} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
