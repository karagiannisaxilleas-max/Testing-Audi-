// Top progress stepper through Setup → Survey → Review → Quote.
// Stages unlock as prerequisites are met; completed stages show a check.

import { FLOW_STAGES, useStore, type Stage } from "../state/store";
import { STAGE_META, useGoToStage } from "./flow";

export function Stepper() {
  const stage = useStore((s) => s.stage);
  const project = useStore((s) => s.project);
  const go = useGoToStage();

  const hasPlan = project.floorPlan !== null;
  const hasCameras = project.cameras.length > 0;

  // How far the user is allowed to jump.
  function enabled(s: Stage): boolean {
    if (s === "setup") return true;
    if (s === "survey") return hasPlan;
    return hasPlan && hasCameras; // review, quote
  }
  // A stage counts as "done" once its main output exists.
  function done(s: Stage): boolean {
    if (s === "setup") return hasPlan;
    if (s === "survey") return hasCameras && project.scale !== null;
    if (s === "review") return hasCameras;
    return false;
  }

  return (
    <nav className="stepper" aria-label="Workflow">
      {FLOW_STAGES.map((s, i) => {
        const meta = STAGE_META[s as Exclude<Stage, "welcome">];
        const isActive = s === stage;
        const isDone = done(s) && !isActive;
        const cls = `step${isActive ? " active" : ""}${isDone ? " done" : ""}`;
        return (
          <div key={s} style={{ display: "contents" }}>
            {i > 0 && <span className="step-sep" />}
            <button
              className={cls}
              disabled={!enabled(s)}
              onClick={() => go(s)}
              title={meta.hint}
            >
              <span className="step-dot">{isDone ? "✓" : i + 1}</span>
              <span className="step-label">{meta.label}</span>
            </button>
          </div>
        );
      })}
    </nav>
  );
}
