import * as ToggleGroup from "@radix-ui/react-toggle-group";
import { formatTime } from "../lib/format";
import type { Analysis, Mode, RowSummary } from "../types";

const UNIVERSAL = new Set(["gzip", "brotli"]);
const name = (r: RowSummary) => `${r.compressor} (${r.setting})`;
const MODE_NOTE: Record<Mode, string> = { static: "static assets", dynamic: "dynamic responses" };

/** Fixed height, four fixed lines: the banner never changes size between modes or samples. */
export default function RecommendationBanner({
  analysis,
  mode,
  onMode,
}: {
  analysis: Analysis;
  mode: Mode;
  onMode: (m: Mode) => void;
}) {
  const { winner, browser_best, near_tie, runner_up, tie_reason } = analysis.recommendation[mode];
  let note = "";
  if (winner && near_tie && runner_up) {
    note = `Effectively tied with ${name(runner_up)}: ${
      tie_reason === "browser"
        ? `${winner.compressor} works in browsers and ${runner_up.compressor} doesn't.`
        : UNIVERSAL.has(winner.compressor)
          ? `${winner.compressor} is smaller and works in every browser.`
          : `${winner.compressor} is smaller.`
    }`;
  } else if (winner && browser_best && browser_best.compressor !== winner.compressor) {
    note = `Fastest overall. Best for browsers: ${name(browser_best)}.`;
  }
  return (
    <section className="flex h-36 items-start justify-between gap-4 overflow-hidden rounded-xl bg-deep p-5 text-white">
      <div className="min-w-0 space-y-1">
        <p className="truncate text-3xl font-black leading-tight tracking-tight">
          {winner ? `Ship ${name(winner)}` : "Every compressor failed"}
        </p>
        <p className="h-5 truncate text-sm font-bold text-white/90" title={note}>
          {note}
        </p>
        <p className="h-6 truncate text-lg font-bold">
          {winner
            ? `For ${MODE_NOTE[mode]}: reaches a user in ${formatTime(winner.delivery_s)}, ${winner.percent_saved.toFixed(0)}% smaller`
            : ""}
        </p>
        <p className="h-4 text-xs font-bold text-white/70">
          Fastest means shortest time to reach a user at {analysis.network_mbps} Mbit/s.
        </p>
      </div>
      <ToggleGroup.Root
        type="single"
        value={mode}
        onValueChange={(v) => v && onMode(v as Mode)}
        className="flex shrink-0 overflow-hidden rounded-lg border border-white/60"
      >
        {(["static", "dynamic"] as const).map((m) => (
          <ToggleGroup.Item
            key={m}
            value={m}
            className="px-4 py-1.5 font-black capitalize data-[state=on]:bg-white data-[state=on]:text-deep"
          >
            {m}
          </ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>
    </section>
  );
}
