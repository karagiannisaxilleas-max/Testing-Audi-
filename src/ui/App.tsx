import { lazy, Suspense, useEffect, useState } from "react";
import { useStore } from "../state/store";
import { Toolbar } from "./Toolbar";
import { Inspector } from "./Inspector";
import { StatusBar } from "./StatusBar";
import { FloorPlanCanvas } from "./FloorPlanCanvas";
import { loadAutosaved, useAutosave } from "./useAutosave";

// three.js is heavy; only load it when the user switches to 3D.
const View3D = lazy(() => import("./View3D").then((m) => ({ default: m.View3D })));

export function App() {
  const hasPlan = useStore((s) => s.project.floorPlan !== null);
  const threeD = useStore((s) => s.view.threeD);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const replaceProject = useStore((s) => s.replaceProject);
  // Bottom-sheet inspector on phones; always visible on desktop via CSS.
  const [panelOpen, setPanelOpen] = useState(false);

  // Restore the last autosaved project once on startup, then keep it saved.
  useEffect(() => {
    const restored = loadAutosaved();
    if (restored) replaceProject(restored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useAutosave();

  // Keyboard undo/redo (Cmd/Ctrl+Z, Shift for redo).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  return (
    <div className="app">
      <Toolbar />
      <div className="canvas-area">
        {threeD ? (
          <Suspense fallback={<div className="empty-hint">Loading 3D…</div>}>
            <View3D />
          </Suspense>
        ) : (
          <FloorPlanCanvas />
        )}
        {!hasPlan && !threeD && (
          <div className="empty-hint">
            <div style={{ fontSize: 16 }}>No floor plan loaded</div>
            <div>Click “Load Plan” to import a PNG or JPG, then scroll to zoom and drag to pan.</div>
          </div>
        )}
        <StatusBar />
        <button
          className="panel-toggle"
          onClick={() => setPanelOpen((v) => !v)}
        >
          {panelOpen ? "Close" : "Details ▴"}
        </button>
      </div>
      <Inspector className={panelOpen ? "open" : ""} />
    </div>
  );
}
