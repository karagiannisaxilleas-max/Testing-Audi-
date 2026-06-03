// Per-camera coverage computation.
//
// Phase 0/1: the field-of-view sector as a polygon (no occlusion yet).
// Phase 2 will extend `computeCoverage` with wall ray-casting; the signature
// and tests are designed so that work slots in without changing callers.

import { toRadians } from "./geometry";
import type { Camera, Point, Scale, Wall } from "./types";

export interface CoverageResult {
  cameraId: string;
  /** Coverage boundary in floor-plan pixel coordinates (apex first). */
  polygon: Point[];
}

/**
 * Build the FOV sector polygon for a camera, approximated by `segments`
 * straight edges along the arc. The apex (camera position) is the first
 * vertex so the result is a proper closed pie slice.
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

/**
 * Compute coverage for a single camera. `walls` are accepted now so callers
 * are stable; occlusion clipping lands in Phase 2.
 */
export function computeCoverage(
  camera: Camera,
  scale: Scale,
  _walls: Wall[] = [],
): CoverageResult {
  return {
    cameraId: camera.id,
    polygon: sectorPolygon(camera, scale),
  };
}
