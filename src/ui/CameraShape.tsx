// Renders one camera: its FOV cone, a body marker, and (when selected) a
// rotation handle for setting heading by dragging.

import { Circle, Group, Line } from "react-konva";
import type Konva from "konva";
import { computeCoverage } from "../engine/coverage";
import type { Camera, Scale, Wall } from "../engine/types";
import { toRadians } from "../engine/geometry";

interface Props {
  camera: Camera;
  scale: Scale;
  walls: Wall[];
  selected: boolean;
  draggable: boolean;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onHeading: (deg: number) => void;
}

export function CameraShape({
  camera,
  scale,
  walls,
  selected,
  draggable,
  onSelect,
  onMove,
  onHeading,
}: Props) {
  // Coverage is wall-aware; points are returned in absolute image coords, so
  // we express them relative to the group origin (the camera position). During
  // a drag the group translates this cached shape; it re-occludes on release.
  const cone = computeCoverage(camera, scale, walls).polygon.flatMap((p) => [
    p.x - camera.position.x,
    p.y - camera.position.y,
  ]);

  const rangePx = camera.rangeMeters * scale.pxPerMeter;
  const headingRad = toRadians(camera.heading);
  const handle = {
    x: Math.cos(headingRad) * rangePx,
    y: Math.sin(headingRad) * rangePx,
  };

  function handleDragMove(e: Konva.KonvaEventObject<DragEvent>) {
    const node = e.target;
    const dx = node.x();
    const dy = node.y();
    onHeading((Math.atan2(dy, dx) * 180) / Math.PI);
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
      {/* Coverage cone (coordinates are relative to the group origin). */}
      <Line
        points={cone}
        closed
        fill={camera.color}
        opacity={0.22}
        stroke={camera.color}
        strokeWidth={selected ? 1.5 : 1}
        strokeScaleEnabled={false}
      />
      {/* Camera body. */}
      <Circle
        radius={7}
        fill={camera.color}
        stroke={selected ? "#fff" : "#0a0c10"}
        strokeWidth={2}
        strokeScaleEnabled={false}
      />
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
