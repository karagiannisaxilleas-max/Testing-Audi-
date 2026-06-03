import { useStore } from "../state/store";

export function StatusBar() {
  const scale = useStore((s) => s.project.scale);
  const zoom = useStore((s) => s.viewport.scale);

  return (
    <div className="statusbar">
      <span>Scale: {scale ? `${scale.pxPerMeter.toFixed(1)} px/m` : "uncalibrated"}</span>
      <span>Zoom: {(zoom * 100).toFixed(0)}%</span>
    </div>
  );
}
