// Product catalog and bill-of-materials derivation (field-sales feature).
//
// Prices here are PLACEHOLDER demo values in USD so the quote flow works end to
// end. They are stored on the project and editable in-app, so an installer
// replaces them with their real Vector Security / distributor pricing. Nothing
// here should be treated as a real quote until the catalog is updated.

import type { Camera } from "./types";
import { systemEstimate, type RecordingConfig } from "./storage";

export type ProductCategory =
  | "camera"
  | "recorder"
  | "switch"
  | "storage"
  | "cable"
  | "mount"
  | "labor";

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: ProductCategory;
  /** Dealer/cost price (what the installer pays). Placeholder demo value. */
  unitCost: number;
  unit: string; // "ea", "drop", "hr"...
}

/** Seed catalog with placeholder costs. Replace unitCost with real pricing. */
export function defaultCatalog(): Product[] {
  return [
    { id: "cam-2mp", sku: "VS-CAM-2MP", name: "2 MP fixed dome camera", category: "camera", unitCost: 120, unit: "ea" },
    { id: "cam-4mp", sku: "VS-CAM-4MP", name: "4 MP fixed turret camera", category: "camera", unitCost: 185, unit: "ea" },
    { id: "cam-8mp", sku: "VS-CAM-8MP", name: "8 MP / 4K fixed camera", category: "camera", unitCost: 300, unit: "ea" },
    { id: "cam-fisheye", sku: "VS-CAM-360", name: "6 MP 360° fisheye camera", category: "camera", unitCost: 420, unit: "ea" },
    { id: "cam-ptz", sku: "VS-CAM-PTZ", name: "4 MP PTZ camera", category: "camera", unitCost: 750, unit: "ea" },
    { id: "nvr-8", sku: "VS-NVR-8", name: "8-channel NVR", category: "recorder", unitCost: 300, unit: "ea" },
    { id: "nvr-16", sku: "VS-NVR-16", name: "16-channel NVR", category: "recorder", unitCost: 520, unit: "ea" },
    { id: "nvr-32", sku: "VS-NVR-32", name: "32-channel NVR", category: "recorder", unitCost: 950, unit: "ea" },
    { id: "sw-8", sku: "VS-SW-8P", name: "8-port PoE switch", category: "switch", unitCost: 150, unit: "ea" },
    { id: "sw-16", sku: "VS-SW-16P", name: "16-port PoE switch", category: "switch", unitCost: 300, unit: "ea" },
    { id: "sw-24", sku: "VS-SW-24P", name: "24-port PoE switch", category: "switch", unitCost: 520, unit: "ea" },
    { id: "sw-48", sku: "VS-SW-48P", name: "48-port PoE switch", category: "switch", unitCost: 950, unit: "ea" },
    { id: "hdd-8tb", sku: "VS-HDD-8TB", name: "8 TB surveillance HDD", category: "storage", unitCost: 190, unit: "ea" },
    { id: "cable-drop", sku: "VS-CBL-DROP", name: "Cat6 cable drop (per camera)", category: "cable", unitCost: 35, unit: "drop" },
    { id: "mount", sku: "VS-MNT", name: "Mount / junction box", category: "mount", unitCost: 25, unit: "ea" },
    { id: "labor-install", sku: "LAB-INST", name: "Camera install & aim (labor)", category: "labor", unitCost: 150, unit: "ea" },
    { id: "labor-config", sku: "LAB-CFG", name: "System config & commissioning (labor)", category: "labor", unitCost: 200, unit: "job" },
  ];
}

/** Which camera product matches a placed camera (by type, then resolution). */
export function cameraProductId(camera: Camera): string {
  if (camera.type === "fisheye") return "cam-fisheye";
  if (camera.type === "ptz") return "cam-ptz";
  if (camera.resolutionWidthPx >= 3000) return "cam-8mp";
  if (camera.resolutionWidthPx >= 2200) return "cam-4mp";
  return "cam-2mp";
}

function pickRecorder(channels: number): string {
  if (channels <= 8) return "nvr-8";
  if (channels <= 16) return "nvr-16";
  return "nvr-32";
}

function pickSwitch(ports: number): string {
  if (ports <= 8) return "sw-8";
  if (ports <= 16) return "sw-16";
  if (ports <= 24) return "sw-24";
  return "sw-48";
}

export interface BomLine {
  productId: string;
  qty: number;
}

/**
 * Derive a bill of materials from the plan: a camera per placed camera (grouped
 * by product), one recorder sized to channel count, a PoE switch, surveillance
 * drives sized to the storage estimate, plus per-camera cabling, mounts and
 * labor and one commissioning labor line.
 */
export function deriveBom(
  cameras: Camera[],
  cfg: RecordingConfig,
  catalog: Product[],
): BomLine[] {
  if (cameras.length === 0) return [];
  const est = systemEstimate(cameras, cfg);
  const lines = new Map<string, number>();
  const add = (id: string, qty: number) => lines.set(id, (lines.get(id) ?? 0) + qty);

  for (const cam of cameras) add(cameraProductId(cam), 1);

  add(pickRecorder(est.cameras), 1);
  add(pickSwitch(est.switchPorts), 1);
  add("hdd-8tb", Math.max(1, Math.ceil(est.totalStorageTB / 8)));
  add("cable-drop", est.cameras);
  add("mount", est.cameras);
  add("labor-install", est.cameras);
  add("labor-config", 1);

  // Keep only products that exist in the catalog, in catalog order.
  const order = new Map(catalog.map((p, i) => [p.id, i]));
  return [...lines.entries()]
    .filter(([id]) => order.has(id))
    .sort((a, b) => order.get(a[0])! - order.get(b[0])!)
    .map(([productId, qty]) => ({ productId, qty }));
}
