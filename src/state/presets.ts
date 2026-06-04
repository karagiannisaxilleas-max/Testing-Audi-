// Camera presets: representative optics for common camera classes. Applying a
// preset sets sensor/resolution/focal length; FOV and range are then derived.
// Generic (vendor-neutral) so it works offline without a paid spec catalog.

export interface CameraPreset {
  name: string;
  sensorWidthMm: number;
  resolutionWidthPx: number;
  focalLengthMm: number;
}

export const CAMERA_PRESETS: CameraPreset[] = [
  { name: "2 MP wide (1/2.8\", 2.8mm)", sensorWidthMm: 5.37, resolutionWidthPx: 1920, focalLengthMm: 2.8 },
  { name: "2 MP standard (1/2.8\", 4mm)", sensorWidthMm: 5.37, resolutionWidthPx: 1920, focalLengthMm: 4 },
  { name: "4 MP standard (1/2.8\", 4mm)", sensorWidthMm: 5.37, resolutionWidthPx: 2688, focalLengthMm: 4 },
  { name: "4 MP tele (1/2.8\", 8mm)", sensorWidthMm: 5.37, resolutionWidthPx: 2688, focalLengthMm: 8 },
  { name: "8 MP / 4K (1/2.5\", 4mm)", sensorWidthMm: 5.76, resolutionWidthPx: 3840, focalLengthMm: 4 },
  { name: "8 MP / 4K tele (1/2.5\", 12mm)", sensorWidthMm: 5.76, resolutionWidthPx: 3840, focalLengthMm: 12 },
];
