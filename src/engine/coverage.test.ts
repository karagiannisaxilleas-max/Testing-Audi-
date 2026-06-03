import { describe, expect, it } from "vitest";
import { computeCoverage, sectorPolygon } from "./coverage";
import { polygonArea } from "./geometry";
import type { Camera, Scale } from "./types";

const scale: Scale = { pxPerMeter: 10 };

function makeCamera(overrides: Partial<Camera> = {}): Camera {
  return {
    id: "c1",
    label: "C1",
    color: "#3b82f6",
    position: { x: 100, y: 100 },
    type: "fixed",
    heading: 0,
    tiltDeg: 0,
    mountHeightMeters: 3,
    sensorWidthMm: 5.37,
    resolutionWidthPx: 2688,
    focalLengthMm: 4,
    fovAngleDeg: 90,
    rangeMeters: 10,
    ...overrides,
  };
}

describe("sector coverage (Phase 0/1 golden cases)", () => {
  it("approximates the analytic sector area within 1%", () => {
    const cam = makeCamera();
    const poly = sectorPolygon(cam, scale);

    const radiusPx = cam.rangeMeters * scale.pxPerMeter; // 100
    const fovRad = (cam.fovAngleDeg * Math.PI) / 180; // PI/2
    const analytic = 0.5 * radiusPx * radiusPx * fovRad; // pie slice area

    const area = polygonArea(poly);
    expect(Math.abs(area - analytic) / analytic).toBeLessThan(0.01);
  });

  it("scales area with the square of the range", () => {
    const near = polygonArea(sectorPolygon(makeCamera({ rangeMeters: 5 }), scale));
    const far = polygonArea(sectorPolygon(makeCamera({ rangeMeters: 10 }), scale));
    expect(far / near).toBeCloseTo(4, 1);
  });

  it("puts the apex at the camera position", () => {
    const cam = makeCamera({ position: { x: 42, y: 7 } });
    const poly = sectorPolygon(cam, scale);
    expect(poly[0]).toEqual({ x: 42, y: 7 });
  });

  it("computeCoverage returns the camera id and a closed-ish polygon", () => {
    const cam = makeCamera();
    const result = computeCoverage(cam, scale, []);
    expect(result.cameraId).toBe("c1");
    expect(result.polygon.length).toBeGreaterThan(3);
  });
});
