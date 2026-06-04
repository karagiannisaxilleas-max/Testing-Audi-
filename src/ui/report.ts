// Generates a client-ready PDF: project summary, coverage analysis, a camera
// schedule (one row per camera with optics + DORI distances), and the
// storage / bandwidth / power estimate.

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { doriDistances } from "../engine/dori";
import { systemEstimate, type RecordingConfig } from "../engine/storage";
import type { AnalysisResult } from "../engine/analysis";
import type { Project } from "../state/project";
import { formatLength } from "./units";

export function generateReport(
  project: Project,
  cfg: RecordingConfig,
  analysis: AnalysisResult | null,
): void {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const units = project.units;
  const margin = 40;
  let y = margin;

  doc.setFontSize(18);
  doc.text(`CCTV Plan — ${project.name}`, margin, y);
  y += 22;
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(
    `Generated ${new Date().toLocaleDateString()} · ${project.cameras.length} cameras · ` +
      `scale ${project.scale ? project.scale.pxPerMeter.toFixed(1) + " px/m" : "uncalibrated"}`,
    margin,
    y,
  );
  doc.setTextColor(0);
  y += 24;

  // --- Coverage summary ---
  if (analysis) {
    doc.setFontSize(13);
    doc.text("Coverage analysis", margin, y);
    y += 6;
    autoTable(doc, {
      startY: y,
      theme: "plain",
      styles: { fontSize: 10 },
      body: [
        ["Coverage of area of interest", `${analysis.coveragePct.toFixed(1)}%`],
        ["Maximum camera overlap", `${analysis.maxOverlap}×`],
        ["Blind-spot cells", `${analysis.blindCells.length}`],
        ["No-cover violations", `${analysis.violationCells.length}`],
      ],
      margin: { left: margin, right: margin },
    });
    // @ts-expect-error lastAutoTable is added by the plugin
    y = doc.lastAutoTable.finalY + 18;
  }

  // --- Camera schedule ---
  doc.setFontSize(13);
  doc.text("Camera schedule", margin, y);
  y += 6;
  autoTable(doc, {
    startY: y,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [37, 99, 235] },
    head: [["#", "Model", "Res", "Lens", "FOV", "Height", "Identify", "Recognize", "Detect"]],
    body: project.cameras.map((c) => {
      const d = doriDistances(c);
      return [
        c.label,
        c.model ?? "—",
        `${c.resolutionWidthPx}px`,
        `${c.focalLengthMm}mm`,
        `${c.fovAngleDeg.toFixed(0)}°`,
        formatLength(c.mountHeightMeters, units, 1),
        formatLength(d.identify, units, 1),
        formatLength(d.recognize, units, 1),
        formatLength(d.detect, units, 1),
      ];
    }),
    margin: { left: margin, right: margin },
  });
  // @ts-expect-error plugin field
  y = doc.lastAutoTable.finalY + 18;

  // --- System estimate ---
  const est = systemEstimate(project.cameras, cfg);
  doc.setFontSize(13);
  doc.text("Storage, bandwidth & power", margin, y);
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
  // @ts-expect-error plugin field
  y = doc.lastAutoTable.finalY + 14;
  doc.setFontSize(8);
  doc.setTextColor(140);
  doc.text(
    "Estimates assume a 16:9 sensor and a bits-per-pixel bitrate model; actual figures vary with scene complexity.",
    margin,
    y,
  );

  doc.save(`${project.name.replace(/\s+/g, "-").toLowerCase() || "cctv-plan"}.pdf`);
}
