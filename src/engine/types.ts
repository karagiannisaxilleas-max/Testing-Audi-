// Headless coverage-engine types.
//
// ARCHITECTURAL RULE: this package must not import React, Konva, or any DOM
// API. It takes plain data in and returns plain data out, so it can be unit
// tested and later moved to a Web Worker. The UI converts engine output to
// canvas shapes at the boundary.

export interface Point {
  x: number;
  y: number;
}

export type WallOcclusion = "full" | "partial" | "glass";

export interface Wall {
  id: string;
  /** Polyline vertices in floor-plan pixel coordinates. */
  points: Point[];
  occlusion: WallOcclusion;
}

export type ZoneKind = "interest" | "no-cover";

export interface Zone {
  id: string;
  kind: ZoneKind;
  polygon: Point[];
  label: string;
}

export type CameraType = "fixed" | "fisheye" | "ptz" | "multi";

export interface Camera {
  id: string;
  label: string;
  color: string;
  /** Position in floor-plan pixel coordinates. */
  position: Point;
  type: CameraType;
  /** Lens azimuth in degrees. 0 = +x axis, increasing clockwise in screen space. */
  heading: number;
  /** Degrees below horizontal (used by the height/tilt footprint in Phase 4). */
  tiltDeg: number;
  mountHeightMeters: number;

  // --- Optics (Phase 3). The horizontal FOV and useful range are derived from
  // these, so fovAngleDeg/rangeMeters are kept in sync rather than set by hand. ---
  /** Imaging sensor width in millimetres (e.g. 5.37 for a 1/2.8" sensor). */
  sensorWidthMm: number;
  /** Horizontal resolution in pixels (e.g. 2688 for a 4 MP camera). */
  resolutionWidthPx: number;
  /** Lens focal length in millimetres. */
  focalLengthMm: number;

  /** Horizontal field of view, degrees. Derived from sensor + focal length. */
  fovAngleDeg: number;
  /** Useful outer distance in meters. Derived from the DORI detect threshold. */
  rangeMeters: number;
  /** Night-time IR illuminator reach in meters (limits range in the dark). */
  irRangeMeters?: number;
  model?: string;
}

/** Calibration: how many image pixels correspond to one real-world meter. */
export interface Scale {
  pxPerMeter: number;
}
