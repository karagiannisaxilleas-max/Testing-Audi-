// Guided-flow navigation. Moving between stages also sets sensible defaults for
// the canvas tools and overlays so each step is focused on its job.

import { useStore, type Stage } from "../state/store";

export interface StageMeta {
  id: Stage;
  label: string;
  /** One-line guidance shown in the action bar. */
  hint: string;
}

export const STAGE_META: Record<Exclude<Stage, "welcome">, StageMeta> = {
  setup: {
    id: "setup",
    label: "Setup",
    hint: "Add the client and load the floor plan you're quoting.",
  },
  survey: {
    id: "survey",
    label: "Survey",
    hint: "Calibrate the scale, trace walls, then place and aim cameras.",
  },
  review: {
    id: "review",
    label: "Review",
    hint: "Check coverage and blind spots before pricing the job.",
  },
  quote: {
    id: "quote",
    label: "Quote",
    hint: "Set your margin and send the client a priced offer.",
  },
};

export function useGoToStage() {
  const setStage = useStore((s) => s.setStage);
  const setTool = useStore((s) => s.setTool);
  const setView = useStore((s) => s.setView);
  const setSelected = useStore((s) => s.setSelectedCamera);

  return (stage: Stage) => {
    setSelected(null);
    switch (stage) {
      case "survey":
        setTool("select");
        setView({ cones: true, heatmap: false, blindSpots: false, threeD: false });
        break;
      case "review":
        setTool("select");
        setView({ cones: true, heatmap: false, blindSpots: true, threeD: false });
        break;
      case "quote":
        setTool("select");
        setView({ threeD: false });
        break;
    }
    setStage(stage);
  };
}
