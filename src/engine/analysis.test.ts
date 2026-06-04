import { describe, expect, it } from "vitest";
import { analyzeCoverage } from "./analysis";
import type { Camera, Scale, Zone } from "./types";

const scale: Scale = { pxPerMeter: 1 };
const bounds = { x: 0, y: 0, width: 100, height: 100 };

function cam(overrides: Partial<Camera> = {}): Camera {
  return {
    id: "c1",
    label: "C1",
    color: "#3b82f6",
    position: { x: 50, y: 50 },
    type: "fixed",
    heading: 0,
    tiltDeg: 0, // no dead-zone, keep the geometry pure for the test
    mountHeightMeters: 3,
    sensorWidthMm: 5.37,
    resolutionWidthPx: 2688,
    focalLengthMm: 4,
    fovAngleDeg: 360,
    rangeMeters: 1000,
    ...overrides,
  };
}

describe("aggregate analysis", () => {
  it("a 360deg camera covers most of the bounds", () => {
    const r = analyzeCoverage([cam()], [], [], scale, bounds, 5);
    expect(r.coveragePct).toBeGreaterThan(95);
    expect(r.blindCells.length).toBeLessThan(r.interestCellCount * 0.05);
    expect(r.maxOverlap).toBe(1);
  });

  it("reports blind spots when coverage is partial", () => {
    // Narrow camera pointing +x from the left edge leaves the left/behind blind.
    const c = cam({ position: { x: 0, y: 50 }, heading: 0, fovAngleDeg: 60, rangeMeters: 40 });
    const r = analyzeCoverage([c], [], [], scale, bounds, 5);
    expect(r.coveragePct).toBeLessThan(60);
    expect(r.blindCells.length).toBeGreaterThan(0);
  });

  it("counts overlap where two cameras see the same area", () => {
    const a = cam({ id: "a", position: { x: 40, y: 50 } });
    const b = cam({ id: "b", position: { x: 60, y: 50 } });
    const r = analyzeCoverage([a, b], [], [], scale, bounds, 5);
    expect(r.maxOverlap).toBe(2);
  });

  it("scopes analysis to an interest zone and flags no-cover violations", () => {
    const interest: Zone = {
      id: "i",
      kind: "interest",
      label: "Lobby",
      polygon: [
        { x: 20, y: 20 },
        { x: 80, y: 20 },
        { x: 80, y: 80 },
        { x: 20, y: 80 },
      ],
    };
    const noCover: Zone = {
      id: "n",
      kind: "no-cover",
      label: "Neighbour",
      polygon: [
        { x: 40, y: 40 },
        { x: 60, y: 40 },
        { x: 60, y: 60 },
        { x: 40, y: 60 },
      ],
    };
    const r = analyzeCoverage([cam()], [], [interest, noCover], scale, bounds, 5);
    // Every interest cell is sampled inside the 60x60 zone only.
    expect(r.interestCellCount).toBeGreaterThan(0);
    expect(r.interestCellCount).toBeLessThan(20 * 20); // < full bounds
    // The 360deg camera covers the no-cover zone -> violations reported.
    expect(r.violationCells.length).toBeGreaterThan(0);
  });
});
