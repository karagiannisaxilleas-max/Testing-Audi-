// Stage-aware side panel. Renders the right editor for the current step and,
// on phones, behaves as a slide-up bottom sheet (the `open` class).

import { useStore } from "../state/store";
import { CameraPanel } from "./Inspector";
import { ReviewPanel } from "./ReviewPanel";
import { QuotePanel } from "./QuotePanel";

const HEADS = {
  survey: { title: "Cameras", sub: "Place, aim and tune coverage" },
  review: { title: "Coverage review", sub: "Verify before pricing" },
  quote: { title: "Quote", sub: "Margin, price & offer" },
} as const;

export function SidePanel({ open }: { open: boolean }) {
  const stage = useStore((s) => s.stage);
  if (stage !== "survey" && stage !== "review" && stage !== "quote") return null;

  const head = HEADS[stage];
  return (
    <aside className={`side ${open ? "open" : ""}`}>
      <div className="side-head">
        <div className="sh-title">{head.title}</div>
        <div className="sh-sub">{head.sub}</div>
      </div>
      {stage === "survey" && <CameraPanel />}
      {stage === "review" && <ReviewPanel />}
      {stage === "quote" && <QuotePanel />}
    </aside>
  );
}
