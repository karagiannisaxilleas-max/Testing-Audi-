import { lazy, Suspense, useEffect, useState } from "react";
import { useStore } from "../state/store";
import { VectorLogo } from "./brand";
import { AppHeader } from "./AppHeader";
import { Welcome } from "./Welcome";
import { SetupStage } from "./SetupStage";
import { StageToolbar } from "./StageToolbar";
import { SidePanel } from "./SidePanel";
import { StageActionBar } from "./StageActionBar";
import { StatusBar } from "./StatusBar";
import { FloorPlanCanvas } from "./FloorPlanCanvas";
import { loadAutosaved, useAutosave } from "./useAutosave";

// three.js is heavy; only load it when the user switches to 3D.
const View3D = lazy(() => import("./View3D").then((m) => ({ default: m.View3D })));

export function App() {
  const stage = useStore((s) => s.stage);
  const threeD = useStore((s) => s.view.threeD);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const replaceProject = useStore((s) => s.replaceProject);
  const setStage = useStore((s) => s.setStage);
  // Bottom-sheet side panel on phones; always visible on desktop via CSS.
  const [panelOpen, setPanelOpen] = useState(false);

  // Restore the last autosaved project once on startup. Resume into the survey
  // if there is already work in progress; otherwise land on the welcome screen.
  useEffect(() => {
    const restored = loadAutosaved();
    if (restored) {
      replaceProject(restored);
      if (restored.floorPlan || restored.cameras.length > 0) setStage("survey");
    }
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

  // Welcome screen takes over the whole viewport (brand only, no stepper).
  if (stage === "welcome") {
    return (
      <div className="app">
        <header className="app-header">
          <div className="header-brand">
            <VectorLogo size={24} />
          </div>
        </header>
        <Welcome />
      </div>
    );
  }

  const showCanvas = stage === "survey" || stage === "review" || stage === "quote";

  return (
    <div className="app">
      <AppHeader />

      {stage === "setup" && <SetupStage />}

      {showCanvas && (
        <div className="work">
          <StageToolbar />
          <div className="canvas-area">
            {threeD ? (
              <Suspense fallback={<div className="empty-hint">Loading 3D…</div>}>
                <View3D />
              </Suspense>
            ) : (
              <FloorPlanCanvas />
            )}
            <StatusBar />
            <button className="panel-toggle" onClick={() => setPanelOpen((v) => !v)}>
              {panelOpen ? "Close" : "Details ▴"}
            </button>
          </div>
          <SidePanel open={panelOpen} />
        </div>
      )}

      <StageActionBar />
    </div>
  );
}
