// Recording configuration and the system estimate (bandwidth / storage / PoE).
// Recording config lives on the project so it persists and feeds the quote.

import { useStore } from "../state/store";
import { systemEstimate, type Codec } from "../engine/storage";

export function SystemPanel() {
  const project = useStore((s) => s.project);
  const commit = useStore((s) => s.commit);
  const cfg = project.recording;

  const est = systemEstimate(project.cameras, cfg);

  return (
    <>
      <h2 style={{ marginTop: 20 }}>Recording &amp; storage</h2>

      <div className="field">
        <div className="label">
          <span>Retention</span>
          <span>{cfg.retentionDays} days</span>
        </div>
        <input
          type="range"
          min={1}
          max={90}
          step={1}
          value={cfg.retentionDays}
          onChange={(e) =>
            commit((d) => {
              d.recording.retentionDays = parseInt(e.target.value, 10);
            })
          }
        />
      </div>

      <div className="field row" style={{ gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div className="label">Frame rate</div>
          <select
            style={{ width: "100%" }}
            value={cfg.fps}
            onChange={(e) =>
              commit((d) => {
                d.recording.fps = parseInt(e.target.value, 10);
              })
            }
          >
            {[10, 12, 15, 20, 25, 30].map((f) => (
              <option key={f} value={f}>{f} fps</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <div className="label">Codec</div>
          <select
            style={{ width: "100%" }}
            value={cfg.codec}
            onChange={(e) =>
              commit((d) => {
                d.recording.codec = e.target.value as Codec;
              })
            }
          >
            <option value="h265">H.265</option>
            <option value="h264">H.264</option>
          </select>
        </div>
      </div>

      <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <input
          type="checkbox"
          checked={cfg.continuous}
          onChange={(e) =>
            commit((d) => {
              d.recording.continuous = e.target.checked;
            })
          }
        />
        <span>Continuous recording (off = motion ~40%)</span>
      </label>

      <div className="summary">
        <div className="summary-row">
          <span>Bandwidth</span>
          <strong>{est.totalBitrateMbps.toFixed(1)} Mbps</strong>
        </div>
        <div className="summary-row">
          <span>Storage</span>
          <strong>{est.totalStorageTB.toFixed(2)} TB</strong>
        </div>
        <div className="summary-row">
          <span>PoE budget</span>
          <strong>{est.poeWatts} W</strong>
        </div>
        <div className="summary-row">
          <span>Switch / channels</span>
          <strong>{est.switchPorts}-port · {est.cameras} ch</strong>
        </div>
      </div>
    </>
  );
}
