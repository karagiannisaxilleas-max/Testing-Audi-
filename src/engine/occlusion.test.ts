import { describe, expect, it } from "vitest";
import { computeCoverage } from "./coverage";
import { pointInPolygon, polygonArea } from "./geometry";
import type { Camera, Scale, Wall } from "./types";

// 1 px = 1 m keeps the numbers readable.
const scale: Scale = { pxPerMeter: 1 };

function cam(overrides: Partial<Camera> = {}): Camera {
  return {
    id: "c1",
    label: "C1",
    color: "#3b82f6",
    position: { x: 50, y: 50 },
    type: "fixed",
    heading: 0,
    tiltDeg: 0,
    mountHeightMeters: 3,
    sensorWidthMm: 5.37,
    resolutionWidthPx: 2688,
    focalLengthMm: 4,
    fovAngleDeg: 360,
    rangeMeters: 1000,
    ...overrides,
  };
}

function room(x: number, y: number, w: number, h: number): Wall {
  return {
    id: "room",
    occlusion: "full",
    points: [
      { x, y },
      { x: x + w, y },
      { x: x + w, y: y + h },
      { x, y: y + h },
      { x, y }, // closed
    ],
  };
}

describe("wall occlusion (Phase 2 golden cases)", () => {
  it("a camera in the centre of a room sees ~the whole room", () => {
    // 100x100 room, camera centre, 360deg, range exceeds the room.
    const walls = [room(0, 0, 100, 100)];
    const result = computeCoverage(cam({ position: { x: 50, y: 50 } }), scale, walls);
    const area = polygonArea(result.polygon);
    // Visibility polygon of a convex room from inside == the room (10_000).
    expect(Math.abs(area - 10_000) / 10_000).toBeLessThan(0.01);
  });

  it("clamps to range when no wall is hit (open scene matches sector)", () => {
    const result = computeCoverage(
      cam({ fovAngleDeg: 90, rangeMeters: 30, heading: 0 }),
      scale,
      [], // no walls -> fast path sector
    );
    const analytic = 0.5 * 30 * 30 * (Math.PI / 2);
    expect(Math.abs(polygonArea(result.polygon) - analytic) / analytic).toBeLessThan(0.01);
  });

  it("a wall casts a shadow: area shrinks and points behind it are excluded", () => {
    // Camera at origin looking +x (heading 0), wide FOV.
    const camera = cam({ position: { x: 0, y: 0 }, heading: 0, fovAngleDeg: 120, rangeMeters: 100 });

    const open = computeCoverage(camera, scale, []);
    const openArea = polygonArea(open.polygon);

    // A vertical wall at x=20 spanning y=-5..5 blocks the centre of the view.
    const wall: Wall = {
      id: "w",
      occlusion: "full",
      points: [
        { x: 20, y: -5 },
        { x: 20, y: 5 },
      ],
    };
    const blocked = computeCoverage(camera, scale, [wall]);
    const blockedArea = polygonArea(blocked.polygon);

    // The shadow removes area.
    expect(blockedArea).toBeLessThan(openArea);

    // A point directly behind the wall (x=60, y=0) is NOT covered...
    expect(pointInPolygon({ x: 60, y: 0 }, blocked.polygon)).toBe(false);
    // ...but a point off to the side (around the wall) still is.
    expect(pointInPolygon({ x: 60, y: 40 }, blocked.polygon)).toBe(true);
  });

  it("glass and partial walls do not block geometry in Phase 2", () => {
    const camera = cam({ position: { x: 0, y: 0 }, heading: 0, fovAngleDeg: 90, rangeMeters: 100 });
    const glass: Wall = {
      id: "g",
      occlusion: "glass",
      points: [
        { x: 20, y: -50 },
        { x: 20, y: 50 },
      ],
    };
    const result = computeCoverage(camera, scale, [glass]);
    // Falls through to the unobstructed sector.
    expect(pointInPolygon({ x: 60, y: 0 }, result.polygon)).toBe(true);
  });
});

describe("coverage performance (Phase 2 DoD)", () => {
  it("recomputes one camera against 300 wall segments in <50ms", () => {
    // Build 300 short segments scattered around the camera.
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i < 301; i++) {
      const a = (i / 301) * Math.PI * 2;
      points.push({ x: 200 + Math.cos(a) * 150, y: 200 + Math.sin(a) * 150 });
    }
    const walls: Wall[] = [{ id: "big", occlusion: "full", points }]; // 300 segments

    const camera = cam({ position: { x: 200, y: 200 }, fovAngleDeg: 90, rangeMeters: 500 });

    const t0 = performance.now();
    computeCoverage(camera, scale, walls);
    const elapsed = performance.now() - t0;
    expect(elapsed).toBeLessThan(50);
  });
});
