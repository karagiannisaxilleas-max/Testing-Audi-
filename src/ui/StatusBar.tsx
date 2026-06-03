import { useStore } from "../state/store";
import { metersToDisplay, unitLabel } from "./units";

export function StatusBar() {
  const scale = useStore((s) => s.project.scale);
  const units = useStore((s) => s.project.units);
  const zoom = useStore((s) => s.viewport.scale);
  const cursor = useStore((s) => s.cursor);

  // Cursor position expressed in real-world units, measured from the image
  // origin. Demonstrates that calibration is applied (Phase 1 DoD).
  let cursorText = "—";
  if (cursor && scale) {
    const x = metersToDisplay(cursor.x / scale.pxPerMeter, units);
    const y = metersToDisplay(cursor.y / scale.pxPerMeter, units);
    cursorText = `${x.toFixed(2)}, ${y.toFixed(2)} ${unitLabel(units)}`;
  } else if (cursor) {
    cursorText = `${cursor.x.toFixed(0)}, ${cursor.y.toFixed(0)} px`;
  }

  return (
    <div className="statusbar">
      <span>
        Scale: {scale ? `${scale.pxPerMeter.toFixed(1)} px/m` : "uncalibrated"}
      </span>
      <span>Zoom: {(zoom * 100).toFixed(0)}%</span>
      <span>Cursor: {cursorText}</span>
    </div>
  );
}
