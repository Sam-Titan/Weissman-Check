import { BROWSER_SUPPORTED, COLORS, type CompressorName } from "../lib/compressors";
import { formatTime } from "../lib/format";
import { METRIC_TIPS } from "../content/narration";
import type { Analysis, JobResult, Mode, ScoreCell } from "../types";
import Help, { Tip } from "./Tooltip";

const ZSTD_NOTE = "Supported in Chromium and Firefox; Safari support has lagged.";

// Fixed widths keep the numeric columns from running together.
const COLS = [150, 64, 58, 66, 74, 70, 84, 66];

export default function ResultsTable({
  rows,
  mode,
  analysis,
  cells,
  ranked,
}: {
  rows: JobResult[];
  mode: Mode;
  analysis: Analysis;
  cells: Record<string, ScoreCell>;
  ranked: string[];
}) {
  const rec = analysis.recommendation[mode];
  const head = (label: string, tip?: keyof typeof METRIC_TIPS, left = false) => (
    <th className={`py-1.5 font-bold ${left ? "pl-3 text-left" : "text-right"}`}>
      {label}
      {tip && <Help text={METRIC_TIPS[tip]} />}
    </th>
  );
  return (
    <div className="rounded-xl border border-line bg-card">
      <table className="w-full table-fixed text-sm tabular-nums">
        <colgroup>
          {COLS.map((w, i) => (
            <col key={i} style={{ width: w }} />
          ))}
        </colgroup>
        <thead className="text-xs text-muted">
          <tr>
            {head("Compressor", undefined, true)}
            {head("Size KB", "size")}
            {head("Saved", "saved")}
            {head("Comp MB/s", "compress")}
            {head("Decomp MB/s", "decompress")}
            {head("To user", "time")}
            {head("Weissman", "weissman")}
            <th className="py-1.5 pr-3 text-right font-bold">Browser</th>
          </tr>
        </thead>
        <tbody className="font-mono">
          {rows.map((r) => {
            const key = `${r.compressor}/${r.setting}`;
            const color = COLORS[r.compressor as CompressorName];
            const isWinner = rec.winner && `${rec.winner.compressor}/${rec.winner.setting}` === key;
            const isTied =
              rec.near_tie && rec.runner_up && `${rec.runner_up.compressor}/${rec.runner_up.setting}` === key;
            const times = analysis.rows[key];
            const time = times ? (mode === "static" ? times.static_s : times.dynamic_s) : null;
            return (
              <tr
                key={key}
                className="h-7 border-t border-line"
                style={
                  isWinner || isTied
                    ? { background: `color-mix(in srgb, ${color} ${isWinner ? 16 : 9}%, white)` }
                    : undefined
                }
              >
                <td
                  className="truncate whitespace-nowrap pl-3"
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
                  <td colSpan={7} className="text-right">
                    failed
                  </td>
                ) : (
                  <>
                    <td className="text-right">{(r.compressed_bytes / 1000).toFixed(1)}</td>
                    <td className="text-right">
                      {((1 - r.compressed_bytes / r.original_bytes) * 100).toFixed(1)}%
                    </td>
                    <td className="text-right">{(r.original_bytes / 1e6 / r.compress_s).toFixed(1)}</td>
                    <td className="text-right">{(r.original_bytes / 1e6 / r.decompress_s).toFixed(1)}</td>
                    <td className="text-right font-semibold">{time === null ? "…" : formatTime(time)}</td>
                    <td className="text-right" data-testid="weissman-cell">
                      <ScoreView score={cells[key]} rank={ranked.indexOf(key) + 1} />
                    </td>
                    <td className="pr-3 text-right">
                      <BrowserCell compressor={r.compressor} />
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
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
