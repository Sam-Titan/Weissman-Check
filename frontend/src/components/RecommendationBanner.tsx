import * as ToggleGroup from "@radix-ui/react-toggle-group";
import { formatTime } from "../lib/format";
import type { Analysis, Mode, RowSummary } from "../types";

const UNIVERSAL = new Set(["gzip", "brotli"]);
const name = (r: RowSummary) => `${r.compressor} (${r.setting})`;
const MODE_NOTE: Record<Mode, string> = { static: "static assets", dynamic: "dynamic responses" };

function browserLine(r: RowSummary): string {
  if (UNIVERSAL.has(r.compressor)) return `${r.compressor} works in every browser.`;
  if (r.compressor === "zstd") return "zstd works in Chromium and Firefox; Safari support has lagged.";
  return `${r.compressor} is not a browser Content-Encoding: fine for caches and backups, not for browsers.`;
}

/** Fixed height, four lines that are always filled: the banner never changes size or has a gap. */
export default function RecommendationBanner({
  analysis,
  mode,
  onMode,
}: {
  analysis: Analysis;
  mode: Mode;
  onMode: (m: Mode) => void;
}) {
  const { winner, browser_best, near_tie, runner_up, tie_reason, too_small_to_matter } =
    analysis.recommendation[mode];
  let head = "Every compressor failed";
  let note = "";
  let line = "";
  if (winner && too_small_to_matter) {
    head = "Too small to matter";
    note = `Every option reaches a user in ~${formatTime(winner.delivery_s)}.`;
    line = "Any browser-supported compressor is fine; gzip is the safe default.";
  } else if (winner) {
    head = `Ship ${name(winner)}`;
    if (near_tie && runner_up) {
      note = `Effectively tied with ${name(runner_up)}: ${
        tie_reason === "browser"
          ? `${winner.compressor} works in browsers and ${runner_up.compressor} doesn't.`
          : UNIVERSAL.has(winner.compressor)
            ? `${winner.compressor} is smaller and works in every browser.`
            : `${winner.compressor} is smaller.`
      }`;
    } else if (browser_best && browser_best.compressor !== winner.compressor) {
      note = `Fastest overall. Best for browsers: ${name(browser_best)}.`;
    } else {
      note = browserLine(winner);
    }
    line = `For ${MODE_NOTE[mode]}: reaches a user in ${formatTime(winner.delivery_s)}, ${winner.percent_saved.toFixed(0)}% smaller`;
  }
  return (
    <section className="flex h-32 shrink-0 items-center justify-between gap-4 overflow-hidden rounded-xl bg-deep px-5 text-white [@media(max-height:760px)]:h-24">
      <div className="min-w-0 space-y-0.5">
        <p className="truncate text-3xl font-black leading-tight tracking-tight [@media(max-height:760px)]:text-2xl">{head}</p>
        <p className="truncate text-sm font-bold text-white/90" title={note}>
          {note}
        </p>
        <p className="truncate text-lg font-bold" title={line}>
          {line}
        </p>
        <p className="text-xs font-bold text-white/70 [@media(max-height:760px)]:hidden">
          Fastest means shortest time to reach a user at {analysis.network_mbps} Mbit/s.
        </p>
      </div>
      <ToggleGroup.Root
        type="single"
        value={mode}
        onValueChange={(v) => v && onMode(v as Mode)}
        className="flex shrink-0 self-start overflow-hidden rounded-lg border border-white/60 mt-4"
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
