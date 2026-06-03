// The persisted project model and its current schema version.
//
// `schemaVersion` exists from day one so saved projects can be migrated as the
// model evolves (see the roadmap in SPEC.md). Bump it and add a migration when
// the shape changes incompatibly.

import { deriveOptics } from "../engine/dori";
import type { Camera, Scale, Wall, Zone } from "../engine/types";

export const SCHEMA_VERSION = 2;

export type Units = "metric" | "imperial";

export interface FloorPlan {
  /** Base64 data URL of the uploaded image (embedded so projects are self-contained). */
  imageDataUrl: string;
  width: number;
  height: number;
}

export interface Project {
  schemaVersion: number;
  id: string;
  name: string;
  units: Units;
  floorPlan: FloorPlan | null;
  scale: Scale | null;
  walls: Wall[];
  zones: Zone[];
  cameras: Camera[];
}

export function createEmptyProject(): Project {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: crypto.randomUUID(),
    name: "Untitled plan",
    units: "metric",
    floorPlan: null,
    scale: null,
    walls: [],
    zones: [],
    cameras: [],
  };
}

/**
 * Migrate an older saved project to the current schema. Phase 0 has only one
 * version, so this is currently an identity check; the hook is here so future
 * versions have a single, tested place to live.
 */
export function migrateProject(raw: unknown): Project {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Invalid project file");
  }
  const p = raw as Partial<Project> & { schemaVersion?: number };

  // Stepwise migrations, lowest version first.
  let project = p;
  if ((project.schemaVersion ?? 1) === 1) {
    project = migrateV1toV2(project);
  }

  if (project.schemaVersion === SCHEMA_VERSION) {
    return project as Project;
  }
  throw new Error(
    `Unsupported project schemaVersion: ${String(project.schemaVersion)}`,
  );
}

/**
 * v1 cameras set fovAngleDeg/rangeMeters by hand and had no optics. Back-fill
 * optics consistent with the stored FOV (focal length chosen to reproduce it on
 * a default sensor) so existing cones are preserved, then bump the version.
 */
function migrateV1toV2(p: Partial<Project> & { schemaVersion?: number }): Project {
  const sensorWidthMm = 5.37;
  const resolutionWidthPx = 2688;
  const cameras = (p.cameras ?? []).map((c) => {
    const cam = c as Camera & { fovAngleDeg?: number; rangeMeters?: number };
    const fovDeg = cam.fovAngleDeg ?? 90;
    // focal that reproduces the stored FOV: f = sensor / (2 tan(fov/2))
    const focalLengthMm =
      sensorWidthMm / (2 * Math.tan((fovDeg * Math.PI) / 180 / 2));
    const optics = { sensorWidthMm, resolutionWidthPx, focalLengthMm };
    const { fovAngleDeg, rangeMeters } = deriveOptics(optics);
    return { ...cam, ...optics, fovAngleDeg, rangeMeters } as Camera;
  });
  return {
    ...(p as Project),
    schemaVersion: 2,
    cameras,
  };
}
