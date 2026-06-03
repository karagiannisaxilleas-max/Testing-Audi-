// Autosave the project to localStorage (debounced) and restore it on startup,
// so a reload never loses work. Goes through the schema migration hook on load.

import { useEffect, useRef } from "react";
import { useStore } from "../state/store";
import { migrateProject } from "../state/project";

const KEY = "cctv-autosave-v1";

export function loadAutosaved() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return migrateProject(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function useAutosave() {
  const project = useStore((s) => s.project);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify(project));
      } catch {
        // Quota or serialization failure: non-fatal, explicit Save still works.
      }
    }, 500);
    return () => window.clearTimeout(timer.current);
  }, [project]);
}
