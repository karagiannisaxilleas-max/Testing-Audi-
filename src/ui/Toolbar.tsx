// Top toolbar: file actions, undo/redo, and tool-mode selection.
// Tool modes beyond Select are wired in their respective phases; the buttons
// exist now so the interaction model is visible and the store is exercised.

import { useRef } from "react";
import { useStore, type ToolMode } from "../state/store";
import { useFloorPlanLoader } from "./useFloorPlanLoader";
import { downloadProject, readProjectFile } from "./projectIO";

const TOOLS: { mode: ToolMode; label: string; phase: number }[] = [
  { mode: "select", label: "Select", phase: 0 },
  { mode: "calibrate", label: "Calibrate", phase: 1 },
  { mode: "wall", label: "Wall", phase: 2 },
  { mode: "zone", label: "Zone", phase: 4 },
  { mode: "camera", label: "Camera", phase: 1 },
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
            title={t.phase > 0 ? `Coming in Phase ${t.phase}` : undefined}
            onClick={() => setTool(t.mode)}
          >
            {t.label}
          </button>
        ))}
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
