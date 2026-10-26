import * as ToggleGroup from "@radix-ui/react-toggle-group";
import type { Baseline, Unit } from "../types";

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
      <p className="mb-1 text-xs font-bold">{label}</p>
      <ToggleGroup.Root
        type="single"
        value={value}
        onValueChange={(v) => v && onChange(v as T)}
        aria-label={label}
        className="flex overflow-hidden rounded-md border-2 border-ink bg-white"
      >
        {(Object.keys(options) as T[]).map((k) => (
          <ToggleGroup.Item
            key={k}
            value={k}
            className="px-2.5 py-1 text-xs font-bold data-[state=on]:bg-ink data-[state=on]:text-white"
          >
            {options[k]}
          </ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>
    </div>
  );
}

/** The break-it controls: pick the time unit and baseline; the gauge shows the matching precomputed score. */
export default function WeissmanPicker({
  unit,
  baseline,
  onUnit,
  onBaseline,
  note,
}: {
  unit: Unit;
  baseline: Baseline;
  onUnit: (u: Unit) => void;
  onBaseline: (b: Baseline) => void;
  note: string | null; // describes the last change; nothing is shown until the user changes a control
}) {
  return (
    <div className="space-y-2" aria-label="Weissman control">
      <h3 className="font-pixel text-sm">Break the Weissman score</h3>
      <Group label="Time unit" value={unit} options={UNIT_LABELS} onChange={onUnit} />
      <Group label="Baseline" value={baseline} options={BASELINE_LABELS} onChange={onBaseline} />
      {note && (
        <p className="text-xs" data-testid="weissman-note">
          {note}
        </p>
      )}
    </div>
  );
}
