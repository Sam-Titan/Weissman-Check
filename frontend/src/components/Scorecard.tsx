import { COLORS, COMPRESSORS, type CompressorName } from "../lib/compressors";
import {
  DECOMP_ZONES,
  ENTROPY_ZONES,
  GOOD,
  linPos,
  logPos,
  SAVED_ZONES,
  TIME_ZONES,
  WEISSMAN_HI,
  WEISSMAN_LO,
  WEISSMAN_ZONES,
} from "../lib/gauges";
import { formatSpeed, formatTime } from "../lib/format";
import type { Analysis, Baseline, Mode, Unit } from "../types";
import Gauge from "./Gauge";
import WeissmanPicker, { BASELINE_LABELS } from "./WeissmanControl";

const SETTINGS = ["fast", "strong"] as const;

/** Compressor chips plus one gauge per metric for the selected run. Every value is precomputed. */
export default function Scorecard({
  analysis,
  mode,
  selected,
  onSelect,
  entropyBits,
  unit,
  baseline,
  onUnit,
  onBaseline,
  changeNote,
}: {
  analysis: Analysis;
  mode: Mode;
  selected: string;
  onSelect: (key: string) => void;
  entropyBits: number | null;
  unit: Unit;
  baseline: Baseline;
  onUnit: (u: Unit) => void;
  onBaseline: (b: Baseline) => void;
  changeNote: string | null;
}) {
  const row = analysis.rows[selected];
  const g = analysis.gauges;
  const gz = g.gzip_default;
  const timeRange = mode === "static" ? g.time_static : g.time_dynamic;
  const time = row ? (mode === "static" ? row.static_s : row.dynamic_s) : null;
  const gzTime = gz ? (mode === "static" ? gz.static_s : gz.dynamic_s) : null;
  // Time runs the other way round (less is better), so flip it: the right end is always the good end.
  const timePos = (v: number) => 1 - logPos(v, timeRange.min, timeRange.max);
  const cell = analysis.weissman[unit][baseline][selected];
  const weissmanMuted = !cell || cell.status !== "ok";
  const baseLabel = baseline === "gzip6" ? "gzip default" : BASELINE_LABELS[baseline];

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 max-[899px]:h-auto" aria-label="Scorecard">
      <div className="grid shrink-0 grid-cols-3 gap-1.5 min-[900px]:grid-cols-6" role="listbox" aria-label="Compressor">
        {COMPRESSORS.flatMap((c) =>
          SETTINGS.map((s) => {
            const key = `${c}/${s}`;
            if (!analysis.rows[key]) return null;
            const on = key === selected;
            return (
              <button
                key={key}
                role="option"
                aria-selected={on}
                onClick={() => onSelect(key)}
                className={`flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-bold ${
                  on ? "border-ink bg-ink text-white" : "border-line bg-card text-ink"
                }`}
              >
                <span
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: COLORS[c as CompressorName] }}
                />
                {c} <span className="font-normal opacity-70">{s}</span>
              </button>
            );
          }),
        )}
      </div>
      {row && (
        <div className="grid min-h-0 flex-1 gap-2 min-[900px]:grid-cols-3 min-[900px]:grid-rows-2">
          <Gauge
            title={`Time to user (${mode})`}
            valueText={formatTime(time as number)}
            meaning={`Until a user has the file at ${analysis.network_mbps} Mbit/s${mode === "dynamic" ? ", compressing included" : ""}.`}
            zones={TIME_ZONES}
            t={timePos(time as number)}
            tick={gzTime !== null ? { t: timePos(gzTime), label: "gzip default" } : null}
          />
          <Gauge
            title="Saved"
            valueText={`${row.saved_percent.toFixed(1)}%`}
            meaning="How much smaller the file gets."
            zones={SAVED_ZONES}
            t={linPos(row.saved_percent, 0, 100)}
            tick={gz ? { t: linPos(gz.saved_percent, 0, 100), label: "gzip default" } : null}
          />
          <Gauge
            title="Decompress speed"
            valueText={`${formatSpeed(row.decompress_mbps)} MB/s`}
            meaning="How fast a user's device unpacks it."
            zones={DECOMP_ZONES}
            t={logPos(row.decompress_mbps, g.decompress_mbps.min, g.decompress_mbps.max)}
            tick={
              gz
                ? { t: logPos(gz.decompress_mbps, g.decompress_mbps.min, g.decompress_mbps.max), label: "gzip default" }
                : null
            }
          />
          <Gauge
            title="Entropy of your file"
            valueText={entropyBits === null ? "—" : `${entropyBits.toFixed(2)} bits/B`}
            meaning="How patterned the file is before any compressor touches it."
            zones={ENTROPY_ZONES}
            t={entropyBits === null ? null : linPos(entropyBits, 0, 8)}
            muted={entropyBits === null}
          />
          <section
            className="grid min-h-0 min-w-0 items-center gap-1 rounded-xl border border-line bg-card min-[900px]:col-span-2 min-[900px]:grid-cols-[1fr_1.1fr]"
            aria-label="Weissman gauge"
          >
            <Gauge
              bare
              title="Weissman score"
              valueText={cell?.value != null ? cell.value.toFixed(2) : "undefined"}
              meaning="Ratio × speed against the baseline; above 1 beats it."
              note={cell && cell.status !== "ok" ? cell.note : undefined}
              zones={WEISSMAN_ZONES}
              t={cell?.value != null && cell.value > 0 ? logPos(cell.value, WEISSMAN_LO, WEISSMAN_HI) : null}
              tick={{ t: logPos(1, WEISSMAN_LO, WEISSMAN_HI), label: baseLabel }}
              muted={weissmanMuted}
            />
            <div className="min-h-0 self-stretch overflow-auto p-2 pr-3">
              <WeissmanPicker
                unit={unit}
                baseline={baseline}
                onUnit={onUnit}
                onBaseline={onBaseline}
                note={changeNote}
              />
            </div>
          </section>
        </div>
      )}
      <p className="shrink-0 text-xs text-muted [@media(max-height:760px)]:hidden">
        <span className="mr-1 inline-block h-2 w-2 rounded-full align-middle" style={{ background: GOOD }} />
        Right is always the good end, except entropy, where right means already dense. The black tick marks where
        gzip level 6 lands.
      </p>
    </div>
  );
}
