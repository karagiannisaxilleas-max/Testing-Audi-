import { describe, expect, it } from "vitest";
import {
  distanceForDensity,
  doriDistances,
  horizontalFovDeg,
  levelAtDistance,
  pxPerMeterAt,
} from "./dori";
import type { Camera } from "./types";

// The camera from docs/dori-example.md.
function exampleCamera(): Camera {
  const sensorWidthMm = 5.37;
  const focalLengthMm = 4;
  return {
    id: "ex",
    label: "EX",
    color: "#3b82f6",
    position: { x: 0, y: 0 },
    type: "fixed",
    heading: 0,
    tiltDeg: 0,
    mountHeightMeters: 3,
    sensorWidthMm,
    resolutionWidthPx: 2688,
    focalLengthMm,
    fovAngleDeg: horizontalFovDeg(sensorWidthMm, focalLengthMm),
    rangeMeters: 80,
  };
}

describe("DORI model (matches docs/dori-example.md)", () => {
  it("derives ~67.7deg FOV from a 5.37mm sensor and 4mm lens", () => {
    expect(horizontalFovDeg(5.37, 4)).toBeCloseTo(67.71, 1);
  });

  it("computes the four DORI distances from the worked example", () => {
    const d = doriDistances(exampleCamera());
    expect(d.identify).toBeCloseTo(8.01, 1);
    expect(d.recognize).toBeCloseTo(16.02, 1);
    expect(d.observe).toBeCloseTo(32.04, 1);
    expect(d.detect).toBeCloseTo(80.09, 1);
  });

  it("density and distance are inverses", () => {
    const cam = exampleCamera();
    const dens = pxPerMeterAt(16.02, cam.resolutionWidthPx, cam.fovAngleDeg);
    expect(dens).toBeCloseTo(125, 0);
    const dist = distanceForDensity(125, cam.resolutionWidthPx, cam.fovAngleDeg);
    expect(dist).toBeCloseTo(16.02, 1);
  });

  it("reports the quality level achieved at a distance", () => {
    const cam = exampleCamera();
    expect(levelAtDistance(cam, 5)).toBe("identify");
    expect(levelAtDistance(cam, 12)).toBe("recognize");
    expect(levelAtDistance(cam, 25)).toBe("observe");
    expect(levelAtDistance(cam, 60)).toBe("detect");
    expect(levelAtDistance(cam, 200)).toBe(null);
  });

  it("zooming in (longer focal length) pushes DORI distances out", () => {
    const wide = exampleCamera();
    const tele: Camera = {
      ...wide,
      focalLengthMm: 8,
      fovAngleDeg: horizontalFovDeg(wide.sensorWidthMm, 8),
    };
    expect(doriDistances(tele).recognize).toBeGreaterThan(
      doriDistances(wide).recognize,
    );
    expect(tele.fovAngleDeg).toBeLessThan(wide.fovAngleDeg);
  });
});
