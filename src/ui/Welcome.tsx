// Landing screen shown before a project is started. Branded entry point with a
// clear primary action and a resume option when a survey is already in progress.

import { useRef } from "react";
import { useStore } from "../state/store";
import { createEmptyProject } from "../state/project";
import { VectorMark } from "./brand";
import { readProjectFile } from "./projectIO";
import { useGoToStage } from "./flow";

const FEATURES = [
  { icon: "◳", title: "Plan on site", desc: "Photograph a floor plan and lay out cameras from your phone." },
  { icon: "◉", title: "Prove coverage", desc: "See identify-grade coverage and catch blind spots instantly." },
  { icon: "☼", title: "Day & night", desc: "Model IR range and glare so nothing is missed after dark." },
  { icon: "₵", title: "Quote on the spot", desc: "Add your margin and hand the client a priced offer." },
];

export function Welcome() {
  const project = useStore((s) => s.project);
  const replaceProject = useStore((s) => s.replaceProject);
  const go = useGoToStage();
  const setStage = useStore((s) => s.setStage);
  const fileRef = useRef<HTMLInputElement>(null);

  const hasWork = project.floorPlan !== null || project.cameras.length > 0;

  function newSurvey() {
    replaceProject(createEmptyProject());
    setStage("setup");
  }

  return (
    <div className="welcome">
      <div className="welcome-hero">
        <div className="welcome-mark">
          <VectorMark size={64} />
        </div>
        <h1>CCTV Survey &amp; Quote</h1>
        <p className="lede">
          The on-site companion for Vector Security installers — plan camera
          coverage, prove it, and quote the client before you leave the building.
        </p>
        <div className="welcome-cta">
          <button className="btn-primary btn-lg" onClick={newSurvey}>
            New survey
          </button>
          <button className="btn-lg" onClick={() => fileRef.current?.click()}>
            Open project
          </button>
          <input
            ref={fileRef}
            className="hidden-input"
            type="file"
            accept=".json,application/json"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) {
                try {
                  replaceProject(await readProjectFile(f));
                  go("survey");
                } catch (err) {
                  alert(`Could not load project: ${(err as Error).message}`);
                }
              }
              e.target.value = "";
            }}
          />
        </div>

        {hasWork && (
          <div className="recent">
            <h3>In progress</h3>
            <div className="recent-item" onClick={() => go("survey")}>
              <div>
                <div className="ri-name">{project.name || "Untitled survey"}</div>
                <div style={{ color: "var(--muted)", fontSize: 12 }}>
                  {project.cameras.length} cameras
                  {project.client.name ? ` · ${project.client.name}` : ""}
                </div>
              </div>
              <span className="ri-meta">Resume →</span>
            </div>
          </div>
        )}
      </div>

      <div className="welcome-features">
        {FEATURES.map((f) => (
          <div className="feature" key={f.title}>
            <div className="f-icon">{f.icon}</div>
            <div className="f-title">{f.title}</div>
            <div className="f-desc">{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
