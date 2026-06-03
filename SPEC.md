# CCTV Camera Positioning Tool — Design Spec

A browser-based tool for planning CCTV camera layouts on a building floor plan.
Load a floor-plan image, calibrate it to real-world scale, place cameras,
set their field-of-view, and see realistic coverage that is blocked by walls —
so you can find and eliminate blind spots before buying or mounting hardware.

**Decisions locked in for v1:**
- Coverage accuracy: **real-world scale + wall occlusion** (cones stop at walls; ranges in meters)
- Floor-plan input: **image upload (PNG/JPG)**
- Delivery: **single-page web app**, no backend required

---

## 1. Goals & non-goals

### Goals
- Load a floor-plan image as a drawing background.
- Calibrate scale ("this line is 5 m") so all distances are metric.
- Trace walls so they can block camera coverage.
- Place, move, rotate, and delete cameras.
- Per-camera controls: field-of-view angle, range (or lens focal length), mounting height.
- Render each camera's coverage as a sector (cone) clipped by walls (line-of-sight).
- Aggregate coverage view + blind-spot highlighting.
- Save / load a project (JSON) and export an annotated image / PDF.

### Non-goals (v1)
- Automatic wall detection from the image (user traces walls manually).
- Automatic camera placement optimization.
- 3D modeling, multi-floor stitching, live video, vendor catalogs/pricing.
- Accounts, cloud sync, collaboration.

These are noted in the roadmap as later phases.

---

## 2. Tech stack

| Concern            | Choice                              | Why |
|--------------------|-------------------------------------|-----|
| Framework          | React + TypeScript + Vite           | Fast, typed, easy to host as static files |
| Canvas / shapes    | Konva.js (`react-konva`)            | Built-in drag, rotate, hit-testing for shapes |
| Geometry           | Custom + a small lib (e.g. `martinez`/`polygon-clipping`) | Sector clipping, ray casting, occlusion |
| State              | Zustand                             | Lightweight, no boilerplate |
| Persistence        | JSON download/upload + `localStorage` autosave | No backend needed |
| Export             | Canvas `toDataURL` (PNG); `jsPDF` (PDF) | Client-side |

Everything runs client-side and deploys as static files (GitHub Pages / Netlify).

---

## 3. Core concepts & data model

```ts
interface Project {
  id: string;
  name: string;
  floorPlan: {
    imageDataUrl: string;   // embedded base64 image
    width: number;          // natural px
    height: number;
  };
  scale: {
    // two points the user clicked + the real distance between them
    pxPerMeter: number;     // derived; single source of truth for unit conversion
  } | null;
  walls: Wall[];
  cameras: Camera[];
}

interface Wall {
  id: string;
  points: Point[];          // polyline in image-px coordinates
}

interface Camera {
  id: string;
  label: string;
  position: Point;          // image-px
  heading: number;          // degrees, direction the lens points
  fovAngle: number;         // degrees, horizontal field of view
  rangeMeters: number;      // effective useful distance
  mountHeightMeters: number;
  model?: string;           // optional free-text/preset name
  color: string;
}

interface Point { x: number; y: number; }
```

**Single source of truth for units:** `pxPerMeter`. UI shows meters; geometry math
converts to pixels at the boundary. Camera `rangeMeters` ↔ pixel radius via this factor.

### Lens / FOV model
Two equivalent ways to express FOV; the UI lets the user pick:
- **Direct**: enter FOV angle (deg) + range (m).
- **By lens**: enter sensor width + focal length → `fovAngle = 2·atan(sensorWidth / (2·focalLength))`.
  Provide presets (e.g. 2.8 mm ≈ 90°, 4 mm ≈ 70°, 6 mm ≈ 50° on a common 1/2.8" sensor).

Range is a planning heuristic (identification/recognition/detection distance), not a hard
optical limit — documented as such in the UI tooltip.

---

## 4. Coverage geometry (the interesting part)

For each camera we compute a **visibility polygon** clipped to its FOV sector:

1. Build the sector: apex at `camera.position`, from `heading − fovAngle/2` to
   `heading + fovAngle/2`, radius = `rangeMeters · pxPerMeter`.
2. Collect wall segments that fall within the sector's bounding circle.
3. **Ray casting**: cast rays to every wall endpoint inside the sector (plus the two
   sector edges), and slightly-offset rays around each endpoint to catch silhouettes.
4. For each ray, find the nearest wall intersection; clamp to range.
5. Sort hit points by angle, build the visibility polygon (standard 2D visibility / "raycasting
   shadows" algorithm).
6. Intersect that polygon with the sector wedge → final coverage polygon for that camera.

**Aggregate coverage** = union of all camera polygons (via `polygon-clipping`).
**Blind spots** = (interior floor region) − (aggregate coverage), optionally constrained to
a user-drawn "area of interest" boundary.

Performance: recompute a camera's polygon only when that camera or a nearby wall changes
(dirty flagging). For typical plans (tens of cameras, hundreds of wall segments) this is
real-time on the main thread; if it ever isn't, move it to a Web Worker.

This is the part to prototype first to de-risk the project — see Phase 2.

---

## 5. UI layout

```
┌───────────────────────────────────────────────────────────┐
│ Toolbar:  [Load Plan] [Calibrate] [Wall] [Camera] [Select] │
│           [Coverage ▢] [Blind spots ▢]   [Save][Load][Export]│
├──────────────────────────────────────────┬────────────────┤
│                                           │  Inspector      │
│                                           │  ─────────────  │
│            Canvas (floor plan,            │  Camera "C3"    │
│            walls, cameras, coverage)      │  Heading  ___°  │
│                                           │  FOV      ___°  │
│                                           │  Range    __ m  │
│                                           │  Height   __ m  │
│                                           │  Model  [▼]     │
│                                           │  ─────────────  │
│                                           │  Camera list    │
└──────────────────────────────────────────┴────────────────┘
Status bar: scale (px/m) · zoom · cursor position in meters
```

**Interaction modes** (toolbar): Select, Calibrate, Draw Wall, Place Camera.
- Select: drag to move; rotation handle to set heading; resize handle on the cone to set range.
- Calibrate: click two points, type the real distance.
- Draw Wall: click to add polyline vertices, double-click/Esc to finish.
- Place Camera: click to drop a camera with default specs.
- Pan = space-drag or middle-mouse; zoom = wheel.

---

## 6. Milestones / roadmap

**Phase 0 — Scaffold** (small)
Vite + React + TS project, Konva canvas, toolbar shell, Zustand store, image upload →
floor plan rendered, pan/zoom. *Deliverable: load a plan and navigate it.*

**Phase 1 — Calibrate & cameras** (small–medium)
Scale calibration tool (two clicks + distance). Place/move/rotate cameras. Inspector panel
with FOV/range/height. Draw naive (unblocked) FOV cones. Save/load JSON + autosave.
*Deliverable: place cameras with cones and metric ranges; persist the project.*

**Phase 2 — Walls & occlusion** (medium, the core risk)
Wall-drawing tool. Visibility-polygon computation clipped to each FOV sector. Cones get
blocked by walls. Dirty-flag recompute. *Deliverable: realistic, wall-aware coverage.*
> Recommend building a tiny standalone geometry sandbox first to validate the algorithm
> before wiring it into the full UI.

**Phase 3 — Aggregate coverage & blind spots** (medium)
Union of coverage, area-of-interest boundary, blind-spot highlight, coverage heatmap
(overlap count). *Deliverable: see total coverage and gaps at a glance.*

**Phase 4 — Polish & export** (small–medium)
Lens presets + focal-length input, camera labels/legend, PNG + PDF export with a spec table,
keyboard shortcuts, undo/redo. *Deliverable: shareable plans.*

**Later (optional):** PDF/vector plan import, auto-detect walls (CV), placement optimization,
multi-floor, mobile/touch tuning.

---

## 7. Risks & mitigations

| Risk | Mitigation |
|------|-----------|
| Visibility/occlusion algorithm is fiddly | De-risk in Phase 2 with a standalone sandbox + unit tests on known shapes |
| "Range" implies false optical precision | Tooltip + docs: it's a planning heuristic; offer detect/recognize/identify presets |
| Manual wall tracing is tedious | Snapping, polyline drawing, copy/mirror; CV auto-detect deferred to later |
| Large plans slow recompute | Dirty flagging, spatial culling by sector bbox, Web Worker fallback |
| Lossy scale on weird images | Calibration is mandatory before metric features unlock; warn if uncalibrated |

---

## 8. Open questions for product direction
1. Single floor only in v1, or do you need multi-floor projects soon?
2. Should range default to a **detect / recognize / identify** preset (DORI standard distances)?
3. Is **PDF export with a camera schedule** (table of every camera + specs) important early, or is the on-screen plan enough at first?
4. Any specific camera models/specs you want preloaded as presets?

---

## 9. Estimated effort
A polished MVP through **Phase 3** (load plan → calibrate → place cameras → wall-aware
coverage → blind spots) is on the order of a few focused build sessions. Phase 0–1 produces
something usable and demoable quickly; Phase 2 is where most of the engineering value (and
risk) sits.
