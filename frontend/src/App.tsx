import { useRef, useState } from "react";
import { createRun, fetchSample, openEvents } from "./api";
import { BROWSER_SUPPORTED, COLORS, COMPRESSORS, type CompressorName } from "./lib/compressors";
import { formatSize, formatTime } from "./lib/format";
import MetricsBox from "./components/MetricsBox";
import ReplayCard, { REPLAY_BYTES } from "./components/ReplayCard";
import ProgressBar from "./components/ProgressBar";
import RecommendationBanner from "./components/RecommendationBanner";
import Help, { TooltipProvider } from "./components/Tooltip";
import { METRIC_TIPS } from "./content/narration";
import WeissmanControl, { BASELINE_LABELS, UNIT_LABELS } from "./components/WeissmanControl";
import type { Analysis, Baseline, JobResult, Mode, ScoreCell, Unit } from "./types";

const SAMPLES = [
  { label: "JSON API response", file: "api-response.json" },
  { label: "Server log", file: "server.log" },
  { label: "Minified JS", file: "app.min.js" },
];

type Status = "idle" | "running" | "done" | "error";

export default function App() {
  const [status, setStatus] = useState<Status>("idle");
  const [results, setResults] = useState<JobResult[]>([]);
  const [message, setMessage] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [mode, setMode] = useState<Mode>("static");
  const [active, setActive] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ text: string; bytes: number } | null>(null);
  const [runId, setRunId] = useState(0);
  const [unit, setUnit] = useState<Unit>("s");
  const [baseline, setBaseline] = useState<Baseline>("gzip6");
  const [changed, setChanged] = useState("Scores are measured in seconds against gzip level 6.");
  const closeRef = useRef<() => void>(() => {});

  async function runSample(name: string) {
    if (status === "running") return;
    setActive(name);
    setResults([]);
    setAnalysis(null);
    setMessage("");
    setStatus("running");
    try {
      const file = await fetchSample(name);
      setPreview({ text: await file.slice(0, REPLAY_BYTES).text(), bytes: file.size });
      setRunId((n) => n + 1);
      const runId = await createRun(file, [...COMPRESSORS]);
      closeRef.current = openEvents(runId, {
        result: (r) => setResults((prev) => [...prev, r]),
        done: (a) => {
          setAnalysis(a);
          setStatus("done");
        },
        lost: () => {
          setMessage("Lost connection to the benchmark. Try again.");
          setStatus("error");
        },
      });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  const rows = results.filter((r) => !r.is_baseline);
  const included = [...COMPRESSORS];
  const latest = rows.length ? rows[rows.length - 1] : null;
  const busy = status === "running";

  const cells = analysis?.weissman[unit][baseline] ?? {};
  // Rank by score among rows that have a number (a comparison of precomputed values, no maths).
  const ranked = Object.entries(cells)
    .filter(([, c]) => c.value !== null)
    .sort((a, b) => (b[1].value as number) - (a[1].value as number))
    .map(([k]) => k);
  const pickUnit = (u: Unit) => {
    setUnit(u);
    setChanged(`You switched the time unit to ${UNIT_LABELS[u]}; the baseline is still ${BASELINE_LABELS[baseline]}.`);
  };
  const pickBaseline = (b: Baseline) => {
    setBaseline(b);
    setChanged(`You switched the baseline to ${BASELINE_LABELS[b]}; the time unit is still ${UNIT_LABELS[unit]}.`);
  };

  const head = (label: string, tip: keyof typeof METRIC_TIPS) => (
    <th>
      {label}
      <Help text={METRIC_TIPS[tip]} />
    </th>
  );

  return (
    <TooltipProvider>
      <main className="mx-auto max-w-6xl space-y-6 p-8">
        <h1 className="text-3xl font-bold">Weissman Check</h1>
        <div className="grid items-start gap-6 lg:grid-cols-[3fr_2fr]">
          <div className="min-w-0 space-y-6">
            <div className="flex flex-wrap gap-3">
              {SAMPLES.map((s) => (
                <button
                  key={s.file}
                  disabled={busy}
                  aria-pressed={active === s.file}
                  onClick={() => runSample(s.file)}
                  className={`rounded-xl border-2 border-accent px-4 py-2 font-bold disabled:opacity-40 ${
                    active === s.file ? "bg-accent text-white" : "bg-card text-accent"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {message && <p className="text-red-600">{message}</p>}
            {busy && (
              <div className="space-y-2 rounded-xl border border-line bg-card p-5">
                <p className="text-sm font-bold text-muted">
                  Running real compressors… {rows.length} of 12 done
                </p>
                <ProgressBar included={included} results={results} running={busy} />
              </div>
            )}
            {status === "done" && analysis && (
              <>
                <RecommendationBanner analysis={analysis} mode={mode} onMode={setMode} />
                <p className="font-mono text-sm text-muted">
                  Original: {formatSize(rows[0].original_bytes)}
                </p>
                <div className="overflow-x-auto rounded-xl border border-line bg-card">
                  <table className="w-full text-left">
                    <thead className="text-sm text-muted">
                      <tr className="[&>th]:pr-4">
                        <th className="p-3">Compressor</th>
                        {head("Size (KB)", "size")}
                        {head("% saved", "saved")}
                        {head("Compress MB/s", "compress")}
                        {head("Decompress MB/s", "decompress")}
                        {head(`Time to user (${mode})`, "time")}
                        {head("Weissman", "weissman")}
                        <th>Browser</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono">
                      {rows.map((r) => (
                        <Row
                          key={`${r.compressor}-${r.setting}`}
                          r={r}
                          mode={mode}
                          analysis={analysis}
                          score={cells[`${r.compressor}/${r.setting}`]}
                          rank={ranked.indexOf(`${r.compressor}/${r.setting}`) + 1}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
                <WeissmanControl
                  unit={unit}
                  baseline={baseline}
                  onUnit={pickUnit}
                  onBaseline={pickBaseline}
                  changed={changed}
                  cells={cells}
                />
              </>
            )}
          </div>
          <div className="min-w-0 space-y-6">
            <ReplayCard
              text={preview?.text ?? null}
              fileBytes={preview?.bytes ?? 0}
              runId={runId}
              tall={status === "done"}
            />
            {status !== "done" && <MetricsBox latest={busy ? latest : null} />}
          </div>
        </div>
      </main>
    </TooltipProvider>
  );
}

function Row({
  r,
  mode,
  analysis,
  score,
  rank,
}: {
  r: JobResult;
  mode: Mode;
  analysis: Analysis | null;
  score: ScoreCell | undefined;
  rank: number;
}) {
  const color = COLORS[r.compressor as CompressorName];
  const key = `${r.compressor}/${r.setting}`;
  const mbps = (s: number) => (r.original_bytes / 1e6 / s).toFixed(1);
  const rec = analysis?.recommendation[mode];
  const isWinner = rec?.winner && `${rec.winner.compressor}/${rec.winner.setting}` === key;
  const isRunnerUp =
    rec?.near_tie && rec.runner_up && `${rec.runner_up.compressor}/${rec.runner_up.setting}` === key;
  const times = analysis?.rows[key];
  const time = times ? (mode === "static" ? times.static_s : times.dynamic_s) : null;
  return (
    <tr
      className="border-t border-line"
      style={isWinner || isRunnerUp ? { background: `color-mix(in srgb, ${color} ${isWinner ? 16 : 9}%, white)` } : undefined}
    >
      <td className="p-3" style={{ borderLeft: `6px solid ${color}` }}>
        {r.compressor} ({r.setting})
        {isWinner && <span className="ml-2 text-xs font-bold text-deep">{rec?.near_tie ? "PICK (TIE)" : "PICK"}</span>}
        {isRunnerUp && <span className="ml-2 text-xs font-bold text-muted">TIED</span>}
      </td>
      {r.status === "failed" ? (
        <td colSpan={6}>failed</td>
      ) : (
        <>
          <td>{(r.compressed_bytes / 1000).toFixed(1)}</td>
          <td>{((1 - r.compressed_bytes / r.original_bytes) * 100).toFixed(1)}%</td>
          <td>{mbps(r.compress_s)}</td>
          <td>{mbps(r.decompress_s)}</td>
          <td className="font-semibold">{time === null ? "…" : formatTime(time)}</td>
          <td className="font-semibold" data-testid="weissman-cell">
            <ScoreView score={score} rank={rank} />
          </td>
          <td>
            <BrowserCell compressor={r.compressor} />
          </td>
        </>
      )}
    </tr>
  );
}

function BrowserCell({ compressor }: { compressor: string }) {
  if (compressor === "zstd")
    return (
      <span title="Supported in Chromium and Firefox; Safari support has lagged.">✓*</span>
    );
  if (BROWSER_SUPPORTED.has(compressor)) return <span>✓</span>;
  return <span title="Not a browser Content-Encoding.">—</span>;
}

function ScoreView({ score, rank }: { score: ScoreCell | undefined; rank: number }) {
  if (!score) return <span>…</span>;
  if (score.status === "undefined")
    return (
      <span title={score.note} className="text-muted">
        undefined
      </span>
    );
  return (
    <span title={score.note || undefined}>
      {score.value?.toFixed(2)}
      {score.status === "flagged" && <span className="ml-1 text-brotli">⚠</span>}
      {rank > 0 && <span className="ml-1 text-xs text-muted">#{rank}</span>}
    </span>
  );
}
