import { useRef, useState } from "react";
import { createRun, downloadRun, fetchSample, openEvents } from "./api";
import { COMPRESSORS, type CompressorName } from "./lib/compressors";
import { entropyOf, type Entropy } from "./lib/entropy";
import { validateFile } from "./lib/validate";
import CompressorCarousel from "./components/CompressorCarousel";
import Dropbox from "./components/Dropbox";
import FileChip from "./components/FileChip";
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
  const [file, setFile] = useState<{ file: File; entropy: Entropy; text: string } | null>(null);
  const [fileMessage, setFileMessage] = useState("");
  const [included, setIncluded] = useState<CompressorName[]>([...COMPRESSORS]);
  const [runId, setRunId] = useState(0);
  const [unit, setUnit] = useState<Unit>("ms");
  const [baseline, setBaseline] = useState<Baseline>("gzip6");
  const [changeNote, setChangeNote] = useState<string | null>(null);
  const [view, setView] = useState<"table" | "chart">("table");
  const [serverRun, setServerRun] = useState<string | null>(null);
  const [downloadMessage, setDownloadMessage] = useState("");
  const closeRef = useRef<() => void>(() => {});

  // Check the file, then show its chip and a plain preview. Nothing runs until Run is clicked.
  async function loadFile(f: File, sample: string | null) {
    if (status === "running") return;
    const check = await validateFile(f);
    if (!check.ok) {
      setFileMessage(check.message);
      return;
    }
    setFileMessage("");
    setMessage("");
    setActive(sample);
    setRunId(0);
    setFile({
      file: f,
      entropy: entropyOf(new Uint8Array(await f.arrayBuffer())),
      text: await f.slice(0, REPLAY_BYTES).text(),
    });
  }

  async function loadSample(name: string) {
    try {
      await loadFile(await fetchSample(name), name);
    } catch (err) {
      setFileMessage(err instanceof Error ? err.message : "Could not load that sample.");
    }
  }

  async function run() {
    if (!file || status === "running" || included.length === 0) return;
    setResults([]);
    setAnalysis(null);
    setMessage("");
    setChangeNote(null);
    setDownloadMessage("");
    setStatus("running");
    setRunId(1);
    try {
      const id = await createRun(file.file, included);
      setServerRun(id);
      closeRef.current = openEvents(id, {
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

  // Back to the dropbox: clears the file and results, keeps the compressor selection.
  function tryAnother() {
    closeRef.current();
    setFile(null);
    setActive(null);
    setResults([]);
    setAnalysis(null);
    setMessage("");
    setFileMessage("");
    setChangeNote(null);
    setDownloadMessage("");
    setServerRun(null);
    setRunId(0);
    setStatus("idle");
  }

  const rows = results.filter((r) => !r.is_baseline);
  const latest = rows.length ? rows[rows.length - 1] : null;
  const busy = status === "running";
  const picking = status === "idle" || status === "error";

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
          {status === "done" && rows.length > 0 && (
            <>
              <span className="font-mono text-xs text-muted">
                {file?.file.name} · Original: {formatSize(rows[0].original_bytes)}
              </span>
              <button
                onClick={tryAnother}
                className="ml-auto rounded-xl border-2 border-accent bg-card px-3 py-1 text-sm font-bold text-accent"
              >
                Try another file
              </button>
            </>
          )}
        </header>
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="min-w-0 space-y-3">
            {message && <p className="text-red-600">{message}</p>}
            {picking && (
              <>
                <Dropbox
                  onFile={(f) => loadFile(f, null)}
                  onSample={loadSample}
                  activeSample={active}
                  message={fileMessage}
                />
                {file && (
                  <FileChip name={file.file.name} bytes={file.file.size} entropy={file.entropy} />
                )}
                <CompressorCarousel
                  included={included}
                  onToggle={(c) =>
                    setIncluded((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]))
                  }
                  disabled={false}
                />
                <div className="flex items-center gap-3">
                  <button
                    onClick={run}
                    disabled={!file || included.length === 0}
                    className="rounded-xl bg-accent px-6 py-2 text-lg font-black text-white disabled:opacity-40"
                  >
                    Run
                  </button>
                  {included.length === 0 ? (
                    <span className="text-sm font-bold text-red-600">Pick at least one compressor.</span>
                  ) : (
                    !file && <span className="text-sm text-muted">Add a file to run.</span>
                  )}
                </div>
              </>
            )}
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
                {downloadMessage && <p className="text-sm font-bold text-red-600">{downloadMessage}</p>}
                {view === "table" ? (
                  <ResultsTable
                    rows={rows}
                    mode={mode}
                    analysis={analysis}
                    cells={cells}
                    ranked={ranked}
                    onDownload={async (r) => {
                      setDownloadMessage("");
                      try {
                        if (serverRun) await downloadRun(serverRun, r.compressor, r.setting);
                      } catch (err) {
                        setDownloadMessage(err instanceof Error ? err.message : "Download failed.");
                      }
                    }}
                  />
                ) : (
                  <DeliveryChart analysis={analysis} mode={mode} />
                )}
              </>
            )}
          </div>
          <div className="min-w-0 space-y-3">
            <ReplayCard
              text={file?.text ?? null}
              fileBytes={file?.file.size ?? 0}
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
