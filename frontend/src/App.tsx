import { useRef, useState } from "react";
import { createRun, fetchSample, openEvents } from "./api";
import { BROWSER_SUPPORTED, COLORS, COMPRESSORS, type CompressorName } from "./lib/compressors";
import { formatSize, formatTime } from "./lib/format";
import RecommendationBanner from "./components/RecommendationBanner";
import type { Analysis, JobResult, Mode } from "./types";

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

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-8">
      <h1 className="text-3xl font-bold">Weissman Check</h1>
      <div className="flex gap-3">
        {SAMPLES.map((s) => (
          <button
            key={s.file}
            disabled={status === "running"}
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
      {status === "running" && <p className="text-muted">Running… {rows.length} results in</p>}
      {analysis && <RecommendationBanner analysis={analysis} mode={mode} onMode={setMode} />}
      {rows.length > 0 && (
        <p className="font-mono text-sm text-muted">Original: {formatSize(rows[0].original_bytes)}</p>
      )}
      {rows.length > 0 && (
        <table className="w-full rounded-xl border border-line bg-card text-left">
          <thead className="text-sm text-muted">
            <tr className="[&>th]:pr-4">
              <th className="p-3">Compressor</th>
              <th>Size (KB)</th>
              <th>% saved</th>
              <th>Compress MB/s</th>
              <th>Decompress MB/s</th>
              <th>Time to user ({mode})</th>
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
              />
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

function Row({ r, mode, analysis }: { r: JobResult; mode: Mode; analysis: Analysis | null }) {
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
        <td colSpan={5}>failed</td>
      ) : (
        <>
          <td>{(r.compressed_bytes / 1000).toFixed(1)}</td>
          <td>{((1 - r.compressed_bytes / r.original_bytes) * 100).toFixed(1)}%</td>
          <td>{mbps(r.compress_s)}</td>
          <td>{mbps(r.decompress_s)}</td>
          <td className="font-semibold">{time === null ? "…" : formatTime(time)}</td>
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
