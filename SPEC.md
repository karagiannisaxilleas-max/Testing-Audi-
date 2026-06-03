# CCTV Camera Positioning Tool — Design Spec

A browser-based tool for planning CCTV camera layouts on a building floor plan.
Load a floor-plan image, calibrate it to real-world scale, place cameras, and see
**trustworthy** coverage — graded by image quality and blocked by walls — so you can
eliminate blind spots and justify a purchase *before* buying or mounting hardware.

This spec is organized in three ambition tiers so there is a buildable path through the
full vision:

- **MVP** — the smallest thing that is genuinely useful and demoable.
- **Pro** — what makes the output trustworthy enough to spend money on.
- **Perfect** — the north-star. Includes research-grade items, explicitly fenced as risky/optional.

---

## 0. What "perfect" means here

Perfection is not the longest feature list. It is:

1. **Validated accuracy** — predicted coverage matches what you measure on-site with a real camera, within a stated tolerance.
2. **Trustworthy output** — the result justifies a purchase order and survives a client's/installer's scrutiny.
3. **Frictionless** — the target user finishes the job without fighting the tool.
4. **Reliable** — tested, fast, never loses work, degrades gracefully.

Every feature below is justified by one of these. Where a feature can't be validated by
software alone (needs real hardware) or is algorithmically open-ended, it is fenced as
**[RESEARCH-GRADE]**.

### Target users (scope must serve one well before the next)
- **Primary (MVP/Pro):** prosumer / small-business installer planning 1–30 cameras on one or a few floors.
- **Secondary (Perfect):** professional security integrator bidding multi-building sites.

Decisions locked in for v1: real-world scale + wall occlusion; image upload (PNG/JPG);
single-page app, no backend required.

---

## 1. Goals & non-goals

### MVP goals
- Load a floor-plan image as a drawing background; pan/zoom.
- Calibrate scale ("this line is 5 m") so all distances are metric (and imperial-toggle).
- Trace walls so they can block coverage.
- Place, move, rotate, delete cameras with FOV angle, range, mount height.
- Render each camera's coverage as a sector clipped by walls (line-of-sight).
- Save/load a project (versioned JSON) + autosave; export annotated PNG.

### Pro goals
- **DORI pixel-density coverage** (quality gradient, not binary) derived from resolution + lens + sensor.
- Height + tilt → correct ground footprint and near dead-zone.
- Aggregate coverage, overlap heatmap, blind-spot + no-cover/privacy-zone highlighting.
- Camera schedule + bill of materials; storage/bandwidth and PoE/NVR-channel calculators.
- PDF report; undo/redo; lens & camera presets.

### Perfect goals (north-star)
- Physically faithful optics, IR/low-light range, glare warnings, partial occluders, glass.
- Camera types: fixed, fisheye/360, PTZ time-coverage, multi-sensor, thermal.
- 3D view; multi-floor/multi-building; mobile site-survey companion; collaboration/sharing.
- **[RESEARCH-GRADE]** auto-placement optimization; AI floor-plan/wall detection; field-validated accuracy harness.

### Non-goals (all tiers)
- Live video / VMS integration; accounts & cloud sync beyond share links (until Perfect).
- Pricing feeds that require paid vendor APIs (use spec sheets / generic mode).

---

## 2. Tech stack

| Concern         | Choice                                   | Why |
|-----------------|------------------------------------------|-----|
| Framework       | React + TypeScript + Vite                | Fast, typed, static-hostable |
| Canvas/shapes   | Konva.js (`react-konva`)                 | Drag, rotate, hit-testing |
| Geometry        | **Headless `coverage-engine` module** + `polygon-clipping` | Pure, testable, worker-able |
| Heavy compute   | Web Worker (Comlink)                     | Keep UI thread free for heatmaps |
| State           | Zustand + Immer + command/patch history  | Lightweight store **with undo/redo from day one** |
| Persistence     | Versioned JSON download/upload + `localStorage` autosave | No backend |
| Export          | Canvas `toDataURL` (PNG); `jsPDF` + `jspdf-autotable` (PDF report) | Client-side |
| 3D (Perfect)    | three.js                                 | Walk-the-space view |
| Tests           | Vitest (engine golden cases) + Playwright (smoke) | Correctness is the product |

Everything runs client-side; deploys as static files (GitHub Pages / Netlify).

### Architectural rule (non-negotiable)
The **`coverage-engine`** is a pure TypeScript package with **no React/Konva/DOM imports**.
Input: cameras + walls + scale + zones. Output: coverage polygons, quality grids, blind
spots, metrics. This makes the math unit-testable, worker-friendly, and reusable. UI converts
engine output to canvas shapes at the boundary.

---

## 3. Data model

```ts
interface Project {
  schemaVersion: number;        // migrations live in /engine/migrations
  id: string;
  name: string;
  units: "metric" | "imperial"; // display only; engine works in meters
  floorPlan: { imageDataUrl: string; width: number; height: number };
  scale: { pxPerMeter: number } | null;   // single source of truth for units
  walls: Wall[];
  zones: Zone[];                // areas-of-interest and no-cover/privacy zones
  cameras: Camera[];
}

interface Wall   { id: string; points: Point[]; occlusion: "full" | "partial" | "glass"; }
interface Zone   { id: string; kind: "interest" | "no-cover"; polygon: Point[]; label: string; }

interface Camera {
  id: string; label: string; color: string;
  position: Point;            // image-px
  type: "fixed" | "fisheye" | "ptz" | "multi";   // MVP uses "fixed"
  heading: number;            // deg, lens azimuth
  tiltDeg: number;            // deg below horizontal (Pro)
  mountHeightMeters: number;
  // Optics — Pro derives quality from these; MVP may set fovAngle/range directly
  sensor: { widthMm: number; resolutionPx: { w: number; h: number } };
  lens:   { focalLengthMm: number };
  fovAngleDeg: number;        // derived from sensor+lens, or set directly in MVP
  rangeMeters: number;        // MVP: heuristic; Pro: derived from DORI threshold
  model?: string;             // preset name
}

interface Point { x: number; y: number; }
```

**Single source of truth for units:** `pxPerMeter`. UI shows metric/imperial; engine math is
in meters; conversion happens only at the boundary.

---

## 4. The coverage engine (the heart of the tool)

### 4.1 Visibility / occlusion (MVP)
For each camera compute a **visibility polygon** clipped to its FOV sector:
1. Build sector: apex at `position`, `heading ± fovAngle/2`, radius `rangeMeters · pxPerMeter`.
2. Collect wall segments within the sector's bounding circle (spatial cull).
3. Ray-cast to every wall endpoint in-sector (+ slight ±ε offsets for silhouettes, + the two sector edges).
4. Nearest wall hit per ray, clamped to range.
5. Sort hits by angle → visibility polygon → intersect with sector wedge = coverage polygon.

`partial` occluders reduce quality past them rather than fully block; `glass` blocks nothing
optically but flags glare (Perfect). Aggregate coverage = union; blind spots = interest-region
− coverage; no-cover violations = coverage ∩ no-cover zones.

### 4.2 DORI pixel-density coverage (Pro) — the trust upgrade
Instead of a hand-typed range, **derive** coverage quality from optics. Horizontal pixel
density at ground distance `d`:

```
fovAngle = 2·atan(sensorWidth / (2·focalLength))
horizontalSceneWidth(d) = 2·d·tan(fovAngle/2)
pxPerMeter(d) = resolution.w / horizontalSceneWidth(d)
```

Map to DORI bands (EN 62676-4): **Identify ≥250 px/m, Recognize ≥125, Observe ≥62.5,
Detect ≥25**. The cone becomes a **color-banded gradient**; "range" is the distance where
quality drops below the user's chosen minimum (not a guess). Worked example documented in
`/docs/dori-example.md`.

### 4.3 Height + tilt footprint (Pro)
A wall/ceiling camera at height `h`, tilt `θ` below horizontal, vertical FOV `vfov`:
- near ground edge = `h / tan(θ + vfov/2)`, far = `h / tan(θ − vfov/2)` (∞ when ray ≥ horizontal).
- yields a **near dead-zone** under the camera. The 2D footprint uses these near/far radii
  instead of starting the wedge at the lens. Top-down view shows the projected footprint;
  3D view (Perfect) shows the true frustum.

### 4.4 Performance & correctness
- Dirty-flag recompute: only recompute a camera when it or a nearby wall/zone changes.
- Move heatmap/union to a **Web Worker** once camera count is high.
- **Golden tests** (Vitest): square room, L-room, single pillar, two-camera overlap, camera-in-corner — assert polygon area & blind-spot count within tolerance.

---

## 5. UI

```
┌───────────────────────────────────────────────────────────┐
│ [Load] [Calibrate] [Wall] [Zone] [Camera] [Select] | [Undo][Redo] │
│ View: Coverage▢ Quality(DORI)▢ Heatmap▢ Blindspots▢ No-cover▢ 3D▢  │
│ [Save][Load][Export PNG][Export PDF]                       │
├──────────────────────────────────────────┬────────────────┤
│   Canvas: plan · walls · zones · cameras  │ Inspector       │
│   · coverage/quality overlays             │  Camera "C3"    │
│                                           │  Type/Model[▼]   │
│                                           │  Heading/Tilt    │
│                                           │  Lens/Sensor/Res │
│                                           │  Height          │
│                                           │  → derived FOV,  │
│                                           │    DORI distances│
│                                           │ Camera list      │
└──────────────────────────────────────────┴────────────────┘
Status: scale(px/m) · zoom · cursor in m/ft · coverage% · #blind spots
```

Modes: Select (drag-move, rotate handle = heading, cone handle = range), Calibrate (2 clicks
+ distance), Draw Wall (polyline), Draw Zone (interest / no-cover), Place Camera. Pan =
space-drag/middle-mouse; zoom = wheel. Snapping to wall endpoints. Measurement tool.

---

## 6. Roadmap with acceptance criteria (Definition of Done)

> A phase is "done" only when its **measurable** criteria pass — not when it "looks done."

### Tier: MVP
**Phase 0 — Scaffold + engine skeleton**
- Vite+React+TS, Konva canvas, Zustand store with undo/redo, empty headless `coverage-engine` with test harness.
- *DoD:* load a PNG/JPG → renders as background; pan/zoom; undo/redo a no-op command; CI runs `vitest` green.

**Phase 1 — Calibrate & cameras (unblocked cones)**
- Scale calibration (2 points + real distance). Place/move/rotate fixed cameras. Inspector (FOV, range, height). Naive FOV cones. Versioned save/load + autosave; metric/imperial toggle.
- *DoD:* after calibrating a known 5 m line, the status bar reports cursor distances within **±2%** of hand-measured; reload restores the project with **zero data loss**; cones rotate to heading.

**Phase 2 — Walls & occlusion (engine core, highest risk)**
- Wall tool; visibility-polygon clip per sector; dirty-flag recompute.
- *DoD:* golden geometry tests pass (polygon area within **±1%** of analytic value for square/L/pillar cases); a cone visibly stops at a traced wall; a 30-camera/300-segment plan recomputes a changed camera in **<50 ms**.

### Tier: Pro
**Phase 3 — DORI quality coverage**
- Optics-derived FOV + pixel-density bands; color-graded cone; range = chosen-quality cutoff.
- *DoD:* computed px/m matches the worked example in `/docs/dori-example.md` exactly; changing focal length updates bands live.

**Phase 4 — Height/tilt + aggregate analysis**
- Near/far footprint from height+tilt with dead-zone; coverage union; overlap heatmap; blind-spot + no-cover violation highlighting.
- *DoD:* a 3 m-high, 30°-tilt camera shows a non-zero near dead-zone matching the formula within **±2%**; toggling a camera updates aggregate coverage% and blind-spot count.

**Phase 5 — Deliverables**
- Camera schedule + BOM; storage/bandwidth calc (res×fps×codec×days→TB & Mbps); PoE/NVR-channel budget; PDF report; lens/camera presets.
- *DoD:* PDF exports with one row per camera (model, lens, height, FOV, DORI distances) and a totals page; storage estimate within **±5%** of a hand calculation for a known config.

### Tier: Perfect (north-star — fence the risky items)
**Phase 6 — Fidelity:** IR/low-light range, glare warnings, partial/glass occluders, fisheye/360 + PTZ + thermal types, 3D walk view.
**Phase 7 — Scale:** multi-floor/building, share links, comments, mobile site-survey companion.
**Phase 8 — [RESEARCH-GRADE], opt-in, separately scoped:**
- **Auto-placement optimization** (min cameras for target coverage of interest zones) — NP-hard set-cover; ship as heuristic with honest "suggested, verify manually" labeling.
- **AI floor-plan/wall detection** — unreliable on arbitrary images; **manual tracing stays the always-works fallback**.
- **Field-validation harness** — documented real-camera test; *DoD:* predicted px/m within **±15%** of measured for a 4 MP / 4 mm camera at 5/10/15 m. (Requires hardware; software alone cannot close this.)

---

## 7. Risks & mitigations

| Risk | Mitigation |
|------|-----------|
| Occlusion algorithm is fiddly | Headless engine + golden tests built **before** UI wiring (Phase 2 DoD) |
| "Range" implies false precision | Pro replaces it with derived DORI distances; MVP tooltip says "planning heuristic" |
| Large plans slow | Dirty flagging, sector-bbox culling, Web Worker for heatmap/union |
| Manual wall tracing tedious | Snapping, polyline, copy/mirror; AI detection deferred & fenced |
| Accuracy unprovable in software | Phase 8 field-validation harness with a stated tolerance; labeled research-grade |
| Optimization over-promises | Heuristic + "verify manually"; never auto-commit camera placements |
| Schema churn breaks saved projects | `schemaVersion` + migration tests from Phase 1 |

---

## 8. Open product questions
1. Confirm primary user = small/prosumer installer for MVP/Pro (drives default presets & terminology)?
2. Default minimum acceptable quality band — **Recognize (125 px/m)** a sensible default cutoff for "range"?
3. Is the **PDF camera schedule** wanted as early as Phase 5, or can it wait?
4. Any specific camera models/sensors to preload as presets (so DORI numbers are realistic)?
5. Multi-floor needed within the first usable release, or comfortably in the Perfect tier?

---

## 9. Effort summary
- **MVP (Phases 0–2):** a usable, wall-aware planner — a few focused sessions; Phase 2 holds most of the risk.
- **Pro (Phases 3–5):** the trust + deliverables layer that makes it purchase-grade.
- **Perfect (Phases 6–8):** north-star; Phase 8 is research-grade and should be scoped/funded separately.

Recommended first build target: **Phase 0**, immediately establishing the headless
`coverage-engine` + test harness so every later phase lands on a tested foundation.
