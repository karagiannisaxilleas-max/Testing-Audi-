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
  /** Horizontal field of view, degrees. In the MVP this is set directly. */
  fovAngleDeg: number;
  /** Effective useful distance in meters. MVP heuristic; Pro derives from DORI. */
  rangeMeters: number;
  model?: string;
}

/** Calibration: how many image pixels correspond to one real-world meter. */
export interface Scale {
  pxPerMeter: number;
}
