// Renders a sample scene to an SVG using the real coverage engine, so the
// wall-occlusion behaviour can be viewed without a browser. Run with:
//   npx vite-node scripts/render-demo.ts
//
// This is a dev/demo utility, not part of the app bundle.

import { writeFileSync } from "node:fs";
import { computeCoverage } from "../src/engine/coverage";
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

const cameras: Camera[] = [
  {
    id: "c1",
    label: "C1",
    color: "#3b82f6",
    position: { x: 90, y: 90 },
    type: "fixed",
    heading: 35,
    tiltDeg: 15,
    mountHeightMeters: 3,
    fovAngleDeg: 90,
    rangeMeters: 70,
    model: "Generic",
  },
  {
    id: "c2",
    label: "C2",
    color: "#22c55e",
    position: { x: 710, y: 90 },
    type: "fixed",
    heading: 135,
    tiltDeg: 15,
    mountHeightMeters: 3,
    fovAngleDeg: 90,
    rangeMeters: 70,
    model: "Generic",
  },
  {
    id: "c3",
    label: "C3",
    color: "#f59e0b",
    position: { x: 710, y: 440 },
    type: "fixed",
    heading: 215,
    tiltDeg: 15,
    mountHeightMeters: 3,
    fovAngleDeg: 100,
    rangeMeters: 80,
    model: "Generic",
  },
];

function poly(points: { x: number; y: number }[]): string {
  return points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

const cones = cameras
  .map((cam) => {
    const { polygon } = computeCoverage(cam, scale, walls);
    return `  <polygon points="${poly(polygon)}" fill="${cam.color}" fill-opacity="0.28" stroke="${cam.color}" stroke-opacity="0.7" stroke-width="1"/>`;
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
  <text x="20" y="28" fill="#9aa3b2" font-family="system-ui" font-size="14">CCTV coverage — engine demo: cones are blocked by walls (note the shadow behind the partition)</text>
${cones}
${wallPaths}
${camDots}
</svg>`;

writeFileSync("demo-coverage.svg", svg);
console.log("Wrote demo-coverage.svg");
