// Camera factory with sensible prosumer defaults.
//
// Defaults reflect a common fixed-lens IP camera so the on-screen cone is
// believable before the user tunes anything. Optics (sensor/lens) are carried
// now so Phase 3 can derive DORI pixel-density coverage from them; in Phase 1
// the cone is driven by fovAngleDeg + rangeMeters directly.

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

export function createCamera(position: Point, index: number): Camera {
  return {
    id: crypto.randomUUID(),
    label: `C${index + 1}`,
    color: pickColor(index),
    position,
    type: "fixed",
    heading: 0,
    tiltDeg: 15,
    mountHeightMeters: 3,
    fovAngleDeg: 90,
    rangeMeters: 12,
    model: "Generic 4 MP / 4 mm",
  };
}
