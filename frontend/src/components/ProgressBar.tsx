import { motion } from "motion/react";
import { COLORS, COMPRESSORS, type CompressorName } from "../lib/compressors";
import type { JobResult } from "../types";

const SETTINGS = ["fast", "strong"] as const;

/** 12 segments in a fixed order (compressor × setting); each fills in its colour when its job finishes. */
export default function ProgressBar({
  included,
  results,
  running,
}: {
  included: string[];
  results: JobResult[];
  running: boolean;
}) {
  const byKey = new Map(results.filter((r) => !r.is_baseline).map((r) => [`${r.compressor}/${r.setting}`, r]));
  const nextPending = COMPRESSORS.flatMap((c) => SETTINGS.map((s) => ({ c, s }))).find(
    ({ c, s }) => included.includes(c) && !byKey.has(`${c}/${s}`),
  );
  return (
    <div role="progressbar" aria-valuemin={0} aria-valuemax={12} aria-valuenow={byKey.size}>
      <div className="flex gap-1">
        {COMPRESSORS.flatMap((c) =>
          SETTINGS.map((s) => {
            const key = `${c}/${s}`;
            const result = byKey.get(key);
            const skipped = !included.includes(c);
            const current = running && nextPending?.c === c && nextPending.s === s;
            return (
              <div
                key={key}
                title={`${c} (${s})${skipped ? " – skipped" : result?.status === "failed" ? " – failed" : ""}`}
                data-state={skipped ? "skipped" : result ? (result.status === "failed" ? "failed" : "done") : current ? "running" : "pending"}
                className={`relative h-8 flex-1 overflow-hidden rounded-md ${
                  skipped ? "border border-dashed border-line bg-card" : "bg-line"
                } ${current ? "animate-pulse" : ""}`}
              >
                {result && (
                  <motion.div
                    className="absolute inset-0 origin-left"
                    style={{ background: result.status === "failed" ? "repeating-linear-gradient(45deg,#e3e7ed,#e3e7ed 4px,#fff 4px,#fff 8px)" : COLORS[c as CompressorName] }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.25 }}
                  />
                )}
              </div>
            );
          }),
        )}
      </div>
      <div className="mt-1 flex gap-1 text-[11px] font-bold text-muted">
        {COMPRESSORS.map((c) => (
          <span key={c} className="flex-[2] text-center">
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}
