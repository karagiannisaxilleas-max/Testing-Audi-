// Stage-aware canvas toolbar. Survey shows drawing tools; Review and Quote show
// visualisation toggles. Keeping each stage to its own tools removes clutter,
// which matters most on a phone.

import { useStore, type ToolMode } from "../state/store";

const SURVEY_TOOLS: { mode: ToolMode; label: string }[] = [
  { mode: "select", label: "Select" },
  { mode: "calibrate", label: "Calibrate" },
  { mode: "wall", label: "Wall" },
  { mode: "camera", label: "Camera" },
  { mode: "zone", label: "Zone" },
];

export function StageToolbar() {
  const stage = useStore((s) => s.stage);
  const tool = useStore((s) => s.tool);
  const setTool = useStore((s) => s.setTool);
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const zoneKind = useStore((s) => s.zoneKind);
  const setZoneKind = useStore((s) => s.setZoneKind);
  const wallKind = useStore((s) => s.wallKind);
  const setWallKind = useStore((s) => s.setWallKind);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const canUndo = useStore((s) => s.past.length > 0);
  const canRedo = useStore((s) => s.future.length > 0);

  if (stage === "survey") {
    return (
      <div className="toolbar">
        <span className="toolbar-title">Tools</span>
        <div className="group">
          {SURVEY_TOOLS.map((t) => (
            <button
              key={t.mode}
              className={tool === t.mode ? "active" : ""}
              onClick={() => setTool(t.mode)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tool === "wall" && (
          <>
            <div className="sep" />
            <div className="group">
              <button className={wallKind === "full" ? "active" : ""} onClick={() => setWallKind("full")}>Wall</button>
              <button className={wallKind === "glass" ? "active" : ""} onClick={() => setWallKind("glass")}>Window</button>
            </div>
          </>
        )}
        {tool === "zone" && (
          <>
            <div className="sep" />
            <div className="group">
              <button className={zoneKind === "interest" ? "active" : ""} onClick={() => setZoneKind("interest")}>Interest</button>
              <button className={zoneKind === "no-cover" ? "active" : ""} onClick={() => setZoneKind("no-cover")}>No-cover</button>
            </div>
          </>
        )}

        <div className="spacer" />
        <div className="group">
          <button className={view.cones ? "active" : ""} onClick={() => setView({ cones: !view.cones })}>Coverage</button>
        </div>
        <div className="sep" />
        <div className="group">
          <button onClick={undo} disabled={!canUndo}>Undo</button>
          <button onClick={redo} disabled={!canRedo}>Redo</button>
        </div>
      </div>
    );
  }

  // Review + Quote: visualisation toggles only.
  const title = stage === "review" ? "Coverage" : "Presentation";
  return (
    <div className="toolbar">
      <span className="toolbar-title">{title}</span>
      <div className="group">
        <button className={view.cones ? "active" : ""} onClick={() => setView({ cones: !view.cones })}>Coverage</button>
        {stage === "review" && (
          <>
            <button className={view.heatmap ? "active" : ""} onClick={() => setView({ heatmap: !view.heatmap })}>Heatmap</button>
            <button className={view.blindSpots ? "active" : ""} onClick={() => setView({ blindSpots: !view.blindSpots })}>Blind spots</button>
          </>
        )}
        <button
          className={view.night ? "active" : ""}
          title="Night / IR: clamps range and flags glare from windows"
          onClick={() => setView({ night: !view.night })}
        >
          {view.night ? "Night" : "Day"}
        </button>
        <button className={view.threeD ? "active" : ""} title="3D walk view" onClick={() => setView({ threeD: !view.threeD })}>3D</button>
      </div>
    </div>
  );
}
