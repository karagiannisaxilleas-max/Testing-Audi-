// Height + tilt ground footprint (Phase 4).
//
// A camera mounted at height `h` and tilted `θ` below horizontal does not see
// the ground right beneath it: the bottom of the frame meets the floor some
// distance away, creating a near dead-zone. The top of the frame meets the
// floor further out (or never, if it points at/above the horizon).
//
// We approximate the vertical field of view from the horizontal FOV assuming a
// 16:9 sensor, which is typical for IP cameras. Pure and unit-tested.

import type { Camera } from "./types";

const DEG = Math.PI / 180;

/** Vertical FOV (deg) from horizontal FOV, assuming a 16:9 sensor. */
export function verticalFovDeg(horizontalFovDeg: number, aspect = 16 / 9): number {
  const hRad = horizontalFovDeg * DEG;
  const vRad = 2 * Math.atan(Math.tan(hRad / 2) / aspect);
  return vRad / DEG;
}

export interface Footprint {
  /** Ground distance (m) to the nearest visible point; 0 if it sees its base. */
  nearMeters: number;
  /** Ground distance (m) to the furthest visible point; Infinity above horizon. */
  farMeters: number;
}

/**
 * Near/far ground distances for a camera, from mount height and tilt.
 * `tiltDeg` is measured below horizontal (0 = looking straight ahead, 90 = down).
 */
export function groundFootprint(camera: Camera): Footprint {
  const vfov = verticalFovDeg(camera.fovAngleDeg);
  const h = camera.mountHeightMeters;
  const topAngle = camera.tiltDeg - vfov / 2; // ray nearest the horizon
  const bottomAngle = camera.tiltDeg + vfov / 2; // ray nearest straight-down

  // Bottom ray -> nearest ground point. If it points at/above horizon there is
  // no near limit from tilt (dead-zone 0 is not meaningful), clamp to 0.
  const nearMeters =
    bottomAngle >= 90 || bottomAngle <= 0 ? 0 : h / Math.tan(bottomAngle * DEG);
  // Top ray -> furthest ground point. At/above horizon it never meets ground.
  const farMeters = topAngle <= 0 ? Infinity : h / Math.tan(topAngle * DEG);

  return { nearMeters: Math.max(0, nearMeters), farMeters };
}

/** Radius (m) of the near dead-zone under/in front of the camera. */
export function nearDeadZoneMeters(camera: Camera): number {
  return groundFootprint(camera).nearMeters;
}
