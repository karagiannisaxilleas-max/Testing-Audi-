import { describe, expect, it } from "vitest";
import { migrateProject, SCHEMA_VERSION } from "./project";

describe("project schema migration", () => {
  it("migrates a v1 project (no optics) to the current schema", () => {
    const v1 = {
      schemaVersion: 1,
      id: "p1",
      name: "Old plan",
      units: "metric",
      floorPlan: null,
      scale: { pxPerMeter: 10 },
      walls: [],
      zones: [],
      cameras: [
        {
          id: "c1",
          label: "C1",
          color: "#3b82f6",
          position: { x: 5, y: 5 },
          type: "fixed",
          heading: 0,
          tiltDeg: 0,
          mountHeightMeters: 3,
          fovAngleDeg: 90,
          rangeMeters: 12,
        },
      ],
    };

    const migrated = migrateProject(v1);
    expect(migrated.schemaVersion).toBe(SCHEMA_VERSION);

    const cam = migrated.cameras[0];
    // Optics back-filled, FOV preserved (~90deg from the derived focal length).
    expect(cam.sensorWidthMm).toBeGreaterThan(0);
    expect(cam.resolutionWidthPx).toBeGreaterThan(0);
    expect(cam.focalLengthMm).toBeGreaterThan(0);
    expect(cam.fovAngleDeg).toBeCloseTo(90, 0);
    // Range is now derived (detect distance), not the hand-set 12 m.
    expect(cam.rangeMeters).toBeGreaterThan(12);
  });

  it("passes a current-version project through unchanged", () => {
    const current = {
      schemaVersion: SCHEMA_VERSION,
      id: "p2",
      name: "Now",
      units: "metric" as const,
      floorPlan: null,
      scale: null,
      walls: [],
      zones: [],
      cameras: [],
    };
    expect(migrateProject(current).schemaVersion).toBe(SCHEMA_VERSION);
  });

  it("rejects an unknown future version", () => {
    expect(() => migrateProject({ schemaVersion: 999 })).toThrow();
  });
});
