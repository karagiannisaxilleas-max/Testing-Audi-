// App header: brand lockup, the workflow stepper, and global actions
// (units, save/load project, new survey).

import { useRef } from "react";
import { useStore } from "../state/store";
import { VectorLogo } from "./brand";
import { Stepper } from "./Stepper";
import { downloadProject, readProjectFile } from "./projectIO";
import { useGoToStage } from "./flow";

export function AppHeader() {
  const project = useStore((s) => s.project);
  const commit = useStore((s) => s.commit);
  const replaceProject = useStore((s) => s.replaceProject);
  const setStage = useStore((s) => s.setStage);
  const go = useGoToStage();
  const projectInputRef = useRef<HTMLInputElement>(null);

  return (
    <header className="app-header">
      <div
        className="header-brand"
        onClick={() => setStage("welcome")}
        title="Vector Security — home"
      >
        <VectorLogo size={24} />
      </div>

      <Stepper />

      <div className="header-actions">
        <button
          title="Toggle metric / imperial units"
          onClick={() =>
            commit((d) => {
              d.units = d.units === "metric" ? "imperial" : "metric";
            })
          }
        >
          {project.units === "metric" ? "m" : "ft"}
        </button>
        <button onClick={() => downloadProject(project)} title="Save project file">
          Save
        </button>
        <button onClick={() => projectInputRef.current?.click()} title="Open project file">
          Open
        </button>
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
                go("survey");
              } catch (err) {
                alert(`Could not load project: ${(err as Error).message}`);
              }
            }
            e.target.value = "";
          }}
        />
      </div>
    </header>
  );
}
