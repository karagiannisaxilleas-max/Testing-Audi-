import { describe, expect, it } from "vitest";
import {
  angleWithinSector,
  distance,
  normalizeAngle,
  polygonArea,
  raySegmentIntersection,
  toRadians,
  TAU,
} from "./geometry";

describe("geometry primitives", () => {
  it("computes distance", () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it("normalizes angles into [0, TAU)", () => {
    expect(normalizeAngle(-Math.PI / 2)).toBeCloseTo((3 * Math.PI) / 2, 10);
    expect(normalizeAngle(TAU + 1)).toBeCloseTo(1, 10);
  });

  it("tests sector membership with wrap-around", () => {
    // sector centred at 0 (i.e. crossing the 0/TAU seam), width 90deg
    const center = 0;
    const width = toRadians(90);
    expect(angleWithinSector(toRadians(10), center, width)).toBe(true);
    expect(angleWithinSector(toRadians(-10), center, width)).toBe(true);
    expect(angleWithinSector(toRadians(80), center, width)).toBe(false);
  });

  it("computes polygon area (unit square)", () => {
    const square = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ];
    expect(polygonArea(square)).toBeCloseTo(1, 10);
  });

  it("intersects a ray with a segment", () => {
    // ray from origin along +x; vertical segment at x=5 from y=-1..1
    const hit = raySegmentIntersection(
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 5, y: -1 },
      { x: 5, y: 1 },
    );
    expect(hit).not.toBeNull();
    expect(hit!.point.x).toBeCloseTo(5, 10);
    expect(hit!.point.y).toBeCloseTo(0, 10);
    expect(hit!.t).toBeCloseTo(5, 10);
  });

  it("returns null when a ray misses a segment", () => {
    const miss = raySegmentIntersection(
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 5, y: 2 },
      { x: 5, y: 3 },
    );
    expect(miss).toBeNull();
  });
});
