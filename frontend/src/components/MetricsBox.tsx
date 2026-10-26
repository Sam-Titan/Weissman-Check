import { METRIC_TIPS, type MetricKey } from "../content/narration";
import type { JobResult } from "../types";
import { formatSpeed } from "../lib/format";
import Help from "./Tooltip";
import Window from "./Window";

const ROWS: { key: MetricKey; label: string; value: (r: JobResult) => string }[] = [
  { key: "size", label: "Compressed size", value: (r) => `${(r.compressed_bytes / 1000).toFixed(1)} KB` },
  {
    key: "saved",
    label: "Saved",
    value: (r) => `${((1 - r.compressed_bytes / r.original_bytes) * 100).toFixed(1)}%`,
  },
  {
    key: "compress",
    label: "Compress speed",
    value: (r) => `${formatSpeed(r.original_bytes / 1e6 / r.compress_s)} MB/s`,
  },
  {
    key: "decompress",
    label: "Decompress speed",
    value: (r) => `${formatSpeed(r.original_bytes / 1e6 / r.decompress_s)} MB/s`,
  },
];

/** Before a run: metric names greyed out. During a run: values from the job that just finished. */
export default function MetricsBox({ latest }: { latest: JobResult | null }) {
  const live = latest && latest.status === "ok" ? latest : null;
  return (
    <Window
      title={latest ? `Latest: ${latest.compressor} (${latest.setting})` : "Metrics"}
      color="green"
      label="Metrics"
      className="shrink-0"
      bodyClassName="p-4"
    >
      <dl className="space-y-2">
        {ROWS.map((row) => (
          <div key={row.key} className="flex items-baseline justify-between">
            <dt className={live ? "text-ink" : "text-muted/70"}>
              {row.label}
              <Help text={METRIC_TIPS[row.key]} />
            </dt>
            <dd className="font-mono font-semibold">{live ? row.value(live) : "—"}</dd>
          </div>
        ))}
      </dl>
      {latest?.status === "failed" && <p className="mt-3 text-sm text-red-600">That one failed; the rest continue.</p>}
    </Window>
  );
}
