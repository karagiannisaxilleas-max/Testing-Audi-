// Top toolbar: file actions, undo/redo, and tool-mode selection.
// Tool modes beyond Select are wired in their respective phases; the buttons
// exist now so the interaction model is visible and the store is exercised.

import { useRef } from "react";
import { useStore, type ToolMode } from "../state/store";
import { useFloorPlanLoader } from "./useFloorPlanLoader";
import { downloadProject, readProjectFile } from "./projectIO";

// `phase` > 0 marks a tool whose behaviour lands in a later phase; those
// buttons are disabled and explain themselves via a tooltip.
const TOOLS: { mode: ToolMode; label: string; phase: number }[] = [
  { mode: "select", label: "Select", phase: 0 },
  { mode: "calibrate", label: "Calibrate", phase: 0 },
  { mode: "camera", label: "Camera", phase: 0 },
  { mode: "wall", label: "Wall", phase: 0 },
  { mode: "zone", label: "Zone", phase: 0 },
];

export function Toolbar() {
  const tool = useStore((s) => s.tool);
  const setTool = useStore((s) => s.setTool);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const canUndo = useStore((s) => s.past.length > 0);
  const canRedo = useStore((s) => s.future.length > 0);
  const project = useStore((s) => s.project);
  const replaceProject = useStore((s) => s.replaceProject);
  const commit = useStore((s) => s.commit);
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const zoneKind = useStore((s) => s.zoneKind);
  const setZoneKind = useStore((s) => s.setZoneKind);
  const wallKind = useStore((s) => s.wallKind);
  const setWallKind = useStore((s) => s.setWallKind);

  const loadFloorPlan = useFloorPlanLoader();
  const planInputRef = useRef<HTMLInputElement>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="toolbar">
      <div className="group">
        <button onClick={() => planInputRef.current?.click()}>Load Plan</button>
        <input
          ref={planInputRef}
          className="hidden-input"
          type="file"
          accept="image/png,image/jpeg"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void loadFloorPlan(file);
            e.target.value = "";
          }}
        />
      </div>

      <div className="sep" />

      <div className="group">
        {TOOLS.map((t) => (
          <button
            key={t.mode}
            className={tool === t.mode ? "active" : ""}
            disabled={t.phase > 0}
            title={t.phase > 0 ? `Coming in Phase ${t.phase}` : undefined}
            onClick={() => setTool(t.mode)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tool === "zone" && (
        <>
          <div className="sep" />
          <div className="group">
            <button
              className={zoneKind === "interest" ? "active" : ""}
              onClick={() => setZoneKind("interest")}
            >
              Interest
            </button>
            <button
              className={zoneKind === "no-cover" ? "active" : ""}
              onClick={() => setZoneKind("no-cover")}
            >
              No-cover
            </button>
          </div>
        </>
      )}

      {tool === "wall" && (
        <>
          <div className="sep" />
          <div className="group">
            <button
              className={wallKind === "full" ? "active" : ""}
              onClick={() => setWallKind("full")}
            >
              Wall
            </button>
            <button
              className={wallKind === "glass" ? "active" : ""}
              onClick={() => setWallKind("glass")}
            >
              Window
            </button>
          </div>
        </>
      )}

      <div className="sep" />

      <div className="group">
        <button
          className={view.cones ? "active" : ""}
          onClick={() => setView({ cones: !view.cones })}
        >
          Coverage
        </button>
        <button
          className={view.heatmap ? "active" : ""}
          onClick={() => setView({ heatmap: !view.heatmap })}
        >
          Heatmap
        </button>
        <button
          className={view.blindSpots ? "active" : ""}
          onClick={() => setView({ blindSpots: !view.blindSpots })}
        >
          Blind spots
        </button>
        <button
          className={view.night ? "active" : ""}
          title="Night / IR: clamps range and flags glare from windows"
          onClick={() => setView({ night: !view.night })}
        >
          {view.night ? "Night (IR)" : "Day"}
        </button>
      </div>

      <div className="sep" />

      <div className="group">
        <button onClick={undo} disabled={!canUndo}>
          Undo
        </button>
        <button onClick={redo} disabled={!canRedo}>
          Redo
        </button>
      </div>

      <div className="spacer" />

      <div className="group">
        <button
          title="Toggle metric / imperial units"
          onClick={() =>
            commit((d) => {
              d.units = d.units === "metric" ? "imperial" : "metric";
            })
          }
        >
          {project.units === "metric" ? "Metric (m)" : "Imperial (ft)"}
        </button>
      </div>

      <div className="sep" />

      <div className="group">
        <button onClick={() => downloadProject(project)}>Save</button>
        <button onClick={() => projectInputRef.current?.click()}>Load</button>
        <input
          ref={projectInputRef}
          className="hidden-input"
          type="file"
          accept=".json,application/json"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) {
              try {
                replaceProject(await readProjectFile(file));
              } catch (err) {
                alert(`Could not load project: ${(err as Error).message}`);
              }
            }
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
