import { describe, expect, it } from "vitest";
import { computeScale, metersToPixels, pixelsToMeters } from "./calibration";

describe("scale calibration", () => {
  it("derives px/m from two points and a known distance", () => {
    // 200 px span declared as 5 m -> 40 px/m
    const scale = computeScale({ x: 100, y: 100 }, { x: 300, y: 100 }, 5);
    expect(scale.pxPerMeter).toBeCloseTo(40, 10);
  });

  it("round-trips measurements within the 2% DoD tolerance", () => {
    // Calibrate on a diagonal span, then measure other lengths back.
    const scale = computeScale({ x: 0, y: 0 }, { x: 300, y: 400 }, 10); // 500px=10m
    expect(scale.pxPerMeter).toBeCloseTo(50, 10);

    // A 150px length should read as 3m.
    const measured = pixelsToMeters(150, scale);
    expect(Math.abs(measured - 3) / 3).toBeLessThan(0.02);

    // And 7m should map back to 350px.
    expect(metersToPixels(7, scale)).toBeCloseTo(350, 10);
  });

  it("rejects degenerate input", () => {
    expect(() => computeScale({ x: 0, y: 0 }, { x: 10, y: 0 }, 0)).toThrow();
    expect(() => computeScale({ x: 5, y: 5 }, { x: 5, y: 5 }, 4)).toThrow();
  });
});
