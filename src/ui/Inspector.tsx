// Right-hand inspector: project info + the per-camera editor (heading, FOV,
// range, mount height, label) and a selectable camera list.

import { useStore } from "../state/store";
import type { Camera } from "../engine/types";
import {
  DORI_LEVELS,
  DORI_PX_PER_M,
  deriveOptics,
  doriDistances,
  type DoriLevel,
} from "../engine/dori";
import {
  displayToMeters,
  formatLength,
  metersToDisplay,
  unitLabel,
} from "./units";
import { useMemo } from "react";
import { glareCameraIds } from "../engine/lighting";
import { useAnalysis } from "./useAnalysis";
import { CAMERA_PRESETS } from "../state/presets";

// Common horizontal resolutions by marketed megapixel count.
const RESOLUTION_PRESETS: { label: string; px: number }[] = [
  { label: "2 MP (1080p)", px: 1920 },
  { label: "4 MP", px: 2688 },
  { label: "5 MP", px: 2592 },
  { label: "8 MP (4K)", px: 3840 },
  { label: "12 MP", px: 4000 },
];

const LEVEL_LABEL: Record<DoriLevel, string> = {
  identify: "Identify",
  recognize: "Recognize",
  observe: "Observe",
  detect: "Detect",
};

// Survey-stage panel: per-camera editor and the camera list, plus quick scale /
// wall / zone status. Content only — the SidePanel provides the scroll wrapper.
export function CameraPanel() {
  const project = useStore((s) => s.project);
  const commit = useStore((s) => s.commit);
  const selectedId = useStore((s) => s.selectedCameraId);
  const setSelected = useStore((s) => s.setSelectedCamera);

  const selected = project.cameras.find((c) => c.id === selectedId) ?? null;

  // Glare: cameras facing a window. Cheap; recompute on camera/wall change.
  const glareIds = useMemo(
    () => glareCameraIds(project.cameras, project.walls, project.scale ?? { pxPerMeter: 20 }),
    [project.cameras, project.walls, project.scale],
  );

  function updateCamera(id: string, patch: Partial<Camera>) {
    commit((d) => {
      const c = d.cameras.find((c) => c.id === id);
      if (c) Object.assign(c, patch);
    });
  }

  return (
    <div className="inspector">
      {selected ? (
        <CameraEditor
          key={selected.id}
          camera={selected}
          units={project.units}
          glare={glareIds.has(selected.id)}
          onChange={(patch) => updateCamera(selected.id, patch)}
          onDelete={() => {
            commit((d) => {
              d.cameras = d.cameras.filter((c) => c.id !== selected.id);
            });
            setSelected(null);
          }}
        />
      ) : (
        <div className="card" style={{ color: "var(--muted)", fontSize: 12.5, lineHeight: 1.5 }}>
          {project.cameras.length === 0
            ? "Use the Camera tool to drop a camera, then drag the white handle to aim it."
            : "Select a camera to edit its lens, height and aim."}
          {!project.scale && (
            <div style={{ marginTop: 8, color: "var(--warn)" }}>
              Calibrate the scale so ranges are in real-world {unitLabel(project.units)}.
            </div>
          )}
        </div>
      )}

      <div className="summary" style={{ marginTop: 14 }}>
        <div className="summary-row">
          <span>Scale</span>
          <strong className={project.scale ? "" : undefined} style={{ color: project.scale ? "var(--accent)" : "var(--warn)" }}>
            {project.scale ? `${project.scale.pxPerMeter.toFixed(1)} px/m` : "uncalibrated"}
          </strong>
        </div>
        <div className="summary-row"><span>Walls</span><strong>{project.walls.length}</strong></div>
        <div className="summary-row"><span>Zones</span><strong>{project.zones.length}</strong></div>
      </div>

      {(project.walls.length > 0 || project.zones.length > 0) && (
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {project.walls.length > 0 && (
            <button className="danger" style={{ flex: 1 }} onClick={() => commit((d) => { d.walls = []; })}>
              Clear walls
            </button>
          )}
          {project.zones.length > 0 && (
            <button className="danger" style={{ flex: 1 }} onClick={() => commit((d) => { d.zones = []; })}>
              Clear zones
            </button>
          )}
        </div>
      )}

      <h2 style={{ marginTop: 6 }}>Cameras ({project.cameras.length})</h2>
      <ul className="camera-list">
        {project.cameras.map((c) => (
          <li key={c.id} className={c.id === selectedId ? "sel" : ""} onClick={() => setSelected(c.id)}>
            <span className="swatch" style={{ background: c.color }} />
            <span style={{ flex: 1 }}>{c.label}</span>
            <span style={{ color: "var(--muted)" }}>{formatLength(c.rangeMeters, project.units, 0)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CameraEditor({
  camera,
  units,
  glare,
  onChange,
  onDelete,
}: {
  camera: Camera;
  units: "metric" | "imperial";
  glare?: boolean;
  onChange: (patch: Partial<Camera>) => void;
  onDelete: () => void;
}) {
  // Normalize heading into 0..360 for display.
  const heading = ((camera.heading % 360) + 360) % 360;
  const distances = doriDistances(camera);

  // Recompute the optics-derived FOV and range whenever an optic changes.
  function setOptic(patch: Partial<Pick<Camera, "sensorWidthMm" | "resolutionWidthPx" | "focalLengthMm">>) {
    const optics = {
      sensorWidthMm: camera.sensorWidthMm,
      resolutionWidthPx: camera.resolutionWidthPx,
      focalLengthMm: camera.focalLengthMm,
      ...patch,
    };
    onChange({ ...patch, ...deriveOptics(optics) });
  }

  return (
    <>
      <h2>Camera “{camera.label}”</h2>

      {glare && (
        <div className="glare-banner">
          ⚠ Faces a window — risk of glare / backlight. Consider re-aiming or
          relying on IR at night.
        </div>
      )}

      <div className="field">
        <div className="label">Label</div>
        <input
          style={{ width: "100%" }}
          value={camera.label}
          onChange={(e) => onChange({ label: e.target.value })}
        />
      </div>

      <div className="field">
        <div className="label">Preset</div>
        <select
          style={{ width: "100%" }}
          value={camera.model ?? ""}
          onChange={(e) => {
            const preset = CAMERA_PRESETS.find((p) => p.name === e.target.value);
            if (!preset) return;
            const optics = {
              sensorWidthMm: preset.sensorWidthMm,
              resolutionWidthPx: preset.resolutionWidthPx,
              focalLengthMm: preset.focalLengthMm,
            };
            onChange({ ...optics, ...deriveOptics(optics), model: preset.name });
          }}
        >
          {CAMERA_PRESETS.every((p) => p.name !== camera.model) && (
            <option value={camera.model ?? ""}>{camera.model ?? "Custom"}</option>
          )}
          {CAMERA_PRESETS.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>
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

      <div className="field">
        <div className="label">Resolution</div>
        <select
          style={{ width: "100%" }}
          value={camera.resolutionWidthPx}
          onChange={(e) => setOptic({ resolutionWidthPx: parseInt(e.target.value, 10) })}
        >
          {RESOLUTION_PRESETS.every((p) => p.px !== camera.resolutionWidthPx) && (
            <option value={camera.resolutionWidthPx}>
              {camera.resolutionWidthPx}px (custom)
            </option>
          )}
          {RESOLUTION_PRESETS.map((p) => (
            <option key={p.px} value={p.px}>
              {p.label} — {p.px}px
            </option>
          ))}
        </select>
      </div>

      <Slider
        label="Focal length"
        value={Math.round(camera.focalLengthMm * 10) / 10}
        min={2.8}
        max={25}
        step={0.1}
        suffix=" mm"
        onChange={(v) => setOptic({ focalLengthMm: v })}
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

      <Slider
        label="Night IR range"
        value={Math.round(metersToDisplay(camera.irRangeMeters ?? 30, units))}
        min={0}
        max={metersToDisplay(60, units)}
        step={1}
        suffix={` ${unitLabel(units)}`}
        onChange={(v) => onChange({ irRangeMeters: displayToMeters(v, units) })}
      />

      <div className="field">
        <div className="label">
          <span>Field of view</span>
          <span>{camera.fovAngleDeg.toFixed(1)}°</span>
        </div>
        <div className="dori-table">
          {DORI_LEVELS.map((level) => (
            <div className="dori-row" key={level}>
              <span className="dori-name">{LEVEL_LABEL[level]}</span>
              <span className="dori-px">{DORI_PX_PER_M[level]} px/m</span>
              <span className="dori-dist">{formatLength(distances[level], units, 1)}</span>
            </div>
          ))}
        </div>
        <div style={{ color: "var(--muted)", fontSize: 11, marginTop: 4 }}>
          Coverage bands show identify (densest) out to detect. Range is derived
          from optics, not set by hand.
        </div>
      </div>

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

export function CoverageSummary() {
  const result = useAnalysis();
  if (!result) {
    return (
      <p style={{ color: "var(--muted)", fontSize: 12, marginBottom: 8 }}>
        Toggle Heatmap or Blind spots (calibrated plan required) to see coverage
        analysis. Draw an interest zone to scope it.
      </p>
    );
  }
  const pct = result.coveragePct.toFixed(1);
  return (
    <div className="summary">
      <div className="summary-row">
        <span>Coverage</span>
        <strong style={{ color: result.coveragePct >= 90 ? "#22c55e" : "#f59e0b" }}>
          {pct}%
        </strong>
      </div>
      <div className="summary-row">
        <span>Max overlap</span>
        <strong>{result.maxOverlap}×</strong>
      </div>
      <div className="summary-row">
        <span>Blind cells</span>
        <strong>{result.blindCells.length}</strong>
      </div>
      {result.violationCells.length > 0 && (
        <div className="summary-row" style={{ color: "#f43f5e" }}>
          <span>No-cover violations</span>
          <strong>{result.violationCells.length}</strong>
        </div>
      )}
    </div>
  );
}
