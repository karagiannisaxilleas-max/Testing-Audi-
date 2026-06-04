import { describe, expect, it } from "vitest";
import { defaultCatalog, deriveBom, cameraProductId } from "./catalog";
import { buildQuote } from "./quote";
import { DEFAULT_RECORDING } from "./storage";
import type { Camera } from "./types";

function cam(overrides: Partial<Camera> = {}): Camera {
  return {
    id: crypto.randomUUID(),
    label: "C",
    color: "#3b82f6",
    position: { x: 0, y: 0 },
    type: "fixed",
    heading: 0,
    tiltDeg: 15,
    mountHeightMeters: 3,
    sensorWidthMm: 5.37,
    resolutionWidthPx: 2688,
    focalLengthMm: 4,
    fovAngleDeg: 67.71,
    rangeMeters: 80,
    ...overrides,
  };
}

describe("catalog / BOM", () => {
  it("maps cameras to products by type and resolution", () => {
    expect(cameraProductId(cam({ resolutionWidthPx: 1920 }))).toBe("cam-2mp");
    expect(cameraProductId(cam({ resolutionWidthPx: 2688 }))).toBe("cam-4mp");
    expect(cameraProductId(cam({ resolutionWidthPx: 3840 }))).toBe("cam-8mp");
    expect(cameraProductId(cam({ type: "fisheye" }))).toBe("cam-fisheye");
    expect(cameraProductId(cam({ type: "ptz" }))).toBe("cam-ptz");
  });

  it("derives a BOM with recorder, switch, storage, cabling and labor", () => {
    const cams = [cam(), cam(), cam()];
    const bom = deriveBom(cams, DEFAULT_RECORDING, defaultCatalog());
    const ids = bom.map((b) => b.productId);
    expect(ids).toContain("cam-4mp");
    expect(ids).toContain("nvr-8"); // 3 cams -> 8ch
    expect(ids).toContain("sw-8");
    expect(ids).toContain("cable-drop");
    expect(ids).toContain("labor-install");
    // one cable drop, mount and install per camera
    expect(bom.find((b) => b.productId === "cable-drop")!.qty).toBe(3);
    expect(bom.find((b) => b.productId === "labor-install")!.qty).toBe(3);
  });

  it("returns an empty BOM with no cameras", () => {
    expect(deriveBom([], DEFAULT_RECORDING, defaultCatalog())).toEqual([]);
  });
});

describe("quote / margin", () => {
  it("applies markup on cost and totals correctly", () => {
    const catalog = defaultCatalog();
    const bom = deriveBom([cam(), cam()], DEFAULT_RECORDING, catalog);
    const q = buildQuote(bom, catalog, { marginPct: 0.5 });

    // sell = cost * 1.5 everywhere -> subtotal is 1.5x total cost
    expect(q.subtotal).toBeCloseTo(q.totalCost * 1.5, 6);
    expect(q.marginAmount).toBeCloseTo(q.totalCost * 0.5, 6);
    expect(q.marginPctEffective).toBeCloseTo(0.5, 6);
    expect(q.total).toBeCloseTo(q.subtotal, 6); // no tax
  });

  it("supports per-category overrides and tax", () => {
    const catalog = defaultCatalog();
    const bom = deriveBom([cam()], DEFAULT_RECORDING, catalog);
    const q = buildQuote(bom, catalog, {
      marginPct: 0.3,
      overrides: { labor: 0 }, // no markup on labor
      taxPct: 0.1,
    });
    const laborLines = q.lines.filter((l) => l.category === "labor");
    for (const l of laborLines) expect(l.unitPrice).toBeCloseTo(l.unitCost, 6);
    expect(q.taxAmount).toBeCloseTo(q.subtotal * 0.1, 6);
    expect(q.total).toBeCloseTo(q.subtotal * 1.1, 6);
  });
});
