import { useState } from "react";
import { TOUR_STEPS } from "../content/narration";

/** The guided tour, floating over the page. Next steps through the flow, Skip tour dismisses it; the Walkthrough button in the header brings it back. */
export default function NarratorBox({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const last = step === TOUR_STEPS.length - 1;
  return (
    <aside
      aria-label="Narrator"
      className="fixed bottom-4 right-4 z-50 flex w-[min(380px,calc(100vw-2rem))] flex-col gap-3 rounded-xl border-2 border-deep bg-card p-4 shadow-[0_8px_24px_rgba(10,47,122,0.18)]"
    >
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-deep px-2.5 py-0.5 text-xs font-black text-white">
          {step + 1}/{TOUR_STEPS.length}
        </span>
        <span className="text-xs font-bold text-muted">Walkthrough</span>
      </div>
      <p className="text-sm" data-testid="tour-text">
        <strong>{TOUR_STEPS[step].title}.</strong> {TOUR_STEPS[step].text}
      </p>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="text-sm font-bold text-muted">
          Skip tour
        </button>
        <button
          onClick={() => (last ? onClose() : setStep(step + 1))}
          className="rounded-lg bg-accent px-3 py-1 text-sm font-bold text-white"
        >
          {last ? "Done" : "Next"}
        </button>
      </div>
    </aside>
  );
}
