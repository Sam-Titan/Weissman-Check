import { useRef, useState } from "react";
import { createRun, fetchSample, openEvents } from "./api";
import { BROWSER_SUPPORTED, COLORS, COMPRESSORS, type CompressorName } from "./lib/compressors";
import type { JobResult } from "./types";

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
  const closeRef = useRef<() => void>(() => {});

  async function runSample(name: string) {
    if (status === "running") return;
    setResults([]);
    setMessage("");
    setStatus("running");
    try {
      const file = await fetchSample(name);
      const runId = await createRun(file, [...COMPRESSORS]);
      closeRef.current = openEvents(runId, {
        result: (r) => setResults((prev) => [...prev, r]),
        done: () => setStatus("done"),
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
            onClick={() => runSample(s.file)}
            className="rounded-xl bg-accent px-4 py-2 font-bold text-white disabled:opacity-40"
          >
            {s.label}
          </button>
        ))}
      </div>
      {message && <p className="text-red-600">{message}</p>}
      {status === "running" && <p className="text-muted">Running… {rows.length} results in</p>}
      {rows.length > 0 && (
        <table className="w-full rounded-xl border border-line bg-card text-left">
          <thead className="text-sm text-muted">
            <tr>
              <th className="p-3">Compressor</th>
              <th>Size</th>
              <th>% saved</th>
              <th>Compress MB/s</th>
              <th>Decompress MB/s</th>
              <th>Browser</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {rows.map((r) => (
              <Row key={`${r.compressor}-${r.setting}`} r={r} />
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

function Row({ r }: { r: JobResult }) {
  const color = COLORS[r.compressor as CompressorName];
  const mbps = (s: number) => (r.original_bytes / 1e6 / s).toFixed(1);
  return (
    <tr className="border-t border-line">
      <td className="p-3" style={{ borderLeft: `6px solid ${color}` }}>
        {r.compressor} ({r.setting})
      </td>
      {r.status === "failed" ? (
        <td colSpan={4}>failed</td>
      ) : (
        <>
          <td>{r.compressed_bytes.toLocaleString()}</td>
          <td>{((1 - r.compressed_bytes / r.original_bytes) * 100).toFixed(1)}%</td>
          <td>{mbps(r.compress_s)}</td>
          <td>{mbps(r.decompress_s)}</td>
          <td>{BROWSER_SUPPORTED.has(r.compressor) ? "✓" : ""}</td>
        </>
      )}
    </tr>
  );
}
