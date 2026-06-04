// Quote building: turn a bill of materials + catalog + margin into a priced
// offer the installer can hand to a client.
//
// Margin is applied as markup on cost (sell = cost × (1 + margin)), which is how
// installers price. A global margin with optional per-category override.

import type { BomLine, Product, ProductCategory } from "./catalog";

export interface QuoteLine {
  productId: string;
  sku: string;
  name: string;
  category: ProductCategory;
  qty: number;
  unitCost: number;
  unitPrice: number; // after margin
  lineCost: number;
  linePrice: number;
}

export interface MarginConfig {
  /** Global markup as a fraction, e.g. 0.35 for 35%. */
  marginPct: number;
  /** Optional per-category markup overrides (fraction). */
  overrides?: Partial<Record<ProductCategory, number>>;
  /** Sales tax fraction applied to the marked-up subtotal, e.g. 0.08. */
  taxPct?: number;
}

export interface Quote {
  lines: QuoteLine[];
  totalCost: number;
  subtotal: number; // marked-up, pre-tax
  marginAmount: number;
  taxAmount: number;
  total: number;
  marginPctEffective: number; // subtotal vs cost
}

function marginFor(category: ProductCategory, cfg: MarginConfig): number {
  return cfg.overrides?.[category] ?? cfg.marginPct;
}

export function buildQuote(
  bom: BomLine[],
  catalog: Product[],
  cfg: MarginConfig,
): Quote {
  const byId = new Map(catalog.map((p) => [p.id, p]));
  const lines: QuoteLine[] = [];

  for (const item of bom) {
    const p = byId.get(item.productId);
    if (!p) continue;
    const m = marginFor(p.category, cfg);
    const unitPrice = p.unitCost * (1 + m);
    lines.push({
      productId: p.id,
      sku: p.sku,
      name: p.name,
      category: p.category,
      qty: item.qty,
      unitCost: p.unitCost,
      unitPrice,
      lineCost: p.unitCost * item.qty,
      linePrice: unitPrice * item.qty,
    });
  }

  const totalCost = lines.reduce((s, l) => s + l.lineCost, 0);
  const subtotal = lines.reduce((s, l) => s + l.linePrice, 0);
  const taxAmount = subtotal * (cfg.taxPct ?? 0);
  return {
    lines,
    totalCost,
    subtotal,
    marginAmount: subtotal - totalCost,
    taxAmount,
    total: subtotal + taxAmount,
    marginPctEffective: totalCost === 0 ? 0 : (subtotal - totalCost) / totalCost,
  };
}
