import { COLORS, type CompressorName } from "../lib/compressors";
import { formatTime } from "../lib/format";
import type { Analysis, Mode } from "../types";

const STOPS = 3; // the axis stops at this many times the winner's time; longer bars are clipped

/** Stacked bars: compress / transfer / decompress for each run at the assumed network speed. */
export default function DeliveryChart({ analysis, mode }: { analysis: Analysis; mode: Mode }) {
  const rec = analysis.recommendation[mode];
  const total = (k: string) =>
    mode === "static" ? analysis.rows[k].static_s : analysis.rows[k].dynamic_s;
  const keys = Object.keys(analysis.rows).sort((a, b) => total(a) - total(b));
  const winnerKey = !rec.too_small_to_matter && rec.winner && `${rec.winner.compressor}/${rec.winner.setting}`;
  const tiedKey = !rec.too_small_to_matter && rec.near_tie && rec.runner_up && `${rec.runner_up.compressor}/${rec.runner_up.setting}`;
  const axis = (keys.length ? total(keys[0]) : 1) * STOPS;
  const pct = (s: number) => (s / axis) * 100;

  return (
    <div
      className="max-h-[calc(100vh-17rem)] overflow-auto rounded-xl border border-line bg-card p-4 max-[899px]:max-h-none"
      aria-label="Delivery time chart"
    >
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs font-bold text-muted">
        <span>Time to reach a user at {analysis.network_mbps} Mbit/s</span>
        <Legend shade={1} label={mode === "static" ? "compress (free in static)" : "compress"} dim={mode === "static"} />
        <Legend shade={0.6} label="transfer" />
        <Legend shade={0.3} label="decompress" />
      </div>
      <div className="space-y-1.5">
        {keys.map((k) => {
          const [compressor, setting] = k.split("/");
          const t = analysis.rows[k];
          const color = COLORS[compressor as CompressorName];
          const parts = [
            { key: "compress", s: mode === "dynamic" ? t.compress_s : 0, shade: 1 },
            { key: "transfer", s: t.transfer_s, shade: 0.6 },
            { key: "decompress", s: t.decompress_s, shade: 0.3 },
          ];
          const clipped = total(k) > axis;
          const isWinner = k === winnerKey;
          const isTied = k === tiedKey;
          return (
            <div key={k} className="flex items-center gap-3" data-testid="chart-row" data-key={k}>
              <span
                className={`w-32 shrink-0 whitespace-nowrap text-right font-mono text-xs ${
                  isWinner ? "font-bold text-ink" : "text-muted"
                }`}
              >
                {isWinner ? "★ " : isTied ? "≈ " : ""}
                {compressor} ({setting})
              </span>
              <div
                className={`relative flex h-5 flex-1 overflow-hidden rounded-md bg-page ${
                  isWinner ? "ring-2 ring-deep" : isTied ? "ring-1 ring-deep/50" : ""
                }`}
              >
                {parts.map((p) => (
                  <div
                    key={p.key}
                    title={`${p.key}: ${formatTime(p.s)}`}
                    data-part={p.key}
                    style={{
                      width: `${Math.min(pct(p.s), 100)}%`,
                      background: `color-mix(in srgb, ${color} ${p.shade * 100}%, white)`,
                    }}
                  />
                ))}
                {clipped && (
                  <span className="absolute inset-y-0 right-0 flex items-center bg-gradient-to-l from-white to-transparent pl-6 pr-1 text-[10px] font-bold text-ink">
                    ▶
                  </span>
                )}
              </div>
              <span className="w-16 shrink-0 text-right font-mono text-xs font-semibold">
                {formatTime(total(k))}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted">
        Sorted by total time. The axis ends at {STOPS}× the winner's time; ▶ marks bars that run past it.
      </p>
    </div>
  );
}

function Legend({ shade, label, dim = false }: { shade: number; label: string; dim?: boolean }) {
  return (
    <span className={`flex items-center gap-1 ${dim ? "opacity-50" : ""}`}>
      <span
        className="inline-block h-3 w-3 rounded-sm"
        style={{ background: `color-mix(in srgb, #5f6c7b ${shade * 100}%, white)` }}
      />
      {label}
    </span>
  );
}
