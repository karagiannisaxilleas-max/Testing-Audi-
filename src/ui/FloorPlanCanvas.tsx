// The drawing surface: renders the floor-plan image on a Konva stage with
// wheel-zoom and drag-to-pan. Camera/wall/zone rendering arrives in later
// phases; the stage and viewport plumbing live here from Phase 0.

import { useEffect, useRef, useState } from "react";
import { Image as KonvaImage, Layer, Stage } from "react-konva";
import type Konva from "konva";
import { useStore } from "../state/store";

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 8;

export function FloorPlanCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const floorPlan = useStore((s) => s.project.floorPlan);
  const viewport = useStore((s) => s.viewport);
  const setViewport = useStore((s) => s.setViewport);

  // Track container size so the stage fills the available area responsively.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Decode the embedded data URL into an <img> for Konva.
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!floorPlan) {
      setImage(null);
      return;
    }
    const img = new Image();
    img.src = floorPlan.imageDataUrl;
    img.onload = () => setImage(img);
  }, [floorPlan]);

  // Centre and fit the plan whenever a new image loads.
  useEffect(() => {
    if (!floorPlan || size.width === 0) return;
    const fit = Math.min(
      size.width / floorPlan.width,
      size.height / floorPlan.height,
    );
    const scale = Math.min(1, fit) * 0.95;
    setViewport({
      scale,
      x: (size.width - floorPlan.width * scale) / 2,
      y: (size.height - floorPlan.height * scale) / 2,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floorPlan, size.width, size.height]);

  function handleWheel(e: Konva.KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const oldScale = viewport.scale;
    const mousePoint = {
      x: (pointer.x - viewport.x) / oldScale,
      y: (pointer.y - viewport.y) / oldScale,
    };
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const factor = 1.08;
    const newScale = Math.min(
      MAX_ZOOM,
      Math.max(MIN_ZOOM, direction > 0 ? oldScale * factor : oldScale / factor),
    );
    setViewport({
      scale: newScale,
      x: pointer.x - mousePoint.x * newScale,
      y: pointer.y - mousePoint.y * newScale,
    });
  }

  function handleDragEnd(e: Konva.KonvaEventObject<DragEvent>) {
    setViewport({ x: e.target.x(), y: e.target.y() });
  }

  return (
    <div ref={containerRef} style={{ position: "absolute", inset: 0 }}>
      {size.width > 0 && (
        <Stage
          width={size.width}
          height={size.height}
          x={viewport.x}
          y={viewport.y}
          scaleX={viewport.scale}
          scaleY={viewport.scale}
          draggable
          onWheel={handleWheel}
          onDragEnd={handleDragEnd}
        >
          <Layer>
            {image && <KonvaImage image={image} listening={false} />}
          </Layer>
        </Stage>
      )}
    </div>
  );
}
