import { BROWSER_SUPPORTED, COLORS, type CompressorName } from "../lib/compressors";
import { formatSpeed, formatTime } from "../lib/format";
import { METRIC_TIPS } from "../content/narration";
import type { Analysis, JobResult, Mode, ScoreCell } from "../types";
import Help, { Tip } from "./Tooltip";

const ZSTD_NOTE = "Supported in Chromium and Firefox; Safari support has lagged.";

// Fixed widths keep the numeric columns from running together.
const COLS = [178, 56, 50, 56, 72, 88, 70, 84, 70, 44];

export default function ResultsTable({
  rows,
  mode,
  analysis,
  cells,
  ranked,
  onDownload,
  selected,
  onSelect,
}: {
  rows: JobResult[];
  mode: Mode;
  analysis: Analysis;
  cells: Record<string, ScoreCell>;
  ranked: string[];
  onDownload: (r: JobResult) => void;
  selected: string;
  onSelect: (key: string) => void;
}) {
  const rec = analysis.recommendation[mode];
  // Fastest to the user first for the current mode (the pick leads when two are tied); failed runs last.
  const total = (r: JobResult) => {
    const t = analysis.rows[`${r.compressor}/${r.setting}`];
    return t ? (mode === "static" ? t.static_s : t.dynamic_s) : Infinity;
  };
  const isPick = (r: JobResult) =>
    !rec.too_small_to_matter &&
    rec.winner?.compressor === r.compressor && rec.winner.setting === r.setting;
  const ordered = [...rows].sort((a, b) =>
    isPick(a) ? -1 : isPick(b) ? 1 : total(a) - total(b),
  );
  const head = (label: string, tip?: keyof typeof METRIC_TIPS, left = false) => (
    <th className={`whitespace-nowrap py-1.5 font-bold ${left ? "pl-3 text-left" : "text-right"}`}>
      {label}
      {tip && <Help text={METRIC_TIPS[tip]} />}
    </th>
  );
  return (
    <div className="flex h-full flex-col rounded-xl border border-line bg-card max-[899px]:h-auto">
      <div className="min-h-0 flex-1 overflow-auto">
      <table className="w-full min-w-[820px] table-fixed text-sm tabular-nums">
        <colgroup>
          {COLS.map((w, i) => (
            <col key={i} style={{ width: w }} />
          ))}
        </colgroup>
        <thead className="sticky top-0 z-[1] bg-card text-xs text-muted shadow-[0_1px_0_var(--color-line)]">
          <tr>
            {head("Compressor", undefined, true)}
            {head("Size KB", "size")}
            {head("Saved", "saved")}
            {head("Bits/B", "bpb")}
            {head("Comp MB/s", "compress")}
            {head("Decomp MB/s", "decompress")}
            {head("To user", "time")}
            {head("Weissman", "weissman")}
            <th className="py-1.5 text-right font-bold">Browser</th>
            <th className="py-1.5 pr-3 text-right font-bold">Get</th>
          </tr>
        </thead>
        <tbody className="font-mono">
          {ordered.map((r) => {
            const key = `${r.compressor}/${r.setting}`;
            const color = COLORS[r.compressor as CompressorName];
            const isWinner =
              !rec.too_small_to_matter && rec.winner && `${rec.winner.compressor}/${rec.winner.setting}` === key;
            const isTied =
              !rec.too_small_to_matter && rec.near_tie && rec.runner_up && `${rec.runner_up.compressor}/${rec.runner_up.setting}` === key;
            const times = analysis.rows[key];
            const time = times ? (mode === "static" ? times.static_s : times.dynamic_s) : null;
            return (
              <tr
                key={key}
                onClick={() => onSelect(key)}
                aria-selected={selected === key}
                className={`h-7 cursor-pointer border-t border-line ${selected === key ? "outline outline-2 -outline-offset-2 outline-ink" : ""}`}
                style={
                  isWinner || isTied
                    ? { background: `color-mix(in srgb, ${color} ${isWinner ? 16 : 9}%, white)` }
                    : undefined
                }
              >
                <td
                  className="whitespace-nowrap pl-3"
                  style={{ borderLeft: `6px solid ${color}` }}
                >
                  {isWinner && (
                    <Tip text={rec.near_tie ? "Recommended pick (effectively tied)" : "Recommended pick"}>
                      <span className="mr-1 font-bold text-deep">★</span>
                    </Tip>
                  )}
                  {isTied && (
                    <Tip text="Effectively tied with the pick">
                      <span className="mr-1 font-bold text-muted">≈</span>
                    </Tip>
                  )}
                  {r.compressor} ({r.setting})
                </td>
                {r.status === "failed" ? (
                  <td colSpan={9} className="pr-3 text-right">
                    <Tip text={r.error ?? "This run failed."}>
                      <span className="rounded-full bg-line px-2 py-0.5 font-sans text-xs font-bold text-red-600">
                        failed
                      </span>
                    </Tip>
                  </td>
                ) : (
                  <>
                    <td className="text-right">{(r.compressed_bytes / 1000).toFixed(1)}</td>
                    <td className="text-right">
                      {((1 - r.compressed_bytes / r.original_bytes) * 100).toFixed(1)}%
                    </td>
                    <td className="text-right">
                      {((r.compressed_bytes * 8) / r.original_bytes).toFixed(2)}
                    </td>
                    <td className="text-right">{formatSpeed(r.original_bytes / 1e6 / r.compress_s)}</td>
                    <td className="text-right">{formatSpeed(r.original_bytes / 1e6 / r.decompress_s)}</td>
                    <td className="text-right font-semibold">{time === null ? "…" : formatTime(time)}</td>
                    <td className="text-right" data-testid="weissman-cell">
                      <ScoreView score={cells[key]} rank={ranked.indexOf(key) + 1} />
                    </td>
                    <td className="text-right">
                      <BrowserCell compressor={r.compressor} />
                    </td>
                    <td className="pr-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDownload(r);
                        }}
                        aria-label={`Download ${r.compressor} (${r.setting})`}
                        className="rounded px-1 font-sans font-bold text-accent hover:bg-accent/10"
                      >
                        ⬇
                      </button>
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
      <p className="border-t border-line px-3 py-1.5 text-xs text-muted">
        ★ pick · ≈ effectively tied · ✓* zstd: {ZSTD_NOTE}
      </p>
    </div>
  );
}

function ScoreView({ score, rank }: { score: ScoreCell | undefined; rank: number }) {
  if (!score) return <span>…</span>;
  if (score.status === "undefined")
    return (
      <Tip text={score.note}>
        <span className="rounded-full bg-line px-2 py-0.5 font-sans text-xs font-bold text-muted">
          undefined
        </span>
      </Tip>
    );
  const number = (
    <span>
      {score.value?.toFixed(2)}
      {score.status === "flagged" && <span className="ml-0.5 text-brotli">⚠</span>}
    </span>
  );
  return (
    <>
      {score.note ? <Tip text={score.note}>{number}</Tip> : number}
      {rank > 0 && <span className="ml-1 text-xs text-muted">#{rank}</span>}
    </>
  );
}

function BrowserCell({ compressor }: { compressor: string }) {
  if (compressor === "zstd")
    return (
      <Tip text={ZSTD_NOTE}>
        <span>✓*</span>
      </Tip>
    );
  if (BROWSER_SUPPORTED.has(compressor)) return <span>✓</span>;
  return (
    <Tip text="Not a browser Content-Encoding.">
      <span>—</span>
    </Tip>
  );
}
