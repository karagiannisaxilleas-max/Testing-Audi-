// Application store (Zustand + Immer) with undo/redo built in from day one.
//
// History strategy: every mutation goes through `commit`, which produces the
// next project snapshot via an Immer recipe and pushes the previous snapshot
// onto an undo stack. Retro-fitting undo later is painful, so it is foundational
// here even though Phase 0 only exercises it with trivial edits.

import { produce } from "immer";
import { create } from "zustand";
import { createEmptyProject, type Project } from "./project";
import type { Point } from "../engine/types";

export type ToolMode =
  | "select"
  | "calibrate"
  | "wall"
  | "zone"
  | "camera";

export interface Viewport {
  /** Stage offset in screen pixels. */
  x: number;
  y: number;
  scale: number; // zoom factor
}

export interface ViewFlags {
  cones: boolean; // per-camera DORI coverage bands
  heatmap: boolean; // overlap heatmap
  blindSpots: boolean; // uncovered interest cells
  night: boolean; // night / IR lighting (clamps range, shows glare)
  threeD: boolean; // 3D walk view instead of the 2D plan
}

export type ZoneKind = "interest" | "no-cover";
export type WallKind = "full" | "glass";

interface AppState {
  project: Project;
  past: Project[];
  future: Project[];
  tool: ToolMode;
  viewport: Viewport;
  selectedCameraId: string | null;
  /** Cursor in image-pixel coords; transient, never recorded in history. */
  cursor: Point | null;
  view: ViewFlags;
  zoneKind: ZoneKind;
  wallKind: WallKind;

  // --- history ---
  /** Apply an Immer recipe to the project and record it for undo. */
  commit: (recipe: (draft: Project) => void) => void;
  /** Replace the whole project (e.g. on load/new) and clear history. */
  replaceProject: (project: Project) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // --- ui ---
  setTool: (tool: ToolMode) => void;
  setViewport: (viewport: Partial<Viewport>) => void;
  setSelectedCamera: (id: string | null) => void;
  setCursor: (cursor: Point | null) => void;
  setView: (view: Partial<ViewFlags>) => void;
  setZoneKind: (kind: ZoneKind) => void;
  setWallKind: (kind: WallKind) => void;
}

const HISTORY_LIMIT = 100;

export const useStore = create<AppState>((set, get) => ({
  project: createEmptyProject(),
  past: [],
  future: [],
  tool: "select",
  viewport: { x: 0, y: 0, scale: 1 },
  selectedCameraId: null,
  cursor: null,
  view: { cones: true, heatmap: false, blindSpots: false, night: false, threeD: false },
  zoneKind: "interest",
  wallKind: "full",

  commit: (recipe) =>
    set((state) => {
      const next = produce(state.project, recipe);
      if (next === state.project) return state; // no-op recipe, no history entry
      const past = [...state.past, state.project].slice(-HISTORY_LIMIT);
      return { project: next, past, future: [] };
    }),

  replaceProject: (project) =>
    set({ project, past: [], future: [], selectedCameraId: null }),

  undo: () =>
    set((state) => {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return {
        project: previous,
        past: state.past.slice(0, -1),
        future: [state.project, ...state.future],
      };
    }),

  redo: () =>
    set((state) => {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      return {
        project: next,
        past: [...state.past, state.project],
        future: state.future.slice(1),
      };
    }),

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  setTool: (tool) => set({ tool }),
  setViewport: (viewport) =>
    set((state) => ({ viewport: { ...state.viewport, ...viewport } })),
  setSelectedCamera: (id) => set({ selectedCameraId: id }),
  setCursor: (cursor) => set({ cursor }),
  setView: (view) => set((state) => ({ view: { ...state.view, ...view } })),
  setZoneKind: (zoneKind) => set({ zoneKind }),
  setWallKind: (wallKind) => set({ wallKind }),
}));
