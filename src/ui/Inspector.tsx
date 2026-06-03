// Right-hand inspector: project info + the per-camera editor (heading, FOV,
// range, mount height, label) and a selectable camera list.

import { useStore } from "../state/store";
import type { Camera } from "../engine/types";
import {
  displayToMeters,
  formatLength,
  metersToDisplay,
  unitLabel,
} from "./units";

export function Inspector() {
  const project = useStore((s) => s.project);
  const commit = useStore((s) => s.commit);
  const selectedId = useStore((s) => s.selectedCameraId);
  const setSelected = useStore((s) => s.setSelectedCamera);

  const selected = project.cameras.find((c) => c.id === selectedId) ?? null;

  function updateCamera(id: string, patch: Partial<Camera>) {
    commit((d) => {
      const c = d.cameras.find((c) => c.id === id);
      if (c) Object.assign(c, patch);
    });
  }

  return (
    <aside className="inspector">
      <h2>Project</h2>
      <div className="field">
        <div className="label">Name</div>
        <input
          style={{ width: "100%" }}
          value={project.name}
          onChange={(e) => {
            const name = e.target.value;
            commit((d) => {
              d.name = name;
            });
          }}
        />
      </div>
      <dl style={{ margin: "0 0 14px", color: "var(--muted)", lineHeight: 1.7 }}>
        <div>Floor plan: {project.floorPlan ? "loaded" : "—"}</div>
        <div>
          Scale:{" "}
          {project.scale
            ? `${project.scale.pxPerMeter.toFixed(1)} px/m`
            : "not calibrated"}
        </div>
        <div>Walls: {project.walls.length}</div>
      </dl>

      {project.walls.length > 0 && (
        <button
          className="danger"
          style={{ width: "100%", marginBottom: 14 }}
          onClick={() =>
            commit((d) => {
              d.walls = [];
            })
          }
        >
          Clear walls
        </button>
      )}

      {selected ? (
        <CameraEditor
          key={selected.id}
          camera={selected}
          units={project.units}
          onChange={(patch) => updateCamera(selected.id, patch)}
          onDelete={() => {
            commit((d) => {
              d.cameras = d.cameras.filter((c) => c.id !== selected.id);
            });
            setSelected(null);
          }}
        />
      ) : (
        <p style={{ color: "var(--muted)", fontSize: 12 }}>
          Select a camera to edit it, or use the Camera tool to place one.
          Calibrate first so ranges are in real-world {unitLabel(project.units)}.
        </p>
      )}

      <h2 style={{ marginTop: 20 }}>Cameras ({project.cameras.length})</h2>
      <ul className="camera-list">
        {project.cameras.map((c) => (
          <li
            key={c.id}
            className={c.id === selectedId ? "sel" : ""}
            onClick={() => setSelected(c.id)}
          >
            <span className="swatch" style={{ background: c.color }} />
            <span style={{ flex: 1 }}>{c.label}</span>
            <span style={{ color: "var(--muted)" }}>
              {formatLength(c.rangeMeters, project.units, 0)}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function CameraEditor({
  camera,
  units,
  onChange,
  onDelete,
}: {
  camera: Camera;
  units: "metric" | "imperial";
  onChange: (patch: Partial<Camera>) => void;
  onDelete: () => void;
}) {
  // Normalize heading into 0..360 for display.
  const heading = ((camera.heading % 360) + 360) % 360;

  return (
    <>
      <h2>Camera “{camera.label}”</h2>

      <div className="field">
        <div className="label">Label</div>
        <input
          style={{ width: "100%" }}
          value={camera.label}
          onChange={(e) => onChange({ label: e.target.value })}
        />
      </div>

      <Slider
        label="Heading"
        value={heading}
        min={0}
        max={360}
        step={1}
        suffix="°"
        onChange={(v) => onChange({ heading: v })}
      />

      <Slider
        label="Field of view"
        value={camera.fovAngleDeg}
        min={10}
        max={360}
        step={1}
        suffix="°"
        onChange={(v) => onChange({ fovAngleDeg: v })}
      />

      <Slider
        label="Range"
        value={Math.round(metersToDisplay(camera.rangeMeters, units) * 10) / 10}
        min={1}
        max={metersToDisplay(60, units)}
        step={0.5}
        suffix={` ${unitLabel(units)}`}
        onChange={(v) => onChange({ rangeMeters: displayToMeters(v, units) })}
      />

      <Slider
        label="Mount height"
        value={Math.round(metersToDisplay(camera.mountHeightMeters, units) * 10) / 10}
        min={metersToDisplay(1, units)}
        max={metersToDisplay(10, units)}
        step={0.1}
        suffix={` ${unitLabel(units)}`}
        onChange={(v) => onChange({ mountHeightMeters: displayToMeters(v, units) })}
      />

      <button
        className="danger"
        style={{ width: "100%", marginTop: 8 }}
        onClick={onDelete}
      >
        Delete camera
      </button>
    </>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="field">
      <div className="label">
        <span>{label}</span>
        <span>
          {value}
          {suffix ?? ""}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}
