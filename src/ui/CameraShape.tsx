// Renders one camera: its DORI quality bands (nested coverage from identify
// out to detect, each blocked by walls), a body marker, and — when selected —
// a rotation handle for setting heading by dragging.

import { Circle, Group, Line, Text } from "react-konva";
import type Konva from "konva";
import { computeCoverage } from "../engine/coverage";
import { DORI_LEVELS, doriDistances, type DoriLevel } from "../engine/dori";
import { effectiveRangeMeters } from "../engine/lighting";
import type { Camera, Scale, Wall } from "../engine/types";
import { toRadians } from "../engine/geometry";

interface Props {
  camera: Camera;
  scale: Scale;
  walls: Wall[];
  showCone: boolean;
  night: boolean;
  glare: boolean;
  selected: boolean;
  draggable: boolean;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onHeading: (deg: number) => void;
}

// Denser quality = more opaque. Bands are drawn detect-first (largest, bottom)
// so identify ends up on top; overlap naturally reads as higher confidence.
const BAND_OPACITY: Record<DoriLevel, number> = {
  identify: 0.22,
  recognize: 0.16,
  observe: 0.12,
  detect: 0.09,
};

export function CameraShape({
  camera,
  scale,
  walls,
  showCone,
  night,
  glare,
  selected,
  draggable,
  onSelect,
  onMove,
  onHeading,
}: Props) {
  const distances = doriDistances(camera);
  // At night, IR limits reach: clamp every band to the effective range.
  const cap = effectiveRangeMeters(camera, night);

  // One occluded polygon per DORI level, clipped to that level's distance.
  // Coordinates are relative to the group origin (the camera position) so a
  // drag translates the cached shape; it re-occludes on release.
  const bands = showCone
    ? [...DORI_LEVELS]
        .reverse() // detect -> identify (draw order: large to small)
        .map((level) => {
          const banded: Camera = {
            ...camera,
            rangeMeters: Math.min(distances[level], cap),
          };
          const points = computeCoverage(banded, scale, walls).polygon.flatMap(
            (p) => [p.x - camera.position.x, p.y - camera.position.y],
          );
          return { level, points };
        })
    : [];

  const rangePx = camera.rangeMeters * scale.pxPerMeter;
  const headingRad = toRadians(camera.heading);
  const handle = {
    x: Math.cos(headingRad) * rangePx,
    y: Math.sin(headingRad) * rangePx,
  };

  function handleDragMove(e: Konva.KonvaEventObject<DragEvent>) {
    const node = e.target;
    onHeading((Math.atan2(node.y(), node.x()) * 180) / Math.PI);
  }

  return (
    <Group
      x={camera.position.x}
      y={camera.position.y}
      draggable={draggable}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => onMove(e.target.x(), e.target.y())}
    >
      {bands.map(({ level, points }) => (
        <Line
          key={level}
          points={points}
          closed
          fill={camera.color}
          opacity={BAND_OPACITY[level]}
          stroke={level === "detect" ? camera.color : undefined}
          strokeWidth={selected ? 1.25 : 0.75}
          strokeScaleEnabled={false}
          listening={false}
        />
      ))}

      {/* Camera body. */}
      <Circle
        radius={7}
        fill={camera.color}
        stroke={selected ? "#fff" : "#0a0c10"}
        strokeWidth={2}
        strokeScaleEnabled={false}
      />
      {/* Glare warning when the camera looks at a window. */}
      {glare && (
        <Text
          text="⚠"
          x={6}
          y={-18}
          fontSize={16}
          fill="#f59e0b"
          listening={false}
        />
      )}
      {selected && (
        <Circle
          x={handle.x}
          y={handle.y}
          radius={6}
          fill="#fff"
          stroke={camera.color}
          strokeWidth={2}
          strokeScaleEnabled={false}
          draggable
          onDragMove={handleDragMove}
          onDragEnd={handleDragMove}
        />
      )}
    </Group>
  );
}
