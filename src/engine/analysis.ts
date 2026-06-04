// Aggregate coverage analysis (Phase 4).
//
// Rather than boolean-combining vector polygons, we sample a regular grid over
// the area of interest and ask, per cell, how many cameras cover it. That makes
// coverage %, the overlap heatmap, blind spots, and no-cover violations fall
// out of one pass — and it is simple to reason about and test.

import { computeCoverage } from "./coverage";
import { distance, pointInPolygon } from "./geometry";
import { groundFootprint } from "./footprint";
import type { Camera, Point, Scale, Wall, Zone } from "./types";

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CameraCoverage {
  camera: Camera;
  polygon: Point[];
  nearPx: number;
  farPx: number;
}

/** Precompute each camera's wall-occluded coverage polygon and radial gates. */
export function buildCameraCoverage(
  cameras: Camera[],
  scale: Scale,
  walls: Wall[],
): CameraCoverage[] {
  return cameras.map((camera) => {
    const fp = groundFootprint(camera);
    const farMeters = Math.min(camera.rangeMeters, fp.farMeters);
    return {
      camera,
      polygon: computeCoverage(camera, scale, walls).polygon,
      nearPx: fp.nearMeters * scale.pxPerMeter,
      farPx: farMeters * scale.pxPerMeter,
    };
  });
}

/** Is `point` within a camera's footprint (angular + walls + height/tilt)? */
export function pointCovered(cc: CameraCoverage, point: Point): boolean {
  const d = distance(point, cc.camera.position);
  if (d < cc.nearPx || d > cc.farPx) return false;
  return pointInPolygon(point, cc.polygon);
}

export interface GridCell {
  x: number;
  y: number;
  count: number;
}

export interface AnalysisResult {
  cellSize: number;
  cells: GridCell[]; // covered cells (count >= 1), for the heatmap
  blindCells: GridCell[]; // interest cells with no coverage
  violationCells: GridCell[]; // covered cells inside a no-cover zone
  interestCellCount: number;
  coveredCellCount: number;
  coveragePct: number; // covered / interest, 0..100
  maxOverlap: number;
}

/**
 * Sample the grid and aggregate coverage. The "area of interest" is the union
 * of interest zones if any exist, otherwise the whole `bounds`.
 */
export function analyzeCoverage(
  cameras: Camera[],
  walls: Wall[],
  zones: Zone[],
  scale: Scale,
  bounds: Bounds,
  cellSize: number,
): AnalysisResult {
  const covs = buildCameraCoverage(cameras, scale, walls);
  const interest = zones.filter((z) => z.kind === "interest");
  const noCover = zones.filter((z) => z.kind === "no-cover");

  const cells: GridCell[] = [];
  const blindCells: GridCell[] = [];
  const violationCells: GridCell[] = [];
  let interestCellCount = 0;
  let coveredCellCount = 0;
  let maxOverlap = 0;

  const half = cellSize / 2;
  for (let y = bounds.y; y < bounds.y + bounds.height; y += cellSize) {
    for (let x = bounds.x; x < bounds.x + bounds.width; x += cellSize) {
      const p = { x: x + half, y: y + half };

      const inInterest =
        interest.length === 0 || interest.some((z) => pointInPolygon(p, z.polygon));
      if (!inInterest) continue;
      interestCellCount++;

      let count = 0;
      for (const cc of covs) if (pointCovered(cc, p)) count++;
      if (count > maxOverlap) maxOverlap = count;

      if (count >= 1) {
        coveredCellCount++;
        cells.push({ x, y, count });
        if (noCover.some((z) => pointInPolygon(p, z.polygon))) {
          violationCells.push({ x, y, count });
        }
      } else {
        blindCells.push({ x, y, count: 0 });
      }
    }
  }

  return {
    cellSize,
    cells,
    blindCells,
    violationCells,
    interestCellCount,
    coveredCellCount,
    coveragePct:
      interestCellCount === 0 ? 0 : (coveredCellCount / interestCellCount) * 100,
    maxOverlap,
  };
}
