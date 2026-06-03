// Scale calibration: derive pixels-per-meter from two clicked points and the
// real-world distance between them. Kept pure so it can be unit tested against
// the ±2% accuracy target in SPEC.md.

import { distance } from "./geometry";
import type { Point, Scale } from "./types";

export function computeScale(a: Point, b: Point, realMeters: number): Scale {
  if (realMeters <= 0) throw new Error("Real-world distance must be positive");
  const px = distance(a, b);
  if (px <= 0) throw new Error("The two points must be distinct");
  return { pxPerMeter: px / realMeters };
}

/** Convert an image-pixel length into meters using a calibrated scale. */
export function pixelsToMeters(pixels: number, scale: Scale): number {
  return pixels / scale.pxPerMeter;
}

/** Convert a real-world length in meters into image pixels. */
export function metersToPixels(meters: number, scale: Scale): number {
  return meters * scale.pxPerMeter;
}
