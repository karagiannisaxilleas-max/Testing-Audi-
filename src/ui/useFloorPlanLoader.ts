// Loads an image File into the project as an embedded base64 floor plan,
// reading its natural dimensions so the canvas can size and centre it.

import { useCallback } from "react";
import { useStore } from "../state/store";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function imageSize(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("Could not decode image"));
    img.src = dataUrl;
  });
}

export function useFloorPlanLoader() {
  const commit = useStore((s) => s.commit);

  return useCallback(
    async (file: File) => {
      const dataUrl = await readFileAsDataUrl(file);
      const { width, height } = await imageSize(dataUrl);
      commit((draft) => {
        draft.floorPlan = { imageDataUrl: dataUrl, width, height };
        // A freshly loaded plan invalidates any previous calibration.
        draft.scale = null;
      });
    },
    [commit],
  );
}
