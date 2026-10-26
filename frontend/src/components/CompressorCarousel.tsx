import { useState } from "react";
import { NARRATIONS } from "../content/narration";
import { COLORS, COMPRESSORS, type CompressorName } from "../lib/compressors";
import Window from "./Window";

/** Six cards. Clicking a card to read it changes only the narration; the checkbox picks what runs. */
export default function CompressorCarousel({
  included,
  onToggle,
  disabled,
}: {
  included: CompressorName[];
  onToggle: (c: CompressorName) => void;
  disabled: boolean;
}) {
  const [reading, setReading] = useState<CompressorName>("gzip");
  const step = (d: number) =>
    setReading((r) => COMPRESSORS[(COMPRESSORS.indexOf(r) + d + COMPRESSORS.length) % COMPRESSORS.length]);
  const n = NARRATIONS[reading];
  return (
    <div className="space-y-3">
      <div className="flex items-stretch gap-2">
        <button aria-label="Previous compressor" onClick={() => step(-1)} className="px-1 text-xl font-black">
          ‹
        </button>
        <div className="grid flex-1 grid-cols-6 gap-2" role="list">
          {COMPRESSORS.map((c) => {
            const on = included.includes(c);
            return (
              <div
                key={c}
                role="listitem"
                data-reading={reading === c}
                onClick={() => setReading(c)}
                className={`cursor-pointer overflow-hidden rounded-md border-2 border-ink bg-card transition-transform ${
                  reading === c ? "-translate-x-px -translate-y-px shadow-pop-sm" : ""
                } ${on ? "" : "opacity-50"}`}
              >
                <div className="h-3 border-b-2 border-ink" style={{ background: COLORS[c] }} />
                <div className="flex items-center justify-between px-2 py-2">
                  <span className="font-bold">{c}</span>
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={disabled}
                    aria-label={`Include ${c}`}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => onToggle(c)}
                    className="h-4 w-4 accent-ink"
                  />
                </div>
              </div>
            );
          })}
        </div>
        <button aria-label="Next compressor" onClick={() => step(1)} className="px-1 text-xl font-black">
          ›
        </button>
      </div>
      <Window title={n.title} color="violet" label="Narration" bodyClassName="p-3">
        <p className="text-sm" data-testid="narration">
          <span
            className="mr-2 inline-block h-3 w-3 rounded-sm border-2 border-ink align-middle"
            style={{ background: COLORS[reading] }}
          />
          {n.body}
        </p>
      </Window>
    </div>
  );
}
