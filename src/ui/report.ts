// Generates a client-ready proposal PDF: cover + client details, coverage
// analysis, camera schedule, storage/PoE estimate, and the priced quote (the
// "offer"). Lazy-loaded so jsPDF stays out of the main bundle.

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { doriDistances } from "../engine/dori";
import { systemEstimate } from "../engine/storage";
import type { Quote } from "../engine/quote";
import type { AnalysisResult } from "../engine/analysis";
import type { Project } from "../state/project";
import { formatLength } from "./units";

const money = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function nextY(doc: any): number {
  return doc.lastAutoTable.finalY;
}

export function generateReport(
  project: Project,
  quote: Quote,
  analysis: AnalysisResult | null,
): void {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const units = project.units;
  const cfg = project.recording;
  const margin = 40;
  let y = margin;

  // --- Header ---
  doc.setFontSize(20);
  doc.text("Security System Proposal", margin, y);
  y += 24;
  doc.setFontSize(11);
  doc.text(project.name, margin, y);
  y += 16;
  doc.setFontSize(9);
  doc.setTextColor(120);
  const c = project.client;
  const clientLine = [c.name, c.company, c.email, c.phone].filter(Boolean).join(" · ");
  doc.text(
    `${new Date().toLocaleDateString()}${clientLine ? "   Prepared for: " + clientLine : ""}`,
    margin,
    y,
  );
  doc.setTextColor(0);
  y += 22;

  // --- Priced offer (headline) ---
  doc.setFontSize(14);
  doc.text("Your investment", margin, y);
  y += 6;
  autoTable(doc, {
    startY: y,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [37, 99, 235] },
    head: [["Item", "Qty", "Unit price", "Amount"]],
    body: quote.lines.map((l) => [l.name, String(l.qty), money(l.unitPrice), money(l.linePrice)]),
    foot: [
      ...(quote.taxAmount > 0
        ? [["", "", "Subtotal", money(quote.subtotal)], ["", "", "Tax", money(quote.taxAmount)]]
        : []),
      ["", "", "Total", money(quote.total)],
    ],
    footStyles: { fontStyle: "bold", fillColor: [240, 240, 240], textColor: 20 },
    margin: { left: margin, right: margin },
  });
  y = nextY(doc) + 20;

  // --- Coverage analysis ---
  if (analysis) {
    doc.setFontSize(14);
    doc.text("Coverage analysis", margin, y);
    y += 6;
    autoTable(doc, {
      startY: y,
      theme: "plain",
      styles: { fontSize: 10 },
      body: [
        ["Coverage of area of interest", `${analysis.coveragePct.toFixed(1)}%`],
        ["Maximum camera overlap", `${analysis.maxOverlap}x`],
        ["Blind-spot cells", `${analysis.blindCells.length}`],
        ["No-cover (privacy) violations", `${analysis.violationCells.length}`],
      ],
      margin: { left: margin, right: margin },
    });
    y = nextY(doc) + 18;
  }

  // --- Camera schedule ---
  if (y > 680) {
    doc.addPage();
    y = margin;
  }
  doc.setFontSize(14);
  doc.text("Camera schedule", margin, y);
  y += 6;
  autoTable(doc, {
    startY: y,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [37, 99, 235] },
    head: [["#", "Model", "Res", "Lens", "FOV", "Height", "Identify", "Recognize", "Detect"]],
    body: project.cameras.map((cam) => {
      const d = doriDistances(cam);
      return [
        cam.label,
        cam.model ?? "-",
        `${cam.resolutionWidthPx}px`,
        `${cam.focalLengthMm}mm`,
        `${cam.fovAngleDeg.toFixed(0)}deg`,
        formatLength(cam.mountHeightMeters, units, 1),
        formatLength(d.identify, units, 1),
        formatLength(d.recognize, units, 1),
        formatLength(d.detect, units, 1),
      ];
    }),
    margin: { left: margin, right: margin },
  });
  y = nextY(doc) + 18;

  // --- System estimate ---
  const est = systemEstimate(project.cameras, cfg);
  if (y > 700) {
    doc.addPage();
    y = margin;
  }
  doc.setFontSize(14);
  doc.text("Infrastructure", margin, y);
  y += 6;
  autoTable(doc, {
    startY: y,
    theme: "plain",
    styles: { fontSize: 10 },
    body: [
      ["Recording", `${cfg.continuous ? "Continuous" : "Motion (~40%)"} · ${cfg.fps} fps · ${cfg.codec.toUpperCase()} · ${cfg.retentionDays}-day retention`],
      ["Total bandwidth", `${est.totalBitrateMbps.toFixed(1)} Mbps`],
      ["Total storage", `${est.totalStorageTB.toFixed(2)} TB`],
      ["PoE power budget", `${est.poeWatts} W`],
      ["NVR channels / switch", `${est.cameras} ch · ${est.switchPorts}-port switch`],
    ],
    margin: { left: margin, right: margin },
  });
  y = nextY(doc) + 14;
  doc.setFontSize(8);
  doc.setTextColor(140);
  doc.text(
    "Pricing is based on the installer's configured catalog. Storage/bandwidth are estimates and vary with scene complexity.",
    margin,
    y,
  );

  doc.save(`${project.name.replace(/\s+/g, "-").toLowerCase() || "proposal"}.pdf`);
}
