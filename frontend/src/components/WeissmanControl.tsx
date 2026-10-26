import * as ToggleGroup from "@radix-ui/react-toggle-group";
import type { Baseline, ScoreCell, Unit } from "../types";

export const UNIT_LABELS: Record<Unit, string> = { s: "seconds", ms: "milliseconds", us: "microseconds" };
export const BASELINE_LABELS: Record<Baseline, string> = {
  gzip6: "gzip level 6",
  gzip1: "gzip level 1",
  zstd3: "zstd level 3",
};

function Group<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Record<T, string>;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <p className="mb-1 text-sm font-bold text-muted">{label}</p>
      <ToggleGroup.Root
        type="single"
        value={value}
        onValueChange={(v) => v && onChange(v as T)}
        aria-label={label}
        className="flex overflow-hidden rounded-lg border border-line"
      >
        {(Object.keys(options) as T[]).map((k) => (
          <ToggleGroup.Item
            key={k}
            value={k}
            className="px-3 py-1.5 text-sm font-bold data-[state=on]:bg-deep data-[state=on]:text-white"
          >
            {options[k]}
          </ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>
    </div>
  );
}

/** Pick the time unit and baseline; the page just shows the matching precomputed table. */
export default function WeissmanControl({
  unit,
  baseline,
  onUnit,
  onBaseline,
  changed,
  cells,
}: {
  unit: Unit;
  baseline: Baseline;
  onUnit: (u: Unit) => void;
  onBaseline: (b: Baseline) => void;
  changed: string;
  cells: Record<string, ScoreCell>;
}) {
  const notes = [...new Set(Object.values(cells).filter((c) => c.note).map((c) => c.note))];
  return (
    <section className="space-y-3 rounded-xl border border-line bg-card p-5" aria-label="Weissman control">
      <h2 className="text-lg font-black">Break the Weissman score</h2>
      <div className="flex flex-wrap gap-6">
        <Group label="Time unit" value={unit} options={UNIT_LABELS} onChange={onUnit} />
        <Group label="Baseline" value={baseline} options={BASELINE_LABELS} onChange={onBaseline} />
      </div>
      <p className="text-sm" data-testid="weissman-note">
        {changed} Any single score can mislead: the same files and the same compressors give a
        different verdict when only the unit or the baseline changes.
      </p>
      {notes.length > 0 && (
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted" data-testid="weissman-notes">
          {notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
