// Renders a sample scene to an SVG using the real coverage engine, so the
// wall-occlusion behaviour can be viewed without a browser. Run with:
//   npx vite-node scripts/render-demo.ts
//
// This is a dev/demo utility, not part of the app bundle.

import { writeFileSync } from "node:fs";
import { computeCoverage } from "../src/engine/coverage";
import { DORI_LEVELS, deriveOptics, doriDistances } from "../src/engine/dori";
import type { Camera, Scale, Wall } from "../src/engine/types";

const W = 800;
const H = 520;
const scale: Scale = { pxPerMeter: 8 }; // 8 px = 1 m

// A simple office: outer walls + one interior partition with a doorway gap.
const walls: Wall[] = [
  {
    id: "outer",
    occlusion: "full",
    points: [
      { x: 40, y: 40 },
      { x: 760, y: 40 },
      { x: 760, y: 480 },
      { x: 40, y: 480 },
      { x: 40, y: 40 },
    ],
  },
  // Interior partition from the top, stopping short to leave a doorway.
  {
    id: "partition",
    occlusion: "full",
    points: [
      { x: 400, y: 40 },
      { x: 400, y: 340 },
    ],
  },
];

function makeCamera(
  id: string,
  label: string,
  color: string,
  position: { x: number; y: number },
  heading: number,
  focalLengthMm: number,
): Camera {
  const optics = { sensorWidthMm: 5.37, resolutionWidthPx: 2688, focalLengthMm };
  const { fovAngleDeg, rangeMeters } = deriveOptics(optics);
  return {
    id,
    label,
    color,
    position,
    type: "fixed",
    heading,
    tiltDeg: 15,
    mountHeightMeters: 3,
    ...optics,
    fovAngleDeg,
    rangeMeters,
    model: "Generic",
  };
}

const cameras: Camera[] = [
  makeCamera("c1", "C1", "#3b82f6", { x: 90, y: 90 }, 35, 4),
  makeCamera("c2", "C2", "#22c55e", { x: 710, y: 90 }, 135, 4),
  makeCamera("c3", "C3", "#f59e0b", { x: 710, y: 440 }, 215, 6),
];

const BAND_OPACITY: Record<string, number> = {
  identify: 0.22,
  recognize: 0.16,
  observe: 0.12,
  detect: 0.09,
};

function poly(points: { x: number; y: number }[]): string {
  return points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

// Nested DORI bands per camera: detect (largest, faint) to identify (smallest).
const cones = cameras
  .map((cam) => {
    const distances = doriDistances(cam);
    return [...DORI_LEVELS]
      .reverse()
      .map((level) => {
        const banded = { ...cam, rangeMeters: distances[level] };
        const { polygon } = computeCoverage(banded, scale, walls);
        const stroke = level === "detect" ? ` stroke="${cam.color}" stroke-opacity="0.5" stroke-width="1"` : "";
        return `  <polygon points="${poly(polygon)}" fill="${cam.color}" fill-opacity="${BAND_OPACITY[level]}"${stroke}/>`;
      })
      .join("\n");
  })
  .join("\n");

const wallPaths = walls
  .map(
    (w) =>
      `  <polyline points="${poly(w.points)}" fill="none" stroke="#e6e8ec" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`,
  )
  .join("\n");

const camDots = cameras
  .map(
    (c) =>
      `  <circle cx="${c.position.x}" cy="${c.position.y}" r="7" fill="${c.color}" stroke="#0a0c10" stroke-width="2"/>\n` +
      `  <text x="${c.position.x + 11}" y="${c.position.y + 4}" fill="#e6e8ec" font-family="system-ui" font-size="13">${c.label}</text>`,
  )
  .join("\n");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#0a0c10"/>
  <text x="20" y="28" fill="#9aa3b2" font-family="system-ui" font-size="14">CCTV coverage — DORI quality bands (densest = identify, near the camera) clipped by walls</text>
${cones}
${wallPaths}
${camDots}
</svg>`;

writeFileSync("demo-coverage.svg", svg);
console.log("Wrote demo-coverage.svg");
