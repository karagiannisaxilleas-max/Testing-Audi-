import { useEffect } from "react";
import { useStore } from "../state/store";
import { Toolbar } from "./Toolbar";
import { Inspector } from "./Inspector";
import { StatusBar } from "./StatusBar";
import { FloorPlanCanvas } from "./FloorPlanCanvas";

export function App() {
  const hasPlan = useStore((s) => s.project.floorPlan !== null);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);

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
        <FloorPlanCanvas />
        {!hasPlan && (
          <div className="empty-hint">
            <div style={{ fontSize: 16 }}>No floor plan loaded</div>
            <div>Click “Load Plan” to import a PNG or JPG, then scroll to zoom and drag to pan.</div>
          </div>
        )}
        <StatusBar />
      </div>
      <Inspector />
    </div>
  );
}
