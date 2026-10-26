import { useState } from "react";
import Window from "./Window";
import { TOUR_STEPS } from "../content/narration";

/** The guided tour, floating over the page. Next steps through the flow, Skip tour dismisses it; the Walkthrough button in the header brings it back. */
export default function NarratorBox({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const last = step === TOUR_STEPS.length - 1;
  return (
    <aside
      aria-label="Narrator"
      className="fixed bottom-4 right-4 z-50 w-[min(380px,calc(100vw-2rem))]"
    >
      <Window title={`Walkthrough ${step + 1}/${TOUR_STEPS.length}`} color="blue" bodyClassName="space-y-3 p-4">
        <p className="text-sm" data-testid="tour-text">
          <strong>{TOUR_STEPS[step].title}.</strong> {TOUR_STEPS[step].text}
        </p>
        <div className="flex items-center justify-end gap-3">
          <button onClick={onClose} className="text-sm font-bold underline">
            Skip tour
          </button>
          <button
            onClick={() => (last ? onClose() : setStep(step + 1))}
            className="btn btn-primary px-3 py-1 text-sm"
          >
            {last ? "Done" : "Next"}
          </button>
        </div>
      </Window>
    </aside>
  );
}
