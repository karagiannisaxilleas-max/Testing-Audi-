// Renders the aggregate analysis: overlap heatmap, blind spots, and no-cover
// violations. Computed on demand (memoized) only when an overlay is enabled, so
// it never runs on the hot drag path.

import { Rect } from "react-konva";
import { useStore } from "../state/store";
import { useAnalysis } from "./useAnalysis";

// A blue->green->amber ramp for overlap counts (1..maxOverlap).
function heatColor(count: number, max: number): string {
  if (max <= 1) return "#22c55e";
  const t = (count - 1) / (max - 1);
  if (t < 0.5) {
    // blue -> green
    const u = t / 0.5;
    return `rgb(${Math.round(59 + u * (34 - 59))}, ${Math.round(130 + u * (197 - 130))}, ${Math.round(246 + u * (94 - 246))})`;
  }
  // green -> amber
  const u = (t - 0.5) / 0.5;
  return `rgb(${Math.round(34 + u * (245 - 34))}, ${Math.round(197 + u * (158 - 197))}, ${Math.round(94 + u * (11 - 94))})`;
}

export function AnalysisOverlay() {
  const view = useStore((s) => s.view);
  const result = useAnalysis();

  if (!result) return null;
  const s = result.cellSize;

  return (
    <>
      {view.heatmap &&
        result.cells.map((c, i) => (
          <Rect
            key={`h${i}`}
            x={c.x}
            y={c.y}
            width={s}
            height={s}
            fill={heatColor(c.count, result.maxOverlap)}
            opacity={0.35}
            listening={false}
          />
        ))}

      {view.blindSpots &&
        result.blindCells.map((c, i) => (
          <Rect
            key={`b${i}`}
            x={c.x}
            y={c.y}
            width={s}
            height={s}
            fill="#ef4444"
            opacity={0.3}
            listening={false}
          />
        ))}

      {result.violationCells.map((c, i) => (
        <Rect
          key={`v${i}`}
          x={c.x}
          y={c.y}
          width={s}
          height={s}
          fill="#dc2626"
          opacity={0.55}
          listening={false}
        />
      ))}
    </>
  );
}
