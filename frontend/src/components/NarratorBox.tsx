import { useState } from "react";
import { TOUR_STEPS } from "../content/narration";

/** The guided tour: Next steps through the flow, Skip tour dismisses it. The app stays usable throughout. */
export default function NarratorBox() {
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(true);
  if (!open) return null;
  const last = step === TOUR_STEPS.length - 1;
  return (
    <aside
      aria-label="Narrator"
      className="flex items-center gap-4 rounded-xl border border-line bg-card px-4 py-3"
    >
      <span className="rounded-full bg-deep px-2.5 py-0.5 text-xs font-black text-white">
        {step + 1}/{TOUR_STEPS.length}
      </span>
      <p className="flex-1 text-sm" data-testid="tour-text">
        <strong>{TOUR_STEPS[step].title}.</strong> {TOUR_STEPS[step].text}
      </p>
      <button onClick={() => setOpen(false)} className="text-sm font-bold text-muted">
        Skip tour
      </button>
      <button
        onClick={() => (last ? setOpen(false) : setStep(step + 1))}
        className="rounded-lg bg-accent px-3 py-1 text-sm font-bold text-white"
      >
        {last ? "Done" : "Next"}
      </button>
    </aside>
  );
}
