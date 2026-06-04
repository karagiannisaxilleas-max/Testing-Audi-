// Storage, bandwidth and power estimation (Phase 5).
//
// Bitrate is modelled per camera from its pixel count, frame rate and codec
// using a bits-per-pixel approximation, which lines up well with typical CBR
// figures (1080p H.264 ~3 Mbps, H.265 ~1.5 Mbps). Estimates only — real bitrate
// depends on scene complexity — so we expose the assumptions.

import type { Camera } from "./types";

export type Codec = "h264" | "h265";

export interface RecordingConfig {
  fps: number;
  codec: Codec;
  retentionDays: number;
  /** Continuous vs. motion-only recording (motion assumes ~40% duty). */
  continuous: boolean;
  wattsPerCamera: number;
}

export const DEFAULT_RECORDING: RecordingConfig = {
  fps: 15,
  codec: "h265",
  retentionDays: 14,
  continuous: true,
  wattsPerCamera: 8,
};

const MOTION_DUTY = 0.4;

/** Compressed bits per pixel per frame, by codec. */
export function bitsPerPixel(codec: Codec): number {
  return codec === "h265" ? 0.05 : 0.1;
}

/** Pixel dimensions assuming a 16:9 sensor from the stored horizontal width. */
export function pixelDimensions(camera: Camera): { w: number; h: number } {
  const w = camera.resolutionWidthPx;
  return { w, h: Math.round((w * 9) / 16) };
}

/** Average bitrate (Mbps) for one camera under a recording config. */
export function cameraBitrateMbps(camera: Camera, cfg: RecordingConfig): number {
  const { w, h } = pixelDimensions(camera);
  const raw = (w * h * cfg.fps * bitsPerPixel(cfg.codec)) / 1_000_000;
  return raw * (cfg.continuous ? 1 : MOTION_DUTY);
}

/** Storage (GB) for one camera over the retention window. */
export function cameraStorageGB(camera: Camera, cfg: RecordingConfig): number {
  const bytesPerDay = (cameraBitrateMbps(camera, cfg) * 1_000_000 / 8) * 86_400;
  return (bytesPerDay * cfg.retentionDays) / 1_000_000_000;
}

export interface SystemEstimate {
  cameras: number;
  totalBitrateMbps: number;
  totalStorageTB: number;
  poeWatts: number;
  /** Suggested switch size (ports rounded up to 8/16/24/48). */
  switchPorts: number;
}

function suggestSwitchPorts(channels: number): number {
  for (const size of [8, 16, 24, 48]) if (channels <= size) return size;
  return Math.ceil(channels / 48) * 48;
}

export function systemEstimate(
  cameras: Camera[],
  cfg: RecordingConfig,
): SystemEstimate {
  const totalBitrateMbps = cameras.reduce((s, c) => s + cameraBitrateMbps(c, cfg), 0);
  const totalStorageGB = cameras.reduce((s, c) => s + cameraStorageGB(c, cfg), 0);
  return {
    cameras: cameras.length,
    totalBitrateMbps,
    totalStorageTB: totalStorageGB / 1000,
    poeWatts: cameras.length * cfg.wattsPerCamera,
    switchPorts: suggestSwitchPorts(cameras.length),
  };
}
