import { describe, expect, it } from "vitest";
import {
  cameraBitrateMbps,
  cameraStorageGB,
  DEFAULT_RECORDING,
  systemEstimate,
} from "./storage";
import type { Camera } from "./types";

function cam(resolutionWidthPx = 1920): Camera {
  return {
    id: "c",
    label: "C",
    color: "#3b82f6",
    position: { x: 0, y: 0 },
    type: "fixed",
    heading: 0,
    tiltDeg: 15,
    mountHeightMeters: 3,
    sensorWidthMm: 5.37,
    resolutionWidthPx,
    focalLengthMm: 4,
    fovAngleDeg: 67.71,
    rangeMeters: 80,
  };
}

describe("storage / bandwidth estimation", () => {
  it("1080p H.264 @15fps lands around 3 Mbps", () => {
    const cfg = { ...DEFAULT_RECORDING, codec: "h264" as const, fps: 15 };
    const mbps = cameraBitrateMbps(cam(1920), cfg);
    expect(mbps).toBeGreaterThan(2.5);
    expect(mbps).toBeLessThan(3.5);
  });

  it("H.265 roughly halves the bitrate of H.264", () => {
    const h264 = cameraBitrateMbps(cam(1920), { ...DEFAULT_RECORDING, codec: "h264" });
    const h265 = cameraBitrateMbps(cam(1920), { ...DEFAULT_RECORDING, codec: "h265" });
    expect(h265 / h264).toBeCloseTo(0.5, 1);
  });

  it("storage scales linearly with retention", () => {
    const sevenDay = cameraStorageGB(cam(), { ...DEFAULT_RECORDING, retentionDays: 7 });
    const fourteen = cameraStorageGB(cam(), { ...DEFAULT_RECORDING, retentionDays: 14 });
    expect(fourteen / sevenDay).toBeCloseTo(2, 5);
  });

  it("motion-only recording reduces storage", () => {
    const cont = cameraStorageGB(cam(), { ...DEFAULT_RECORDING, continuous: true });
    const motion = cameraStorageGB(cam(), { ...DEFAULT_RECORDING, continuous: false });
    expect(motion).toBeLessThan(cont);
  });

  it("aggregates a system estimate with PoE and switch sizing", () => {
    const est = systemEstimate([cam(), cam(), cam()], DEFAULT_RECORDING);
    expect(est.cameras).toBe(3);
    expect(est.poeWatts).toBe(24); // 3 x 8W
    expect(est.switchPorts).toBe(8); // rounds up
    expect(est.totalStorageTB).toBeGreaterThan(0);
  });
});
