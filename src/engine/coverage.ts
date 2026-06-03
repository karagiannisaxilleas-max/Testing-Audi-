// Per-camera coverage computation.
//
// Phase 0/1: the field-of-view sector as a polygon (no occlusion).
// Phase 2: ray-cast visibility clipped to the FOV sector so coverage is
// blocked by walls. Only `full` walls occlude; `partial`/`glass` will modulate
// quality in later phases rather than block geometry.

import {
  raySegmentIntersection,
  toRadians,
  type Segment,
} from "./geometry";
import type { Camera, Point, Scale, Wall } from "./types";

export interface CoverageResult {
  cameraId: string;
  /** Coverage boundary in floor-plan pixel coordinates (apex first). */
  polygon: Point[];
}

/** Explode wall polylines into individual segments. */
export function wallSegments(walls: Wall[]): Segment[] {
  const segs: Segment[] = [];
  for (const wall of walls) {
    for (let i = 0; i < wall.points.length - 1; i++) {
      segs.push({ a: wall.points[i], b: wall.points[i + 1] });
    }
  }
  return segs;
}

/**
 * Build the FOV sector polygon for a camera, approximated by `segments`
 * straight edges along the arc. The apex (camera position) is the first
 * vertex so the result is a proper closed pie slice. Used as the fast path
 * when there is nothing to occlude.
 */
export function sectorPolygon(
  camera: Camera,
  scale: Scale,
  segments = 48,
): Point[] {
  const radiusPx = camera.rangeMeters * scale.pxPerMeter;
  const headingRad = toRadians(camera.heading);
  const fovRad = toRadians(camera.fovAngleDeg);
  const start = headingRad - fovRad / 2;

  const poly: Point[] = [{ ...camera.position }];
  for (let i = 0; i <= segments; i++) {
    const a = start + (fovRad * i) / segments;
    poly.push({
      x: camera.position.x + Math.cos(a) * radiusPx,
      y: camera.position.y + Math.sin(a) * radiusPx,
    });
  }
  return poly;
}

/** Nearest blocking distance along a unit-direction ray, clamped to maxDist. */
function nearestHitDistance(
  apex: Point,
  dir: Point,
  segs: Segment[],
  maxDist: number,
): number {
  let best = maxDist;
  for (const s of segs) {
    const hit = raySegmentIntersection(apex, dir, s.a, s.b);
    // Ignore hits at the apex itself; keep the closest within range.
    if (hit && hit.t > 1e-6 && hit.t < best) best = hit.t;
  }
  return best;
}

/**
 * Visibility polygon for a camera's FOV sector, clipped by `segs`.
 *
 * Casts rays at: evenly spaced angles across the sector (approximates the far
 * arc and catches segments crossing the sector), and at every wall endpoint
 * inside the sector ±epsilon (captures silhouette edges). Each ray stops at the
 * nearest wall or the range arc, whichever is closer.
 */
function visibilityPolygon(
  apex: Point,
  startAngle: number,
  fovRad: number,
  radiusPx: number,
  segs: Segment[],
): Point[] {
  const endAngle = startAngle + fovRad;
  const eps = 1e-4;

  const baseSteps = Math.max(24, Math.ceil((fovRad * 180) / Math.PI / 2));
  const angles: number[] = [];
  for (let i = 0; i <= baseSteps; i++) {
    angles.push(startAngle + (fovRad * i) / baseSteps);
  }

  // Endpoint-directed rays (with silhouette offsets) for crisp shadow edges.
  for (const s of segs) {
    for (const p of [s.a, s.b]) {
      let raw = Math.atan2(p.y - apex.y, p.x - apex.x);
      while (raw < startAngle - 1e-9) raw += Math.PI * 2;
      while (raw > endAngle + 1e-9) raw -= Math.PI * 2;
      if (raw >= startAngle - 1e-9 && raw <= endAngle + 1e-9) {
        angles.push(raw, raw - eps, raw + eps);
      }
    }
  }

  // Sort, clamp into the sector, and drop near-duplicates.
  angles.sort((a, b) => a - b);
  const points: Point[] = [{ ...apex }];
  let prev = Number.NEGATIVE_INFINITY;
  for (let a of angles) {
    if (a < startAngle) a = startAngle;
    if (a > endAngle) a = endAngle;
    if (a - prev < 1e-7) continue;
    prev = a;
    const dir = { x: Math.cos(a), y: Math.sin(a) };
    const dist = nearestHitDistance(apex, dir, segs, radiusPx);
    points.push({ x: apex.x + dir.x * dist, y: apex.y + dir.y * dist });
  }
  return points;
}

/**
 * Compute coverage for a single camera, blocked by `walls`. With no occluding
 * walls this returns the plain sector (fast path).
 */
export function computeCoverage(
  camera: Camera,
  scale: Scale,
  walls: Wall[] = [],
): CoverageResult {
  const radiusPx = camera.rangeMeters * scale.pxPerMeter;
  const segs = wallSegments(walls.filter((w) => w.occlusion === "full"));

  if (segs.length === 0) {
    return { cameraId: camera.id, polygon: sectorPolygon(camera, scale) };
  }

  const headingRad = toRadians(camera.heading);
  const fovRad = toRadians(camera.fovAngleDeg);
  const polygon = visibilityPolygon(
    camera.position,
    headingRad - fovRad / 2,
    fovRad,
    radiusPx,
    segs,
  );
  return { cameraId: camera.id, polygon };
}
