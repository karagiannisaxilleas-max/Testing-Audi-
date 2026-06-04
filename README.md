# CCTV Camera Positioning Tool

A browser-based tool for planning CCTV camera layouts on a building floor plan.
Load a floor-plan image, calibrate it to real-world scale, place cameras, and
see coverage graded by image quality and blocked by walls — so you can eliminate
blind spots before buying or mounting hardware.

See [`SPEC.md`](./SPEC.md) for the full design, the MVP → Pro → Perfect roadmap,
and the measurable acceptance criteria per phase.

## Status

A working CCTV planning **and field-sales** tool:

- **Plan:** load a floor plan, calibrate to real-world scale, trace walls and
  windows, drop cameras, set optics (lens/resolution/height/tilt).
- **Coverage:** DORI quality bands (identify → detect) blocked by walls, with a
  near dead-zone from height/tilt. Day and **Night (IR)** modes.
- **Analyse:** aggregate coverage %, overlap heatmap, **blind spots**, no-cover
  (privacy) violations, and **glare** warnings for cameras facing windows.
- **3D walk view** to see mounting heights, tilt and the coverage frustum.
- **Quote:** auto bill of materials → margin → client price, with editable
  placeholder pricing, and a one-tap **client offer (PDF)**.
- **Mobile:** responsive layout, bottom-sheet inspector, pinch-zoom — built to
  be used on a phone on-site.

> Pricing values are PLACEHOLDER demo numbers, editable in-app. Replace them with
> real Vector Security / distributor pricing (or wire up a feed) before quoting.

## Develop

```bash
npm install
npm run dev        # start the app (Vite)
npm test           # run the coverage-engine + store unit tests
npm run build      # type-check and produce a static build in dist/
```

## Architecture

- `src/engine/` — **headless** coverage engine: pure TypeScript geometry, no
  React/Konva/DOM imports, fully unit tested. This is where coverage math lives.
- `src/state/` — Zustand + Immer store with undo/redo and a versioned, migratable
  project model.
- `src/ui/` — React + Konva 2D canvas, three.js 3D view (lazy), toolbar,
  inspector (camera editor, recording, quote), PDF report (lazy).

## Demo render

`npx vite-node scripts/render-demo.ts [--night]` renders the coverage engine to
`demo-coverage.svg` without a browser (handy for a quick visual check).
