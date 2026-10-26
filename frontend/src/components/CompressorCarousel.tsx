import { useState } from "react";
import { NARRATIONS } from "../content/narration";
import { COLORS, COMPRESSORS, type CompressorName } from "../lib/compressors";

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
    <div className="space-y-2">
      <div className="flex items-stretch gap-2">
        <button aria-label="Previous compressor" onClick={() => step(-1)} className="px-1 text-xl text-muted">
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
                className={`cursor-pointer overflow-hidden rounded-xl border bg-card ${
                  reading === c ? "border-ink ring-2 ring-ink/10" : "border-line"
                } ${on ? "" : "opacity-50"}`}
              >
                <div className="h-2" style={{ background: COLORS[c] }} />
                <div className="flex items-center justify-between px-2 py-2">
                  <span className="font-bold">{c}</span>
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={disabled}
                    aria-label={`Include ${c}`}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => onToggle(c)}
                    className="h-4 w-4 accent-accent"
                  />
                </div>
              </div>
            );
          })}
        </div>
        <button aria-label="Next compressor" onClick={() => step(1)} className="px-1 text-xl text-muted">
          ›
        </button>
      </div>
      <div className="rounded-xl border border-line bg-card p-4" aria-label="Narration" data-testid="narration">
        <p className="mb-1 flex items-center gap-2 font-black">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ background: COLORS[reading] }} />
          {n.title}
        </p>
        <p className="text-sm">{n.body}</p>
      </div>
    </div>
  );
}
