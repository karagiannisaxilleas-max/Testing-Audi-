// Pure 2D geometry primitives used by the coverage engine.
// No external dependencies, fully unit-testable.

import type { Point } from "./types";

export const TAU = Math.PI * 2;

export function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Normalize an angle (radians) into the range [0, TAU). */
export function normalizeAngle(theta: number): number {
  let t = theta % TAU;
  if (t < 0) t += TAU;
  return t;
}

/**
 * Shortest signed angular difference `a - b`, in (-PI, PI].
 * Useful for testing whether an angle lies inside a sector.
 */
export function angleDelta(a: number, b: number): number {
  let d = (a - b) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d <= -Math.PI) d += TAU;
  return d;
}

/**
 * Is `theta` within the sector centred on `center` with total angular
 * `width` (all radians)? Handles wrap-around at 0/TAU.
 */
export function angleWithinSector(
  theta: number,
  center: number,
  width: number,
): boolean {
  return Math.abs(angleDelta(theta, center)) <= width / 2 + 1e-9;
}

/** Signed area of a polygon (shoelace). Positive for counter-clockwise. */
export function signedArea(poly: Point[]): number {
  let sum = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return sum / 2;
}

/** Absolute polygon area. */
export function polygonArea(poly: Point[]): number {
  return Math.abs(signedArea(poly));
}

export interface RaySegmentHit {
  /** Parametric distance along the ray (>= 0). */
  t: number;
  point: Point;
}

/**
 * Intersect a ray (origin + t * direction, t >= 0) with a finite segment [p, q].
 * Returns the hit nearest the origin, or null if none.
 * `dir` need not be normalized; `t` is in units of `dir` length.
 */
export function raySegmentIntersection(
  origin: Point,
  dir: Point,
  p: Point,
  q: Point,
): RaySegmentHit | null {
  const sx = q.x - p.x;
  const sy = q.y - p.y;
  const denom = dir.x * sy - dir.y * sx;
  if (Math.abs(denom) < 1e-12) return null; // parallel

  const dxo = p.x - origin.x;
  const dyo = p.y - origin.y;
  const t = (dxo * sy - dyo * sx) / denom; // along ray
  const u = (dxo * dir.y - dyo * dir.x) / denom; // along segment

  if (t < 0 || u < -1e-9 || u > 1 + 1e-9) return null;

  return {
    t,
    point: { x: origin.x + dir.x * t, y: origin.y + dir.y * t },
  };
}
