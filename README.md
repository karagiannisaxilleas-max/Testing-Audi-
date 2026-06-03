# CCTV Camera Positioning Tool

A browser-based tool for planning CCTV camera layouts on a building floor plan.
Load a floor-plan image, calibrate it to real-world scale, place cameras, and
see coverage graded by image quality and blocked by walls — so you can eliminate
blind spots before buying or mounting hardware.

See [`SPEC.md`](./SPEC.md) for the full design, the MVP → Pro → Perfect roadmap,
and the measurable acceptance criteria per phase.

## Status

**Phase 0 — scaffold (complete).** You can load a PNG/JPG floor plan and
pan/zoom it. The tested headless `coverage-engine` and an undo/redo-capable
store are in place as the foundation for later phases.

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
- `src/ui/` — React + Konva canvas, toolbar, inspector, status bar.
