import { useRef, useState } from "react";
import { createRun, fetchSample, openEvents } from "./api";
import { COMPRESSORS } from "./lib/compressors";
import { formatSize } from "./lib/format";
import MetricsBox from "./components/MetricsBox";
import ReplayCard, { REPLAY_BYTES } from "./components/ReplayCard";
import ProgressBar from "./components/ProgressBar";
import RecommendationBanner from "./components/RecommendationBanner";
import DeliveryChart from "./components/DeliveryChart";
import ResultsTable from "./components/ResultsTable";
import { TooltipProvider } from "./components/Tooltip";
import WeissmanControl, { BASELINE_LABELS, UNIT_LABELS } from "./components/WeissmanControl";
import type { Analysis, Baseline, JobResult, Mode, ScoreCell, Unit } from "./types";

const SAMPLES = [
  { label: "JSON API response", file: "api-response.json" },
  { label: "Server log", file: "server.log" },
  { label: "Minified JS", file: "app.min.js" },
];

type Status = "idle" | "running" | "done" | "error";

/** What the current Weissman table says: who tops it and how many cells are flagged or undefined. */
function summarise(cells: Record<string, ScoreCell>) {
  const scored = Object.entries(cells).filter(([, c]) => c.value !== null);
  scored.sort((a, b) => (b[1].value as number) - (a[1].value as number));
  const values = Object.values(cells);
  return {
    top: scored[0] ? { key: scored[0][0].replace("/", " (") + ")", value: scored[0][1].value as number } : null,
    flagged: values.filter((c) => c.status === "flagged").length,
    undef: values.filter((c) => c.status === "undefined").length,
  };
}

function describeChange(what: string, before: Record<string, ScoreCell>, after: Record<string, ScoreCell>) {
  const b = summarise(before);
  const a = summarise(after);
  const top = a.top
    ? `${a.top.key} now tops the table at ${a.top.value.toFixed(2)}${
        b.top && b.top.key !== a.top.key ? `, replacing ${b.top.key}` : ""
      }.`
    : "No row has a score.";
  return `You switched ${what}. ${top} ${a.flagged} flagged ⚠ (was ${b.flagged}), ${a.undef} undefined (was ${b.undef}).`;
}

export default function App() {
  const [status, setStatus] = useState<Status>("idle");
  const [results, setResults] = useState<JobResult[]>([]);
  const [message, setMessage] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [mode, setMode] = useState<Mode>("static");
  const [active, setActive] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ text: string; bytes: number } | null>(null);
  const [runId, setRunId] = useState(0);
  const [unit, setUnit] = useState<Unit>("ms");
  const [baseline, setBaseline] = useState<Baseline>("gzip6");
  const [changeNote, setChangeNote] = useState<string | null>(null);
  const [view, setView] = useState<"table" | "chart">("table");
  const closeRef = useRef<() => void>(() => {});

  async function runSample(name: string) {
    if (status === "running") return;
    setActive(name);
    setResults([]);
    setAnalysis(null);
    setMessage("");
    setChangeNote(null);
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
    if (analysis)
      setChangeNote(
        describeChange(`the time unit to ${UNIT_LABELS[u]}`, cells, analysis.weissman[u][baseline]),
      );
    setUnit(u);
  };
  const pickBaseline = (b: Baseline) => {
    if (analysis)
      setChangeNote(
        describeChange(`the baseline to ${BASELINE_LABELS[b]}`, cells, analysis.weissman[unit][b]),
      );
    setBaseline(b);
  };

  return (
    <TooltipProvider>
      <main className="mx-auto max-w-[1400px] space-y-3 p-4">
        <header className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="text-2xl font-black">Weissman Check</h1>
          <span className="text-sm font-bold text-muted">Try a sample:</span>
          <div className="flex flex-wrap gap-2">
            {SAMPLES.map((s) => (
              <button
                key={s.file}
                disabled={busy}
                aria-pressed={active === s.file}
                onClick={() => runSample(s.file)}
                className={`rounded-xl border-2 border-accent px-3 py-1 text-sm font-bold disabled:opacity-40 ${
                  active === s.file ? "bg-accent text-white" : "bg-card text-accent"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          {status === "done" && rows.length > 0 && (
            <span className="ml-auto font-mono text-xs text-muted">
              Original: {formatSize(rows[0].original_bytes)}
            </span>
          )}
        </header>
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="min-w-0 space-y-3">
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
                <div role="tablist" className="flex gap-1">
                  {(
                    [
                      ["table", "Results table"],
                      ["chart", "Delivery time chart"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      role="tab"
                      aria-selected={view === id}
                      onClick={() => setView(id)}
                      className={`rounded-lg px-3 py-1 text-sm font-bold ${
                        view === id ? "bg-deep text-white" : "bg-card text-muted"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {view === "table" ? (
                  <ResultsTable rows={rows} mode={mode} analysis={analysis} cells={cells} ranked={ranked} />
                ) : (
                  <DeliveryChart analysis={analysis} mode={mode} />
                )}
              </>
            )}
          </div>
          <div className="min-w-0 space-y-3">
            <ReplayCard
              text={preview?.text ?? null}
              fileBytes={preview?.bytes ?? 0}
              runId={runId}
              tall={status === "done"}
            />
            {status === "done" && analysis ? (
              <WeissmanControl
                unit={unit}
                baseline={baseline}
                onUnit={pickUnit}
                onBaseline={pickBaseline}
                note={changeNote}
              />
            ) : (
              <MetricsBox latest={busy ? latest : null} />
            )}
          </div>
        </div>
      </main>
    </TooltipProvider>
  );
}
