import { describe, expect, it } from "vitest";
import { effectiveRangeMeters, glareCameraIds } from "./lighting";
import type { Camera, Scale, Wall } from "./types";

const scale: Scale = { pxPerMeter: 1 };

function cam(overrides: Partial<Camera> = {}): Camera {
  return {
    id: "c1",
    label: "C1",
    color: "#3b82f6",
    position: { x: 0, y: 0 },
    type: "fixed",
    heading: 0,
    tiltDeg: 0,
    mountHeightMeters: 3,
    sensorWidthMm: 5.37,
    resolutionWidthPx: 2688,
    focalLengthMm: 4,
    fovAngleDeg: 90,
    rangeMeters: 80,
    irRangeMeters: 30,
    ...overrides,
  };
}

describe("IR / night range", () => {
  it("clamps range to IR reach at night", () => {
    const c = cam({ rangeMeters: 80, irRangeMeters: 30 });
    expect(effectiveRangeMeters(c, false)).toBe(80);
    expect(effectiveRangeMeters(c, true)).toBe(30);
  });

  it("never extends range beyond daytime", () => {
    const c = cam({ rangeMeters: 20, irRangeMeters: 30 });
    expect(effectiveRangeMeters(c, true)).toBe(20);
  });
});

describe("glare warnings", () => {
  const glass: Wall = {
    id: "win",
    occlusion: "glass",
    points: [
      { x: 40, y: -20 },
      { x: 40, y: 20 },
    ],
  };

  it("flags a camera pointed at a window in view", () => {
    const c = cam({ position: { x: 0, y: 0 }, heading: 0, fovAngleDeg: 90 });
    expect(glareCameraIds([c], [glass], scale).has("c1")).toBe(true);
  });

  it("does not flag a camera facing away from the window", () => {
    const c = cam({ position: { x: 0, y: 0 }, heading: 180, fovAngleDeg: 90 });
    expect(glareCameraIds([c], [glass], scale).has("c1")).toBe(false);
  });

  it("ignores glass outside range", () => {
    const c = cam({ position: { x: 0, y: 0 }, heading: 0, fovAngleDeg: 90, rangeMeters: 10 });
    expect(glareCameraIds([c], [glass], scale).has("c1")).toBe(false);
  });
});
