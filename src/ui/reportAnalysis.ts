// Non-hook analysis computation for the PDF report (runs outside React).

import { analyzeCoverage, type AnalysisResult } from "../engine/analysis";
import type { Project } from "../state/project";

export function analyzeForReport(project: Project): AnalysisResult | null {
  const { floorPlan, scale, cameras, walls, zones } = project;
  if (!floorPlan || !scale) return null;
  const bounds = { x: 0, y: 0, width: floorPlan.width, height: floorPlan.height };
  const cell = Math.max(6, Math.round(Math.min(bounds.width, bounds.height) / 120));
  return analyzeCoverage(cameras, walls, zones, scale, bounds, cell);
}
