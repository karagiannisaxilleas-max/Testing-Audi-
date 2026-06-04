// Shared memoized aggregate-analysis computation. Returns null unless a floor
// plan is calibrated and at least one analysis consumer is active (an overlay
// toggle is on, or a no-cover zone exists that we must always check).

import { useMemo } from "react";
import { analyzeCoverage, type AnalysisResult, type Bounds } from "../engine/analysis";
import type { Scale } from "../engine/types";
import { useStore } from "../state/store";

export function useAnalysis(): AnalysisResult | null {
  const project = useStore((s) => s.project);
  const view = useStore((s) => s.view);

  const { floorPlan, scale, cameras, walls, zones } = project;
  const active = view.heatmap || view.blindSpots;
  const anyNoCover = zones.some((z) => z.kind === "no-cover");

  return useMemo(() => {
    if (!floorPlan || !scale || (!active && !anyNoCover)) return null;
    const bounds: Bounds = { x: 0, y: 0, width: floorPlan.width, height: floorPlan.height };
    const cell = Math.max(6, Math.round(Math.min(bounds.width, bounds.height) / 120));
    return analyzeCoverage(cameras, walls, zones, scale as Scale, bounds, cell, view.night);
  }, [floorPlan, scale, cameras, walls, zones, active, anyNoCover, view.night]);
}
