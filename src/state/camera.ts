// Camera factory with sensible prosumer defaults.
//
// Defaults reflect a common 4 MP / 4 mm fixed IP camera. FOV and useful range
// are derived from the optics (see engine/dori) so they stay consistent; tune
// resolution / focal length and the DORI coverage bands update accordingly.

import { deriveOptics } from "../engine/dori";
import type { Camera, Point } from "../engine/types";

const PALETTE = [
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#a855f7",
  "#06b6d4",
  "#ec4899",
];

export function pickColor(index: number): string {
  return PALETTE[index % PALETTE.length];
}

const DEFAULT_OPTICS = {
  sensorWidthMm: 5.37, // 1/2.8"
  resolutionWidthPx: 2688, // 4 MP (2688 x 1520)
  focalLengthMm: 4,
};

export function createCamera(position: Point, index: number): Camera {
  const { fovAngleDeg, rangeMeters } = deriveOptics(DEFAULT_OPTICS);
  return {
    id: crypto.randomUUID(),
    label: `C${index + 1}`,
    color: pickColor(index),
    position,
    type: "fixed",
    heading: 0,
    tiltDeg: 15,
    mountHeightMeters: 3,
    ...DEFAULT_OPTICS,
    fovAngleDeg,
    rangeMeters,
    irRangeMeters: 30,
    model: "Generic 4 MP / 4 mm",
  };
}
