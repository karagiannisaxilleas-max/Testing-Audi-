// Right-hand inspector. In Phase 0 it shows project-level info and a rename
// field (which exercises the commit/undo path). Per-camera editing arrives in
// Phase 1 once cameras can be placed.

import { useStore } from "../state/store";

export function Inspector() {
  const project = useStore((s) => s.project);
  const commit = useStore((s) => s.commit);

  return (
    <aside className="inspector">
      <h2>Project</h2>
      <label style={{ display: "block", marginBottom: 12 }}>
        <div style={{ color: "var(--muted)", marginBottom: 4 }}>Name</div>
        <input
          style={{
            width: "100%",
            background: "var(--panel-2)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            color: "var(--text)",
            padding: "6px 8px",
          }}
          value={project.name}
          onChange={(e) => {
            const name = e.target.value;
            commit((d) => {
              d.name = name;
            });
          }}
        />
      </label>

      <h2>Status</h2>
      <dl style={{ margin: 0, color: "var(--muted)", lineHeight: 1.8 }}>
        <div>Floor plan: {project.floorPlan ? "loaded" : "—"}</div>
        <div>
          Scale:{" "}
          {project.scale
            ? `${project.scale.pxPerMeter.toFixed(1)} px/m`
            : "not calibrated"}
        </div>
        <div>Cameras: {project.cameras.length}</div>
        <div>Walls: {project.walls.length}</div>
      </dl>

      <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 20 }}>
        Phase 0: load a floor plan and navigate it. Calibration, cameras and
        wall-aware coverage land in the following phases (see SPEC.md).
      </p>
    </aside>
  );
}
