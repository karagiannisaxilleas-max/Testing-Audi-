// Day/night (IR) range and glare warnings (Phase 6).
//
// At night a camera only sees as far as its IR illuminator reaches, so range is
// clamped. Glare warnings flag cameras pointed at a window (a `glass` wall) that
// falls inside their field of view — a classic cause of night-time wash-out and
// daytime backlight where faces become silhouettes.

import { computeCoverage, wallSegments } from "./coverage";
import { pointInPolygon } from "./geometry";
import type { Camera, Scale, Wall } from "./types";

export const DEFAULT_IR_RANGE_M = 30;

export function irRangeMeters(camera: Camera): number {
  return camera.irRangeMeters ?? DEFAULT_IR_RANGE_M;
}

/** Useful range under the given lighting: clamped to IR reach at night. */
export function effectiveRangeMeters(camera: Camera, night: boolean): number {
  return night ? Math.min(camera.rangeMeters, irRangeMeters(camera)) : camera.rangeMeters;
}

/**
 * Cameras that look at a glass wall (window) within their view. A camera "sees"
 * a glass segment if the segment's sampled points fall inside its wall-occluded
 * coverage polygon.
 */
export function glareCameraIds(
  cameras: Camera[],
  walls: Wall[],
  scale: Scale,
): Set<string> {
  const glass = wallSegments(walls.filter((w) => w.occlusion === "glass"));
  const flagged = new Set<string>();
  if (glass.length === 0) return flagged;

  for (const cam of cameras) {
    const poly = computeCoverage(cam, scale, walls).polygon;
    for (const seg of glass) {
      // Sample a few points along the window; if any is visible, it's glare.
      for (const t of [0.25, 0.5, 0.75]) {
        const p = {
          x: seg.a.x + (seg.b.x - seg.a.x) * t,
          y: seg.a.y + (seg.b.y - seg.a.y) * t,
        };
        if (pointInPolygon(p, poly)) {
          flagged.add(cam.id);
          break;
        }
      }
      if (flagged.has(cam.id)) break;
    }
  }
  return flagged;
}
