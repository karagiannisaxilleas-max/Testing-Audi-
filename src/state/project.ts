// The persisted project model and its current schema version.
//
// `schemaVersion` exists from day one so saved projects can be migrated as the
// model evolves (see the roadmap in SPEC.md). Bump it and add a migration when
// the shape changes incompatibly.

import type { Camera, Scale, Wall, Zone } from "../engine/types";

export const SCHEMA_VERSION = 1;

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
  const p = raw as Partial<Project>;
  if (p.schemaVersion === SCHEMA_VERSION) {
    return p as Project;
  }
  // Future: stepwise migrations keyed on p.schemaVersion go here.
  throw new Error(
    `Unsupported project schemaVersion: ${String(p.schemaVersion)}`,
  );
}
