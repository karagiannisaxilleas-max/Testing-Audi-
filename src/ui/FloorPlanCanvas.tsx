// The drawing surface: Konva stage with wheel-zoom and drag-to-pan, the
// floor-plan image, camera shapes with FOV cones, and the two-click scale
// calibration flow.

import { useEffect, useRef, useState } from "react";
import { Circle, Image as KonvaImage, Layer, Line, Stage } from "react-konva";
import type Konva from "konva";
import { useStore } from "../state/store";
import { createCamera } from "../state/camera";
import { computeScale } from "../engine/calibration";
import type { Point, Scale } from "../engine/types";
import { CameraShape } from "./CameraShape";
import { AnalysisOverlay } from "./AnalysisOverlay";
import { displayToMeters, unitLabel } from "./units";

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 8;
// When the plan is not yet calibrated, draw cones at this nominal scale so
// something meaningful is visible. Status bar flags the uncalibrated state.
const FALLBACK_PX_PER_M = 20;

export function FloorPlanCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const project = useStore((s) => s.project);
  const tool = useStore((s) => s.tool);
  const setTool = useStore((s) => s.setTool);
  const viewport = useStore((s) => s.viewport);
  const setViewport = useStore((s) => s.setViewport);
  const commit = useStore((s) => s.commit);
  const selectedCameraId = useStore((s) => s.selectedCameraId);
  const setSelectedCamera = useStore((s) => s.setSelectedCamera);
  const setCursor = useStore((s) => s.setCursor);
  const view = useStore((s) => s.view);
  const zoneKind = useStore((s) => s.zoneKind);

  const { floorPlan, scale, cameras, units } = project;
  const effectiveScale: Scale = scale ?? { pxPerMeter: FALLBACK_PX_PER_M };

  // Calibration: collected points (image coords) and the pending distance prompt.
  const [calPoints, setCalPoints] = useState<Point[]>([]);
  const [askDistance, setAskDistance] = useState(false);
  const [distanceInput, setDistanceInput] = useState("5");

  // Wall drawing: vertices of the polyline currently being drawn.
  const [draftWall, setDraftWall] = useState<Point[]>([]);
  // Zone drawing: vertices of the polygon currently being drawn.
  const [draftZone, setDraftZone] = useState<Point[]>([]);

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

  // Reset tool scratch state when leaving the relevant tool.
  useEffect(() => {
    if (tool !== "calibrate") {
      setCalPoints([]);
      setAskDistance(false);
    }
    if (tool !== "wall") setDraftWall([]);
    if (tool !== "zone") setDraftZone([]);
  }, [tool]);

  // Finish the wall on Enter, cancel on Escape.
  function finishWall(vertices: Point[]) {
    if (vertices.length >= 2) {
      commit((d) => {
        d.walls.push({
          id: crypto.randomUUID(),
          points: vertices,
          occlusion: "full",
        });
      });
    }
    setDraftWall([]);
  }

  // Finish the zone (>= 3 vertices) on Enter, cancel on Escape.
  function finishZone(vertices: Point[]) {
    if (vertices.length >= 3) {
      commit((d) => {
        d.zones.push({
          id: crypto.randomUUID(),
          kind: zoneKind,
          polygon: vertices,
          label: zoneKind === "interest" ? "Area of interest" : "No-cover zone",
        });
      });
    }
    setDraftZone([]);
  }

  useEffect(() => {
    if (tool !== "wall" && tool !== "zone") return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Enter") {
        if (tool === "wall") finishWall(draftWall);
        else finishZone(draftZone);
      } else if (e.key === "Escape") {
        setDraftWall([]);
        setDraftZone([]);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool, draftWall, draftZone, zoneKind]);

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
    const s = Math.min(1, fit) * 0.95;
    setViewport({
      scale: s,
      x: (size.width - floorPlan.width * s) / 2,
      y: (size.height - floorPlan.height * s) / 2,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floorPlan, size.width, size.height]);

  function handleWheel(e: Konva.KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    const pointer = stage?.getPointerPosition();
    if (!stage || !pointer) return;

    const oldScale = viewport.scale;
    const mousePoint = {
      x: (pointer.x - viewport.x) / oldScale,
      y: (pointer.y - viewport.y) / oldScale,
    };
    const factor = 1.08;
    const newScale = Math.min(
      MAX_ZOOM,
      Math.max(MIN_ZOOM, e.evt.deltaY > 0 ? oldScale / factor : oldScale * factor),
    );
    setViewport({
      scale: newScale,
      x: pointer.x - mousePoint.x * newScale,
      y: pointer.y - mousePoint.y * newScale,
    });
  }

  function handleStageClick(e: Konva.KonvaEventObject<MouseEvent>) {
    const stage = e.target.getStage();
    if (!stage) return;
    // Image coordinates (stage transform already accounts for pan/zoom).
    const pos = stage.getRelativePointerPosition();
    if (!pos) return;
    const clickedEmpty = e.target === stage || e.target.hasName("plan-image");

    if (tool === "camera") {
      commit((d) => {
        d.cameras.push(createCamera({ x: pos.x, y: pos.y }, d.cameras.length));
      });
      return;
    }

    if (tool === "calibrate") {
      if (calPoints.length >= 2) return;
      const next = [...calPoints, { x: pos.x, y: pos.y }];
      setCalPoints(next);
      if (next.length === 2) setAskDistance(true);
      return;
    }

    if (tool === "wall") {
      setDraftWall((prev) => [...prev, { x: pos.x, y: pos.y }]);
      return;
    }

    if (tool === "zone") {
      setDraftZone((prev) => [...prev, { x: pos.x, y: pos.y }]);
      return;
    }

    if (tool === "select" && clickedEmpty) {
      setSelectedCamera(null);
    }
  }

  function applyCalibration() {
    const meters = displayToMeters(parseFloat(distanceInput), units);
    if (calPoints.length === 2 && meters > 0) {
      const scale = computeScale(calPoints[0], calPoints[1], meters);
      commit((d) => {
        d.scale = scale;
      });
    }
    setCalPoints([]);
    setAskDistance(false);
    setTool("select");
  }

  const isSelectMode = tool === "select";

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
          draggable={isSelectMode}
          onWheel={handleWheel}
          onClick={handleStageClick}
          onTap={handleStageClick}
          onDblClick={() => {
            if (tool === "wall") finishWall(draftWall);
            else if (tool === "zone") finishZone(draftZone);
          }}
          onMouseMove={(e) => {
            const pos = e.target.getStage()?.getRelativePointerPosition();
            if (pos) setCursor({ x: pos.x, y: pos.y });
          }}
          onMouseLeave={() => setCursor(null)}
          onDragEnd={(e) => {
            // Only the stage itself reports the pan offset.
            if (e.target === e.target.getStage()) {
              setViewport({ x: e.target.x(), y: e.target.y() });
            }
          }}
          style={{ cursor: tool === "select" ? "default" : "crosshair" }}
        >
          <Layer>
            {image && (
              <KonvaImage image={image} name="plan-image" listening />
            )}

            {/* Aggregate analysis (heatmap / blind spots / no-cover). */}
            <AnalysisOverlay />

            {/* Zones (areas of interest and no-cover). */}
            {project.zones.map((z) => (
              <Line
                key={z.id}
                points={z.polygon.flatMap((p) => [p.x, p.y])}
                closed
                stroke={z.kind === "interest" ? "#38bdf8" : "#f43f5e"}
                strokeWidth={2}
                dash={z.kind === "no-cover" ? [6, 4] : undefined}
                fill={z.kind === "interest" ? "#38bdf8" : "#f43f5e"}
                opacity={0.12}
                strokeScaleEnabled={false}
                listening={false}
              />
            ))}

            {/* Walls (full-height occluders). */}
            {project.walls.map((w) => (
              <Line
                key={w.id}
                points={w.points.flatMap((p) => [p.x, p.y])}
                stroke="#e6e8ec"
                strokeWidth={3}
                strokeScaleEnabled={false}
                lineCap="round"
                lineJoin="round"
                listening={false}
              />
            ))}

            {/* Wall currently being drawn. */}
            {draftWall.length > 0 && (
              <>
                <Line
                  points={draftWall.flatMap((p) => [p.x, p.y])}
                  stroke="#22c55e"
                  strokeWidth={3}
                  strokeScaleEnabled={false}
                  dash={[8, 4]}
                  lineCap="round"
                />
                {draftWall.map((p, i) => (
                  <Circle
                    key={i}
                    x={p.x}
                    y={p.y}
                    radius={4}
                    fill="#22c55e"
                    strokeScaleEnabled={false}
                  />
                ))}
              </>
            )}

            {/* Zone currently being drawn. */}
            {draftZone.length > 0 && (
              <>
                <Line
                  points={draftZone.flatMap((p) => [p.x, p.y])}
                  closed={draftZone.length > 2}
                  stroke={zoneKind === "interest" ? "#38bdf8" : "#f43f5e"}
                  strokeWidth={2}
                  dash={[6, 4]}
                  strokeScaleEnabled={false}
                />
                {draftZone.map((p, i) => (
                  <Circle
                    key={i}
                    x={p.x}
                    y={p.y}
                    radius={4}
                    fill={zoneKind === "interest" ? "#38bdf8" : "#f43f5e"}
                    strokeScaleEnabled={false}
                  />
                ))}
              </>
            )}

            {cameras.map((cam) => (
                <CameraShape
                  key={cam.id}
                  camera={cam}
                  scale={effectiveScale}
                  walls={project.walls}
                  showCone={view.cones}
                  selected={cam.id === selectedCameraId}
                  draggable={isSelectMode}
                  onSelect={() => setSelectedCamera(cam.id)}
                  onMove={(x, y) =>
                    commit((d) => {
                      const c = d.cameras.find((c) => c.id === cam.id);
                      if (c) c.position = { x, y };
                    })
                  }
                  onHeading={(deg) =>
                    commit((d) => {
                      const c = d.cameras.find((c) => c.id === cam.id);
                      if (c) c.heading = deg;
                    })
                  }
                />
              ))}

            {/* Calibration in-progress overlay. */}
            {calPoints.length > 0 && (
              <>
                {calPoints.length === 2 && (
                  <Line
                    points={[
                      calPoints[0].x,
                      calPoints[0].y,
                      calPoints[1].x,
                      calPoints[1].y,
                    ]}
                    stroke="#f59e0b"
                    strokeWidth={2}
                    strokeScaleEnabled={false}
                    dash={[6, 4]}
                  />
                )}
                {calPoints.map((p, i) => (
                  <Circle
                    key={i}
                    x={p.x}
                    y={p.y}
                    radius={5}
                    fill="#f59e0b"
                    strokeScaleEnabled={false}
                  />
                ))}
              </>
            )}
          </Layer>
        </Stage>
      )}

      {tool === "calibrate" && !askDistance && (
        <div className="overlay-hint">
          Click two points a known distance apart
          {calPoints.length === 1 ? " — now click the second point" : ""}
        </div>
      )}

      {tool === "wall" && (
        <div className="overlay-hint">
          Click to add wall points · double-click or Enter to finish · Esc to cancel
        </div>
      )}

      {tool === "zone" && (
        <div className="overlay-hint">
          Drawing a {zoneKind === "interest" ? "area of interest" : "no-cover"} zone
          · click to add points · double-click or Enter to close · Esc to cancel
        </div>
      )}

      {askDistance && (
        <div className="cal-dialog">
          <div>Real-world distance between the two points:</div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <input
              autoFocus
              type="number"
              step="0.1"
              min="0"
              value={distanceInput}
              onChange={(e) => setDistanceInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyCalibration()}
              style={{ width: 90 }}
            />
            <span style={{ alignSelf: "center" }}>{unitLabel(units)}</span>
            <button className="active" onClick={applyCalibration}>
              Set scale
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
