import { describe, expect, it } from "vitest";
import { groundFootprint, nearDeadZoneMeters, verticalFovDeg } from "./footprint";
import type { Camera } from "./types";

function cam(overrides: Partial<Camera> = {}): Camera {
  return {
    id: "c",
    label: "C",
    color: "#3b82f6",
    position: { x: 0, y: 0 },
    type: "fixed",
    heading: 0,
    tiltDeg: 30,
    mountHeightMeters: 3,
    sensorWidthMm: 5.37,
    resolutionWidthPx: 2688,
    focalLengthMm: 4,
    fovAngleDeg: 67.71,
    rangeMeters: 80,
    ...overrides,
  };
}

describe("height/tilt footprint", () => {
  it("derives a smaller vertical FOV from a 16:9 sensor", () => {
    expect(verticalFovDeg(67.71)).toBeGreaterThan(30);
    expect(verticalFovDeg(67.71)).toBeLessThan(67.71);
  });

  it("produces a non-zero near dead-zone when tilted down", () => {
    // 3 m high, 30deg tilt: nearest visible ground is several metres out.
    const dz = nearDeadZoneMeters(cam({ tiltDeg: 30, mountHeightMeters: 3 }));
    expect(dz).toBeGreaterThan(0);
    // Matches h / tan(tilt + vfov/2) within 2%.
    const vfov = verticalFovDeg(67.71);
    const expected = 3 / Math.tan(((30 + vfov / 2) * Math.PI) / 180);
    expect(Math.abs(dz - expected) / expected).toBeLessThan(0.02);
  });

  it("has no far limit when the view reaches the horizon", () => {
    // Small tilt so the top ray is at/above horizontal.
    const fp = groundFootprint(cam({ tiltDeg: 5 }));
    expect(fp.farMeters).toBe(Infinity);
  });

  it("a steeper tilt shrinks the dead-zone", () => {
    const shallow = nearDeadZoneMeters(cam({ tiltDeg: 20 }));
    const steep = nearDeadZoneMeters(cam({ tiltDeg: 50 }));
    expect(steep).toBeLessThan(shallow);
  });
});
