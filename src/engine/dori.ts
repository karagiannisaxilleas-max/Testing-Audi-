// DORI pixel-density model (EN 62676-4).
//
// The useful "range" of a camera is not a single number: image quality falls
// off with distance because the same horizontal resolution is spread over a
// wider scene. DORI names four quality thresholds in pixels-per-metre, and we
// derive the distance at which a given camera reaches each one.
//
// Pure, dependency-free, and unit-tested against docs/dori-example.md.

import type { Camera } from "./types";

/** DORI thresholds in pixels per metre of scene (horizontal). */
export const DORI_PX_PER_M = {
  identify: 250,
  recognize: 125,
  observe: 62.5,
  detect: 25,
} as const;

export type DoriLevel = keyof typeof DORI_PX_PER_M;

export const DORI_LEVELS: DoriLevel[] = [
  "identify",
  "recognize",
  "observe",
  "detect",
];

/** Horizontal field of view (degrees) from sensor width and focal length. */
export function horizontalFovDeg(
  sensorWidthMm: number,
  focalLengthMm: number,
): number {
  const rad = 2 * Math.atan(sensorWidthMm / (2 * focalLengthMm));
  return (rad * 180) / Math.PI;
}

/** Width of the scene (metres) captured at distance `d` for a given FOV. */
export function sceneWidthMeters(distanceM: number, fovDeg: number): number {
  const fovRad = (fovDeg * Math.PI) / 180;
  return 2 * distanceM * Math.tan(fovRad / 2);
}

/** Pixel density (px/m) at distance `d`. */
export function pxPerMeterAt(
  distanceM: number,
  resolutionWidthPx: number,
  fovDeg: number,
): number {
  if (distanceM <= 0) return Infinity;
  return resolutionWidthPx / sceneWidthMeters(distanceM, fovDeg);
}

/** Distance (metres) at which density drops to `density` px/m. */
export function distanceForDensity(
  density: number,
  resolutionWidthPx: number,
  fovDeg: number,
): number {
  const fovRad = (fovDeg * Math.PI) / 180;
  return resolutionWidthPx / (density * 2 * Math.tan(fovRad / 2));
}

export type DoriDistances = Record<DoriLevel, number>;

/** The four DORI distances (metres) for a camera's current optics. */
export function doriDistances(camera: Camera): DoriDistances {
  const out = {} as DoriDistances;
  for (const level of DORI_LEVELS) {
    out[level] = distanceForDensity(
      DORI_PX_PER_M[level],
      camera.resolutionWidthPx,
      camera.fovAngleDeg,
    );
  }
  return out;
}

/**
 * Derive the fields that depend on optics: horizontal FOV (from sensor + lens)
 * and useful range (the detect distance). Call this whenever optics change so
 * fovAngleDeg / rangeMeters stay consistent.
 */
export function deriveOptics(optics: {
  sensorWidthMm: number;
  resolutionWidthPx: number;
  focalLengthMm: number;
}): { fovAngleDeg: number; rangeMeters: number } {
  const fovAngleDeg = horizontalFovDeg(optics.sensorWidthMm, optics.focalLengthMm);
  const rangeMeters = distanceForDensity(
    DORI_PX_PER_M.detect,
    optics.resolutionWidthPx,
    fovAngleDeg,
  );
  return { fovAngleDeg, rangeMeters };
}

/** The DORI quality level achieved at a given distance, or null below detect. */
export function levelAtDistance(camera: Camera, distanceM: number): DoriLevel | null {
  const density = pxPerMeterAt(distanceM, camera.resolutionWidthPx, camera.fovAngleDeg);
  for (const level of DORI_LEVELS) {
    if (density >= DORI_PX_PER_M[level]) return level;
  }
  return null;
}
