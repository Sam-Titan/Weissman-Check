import * as ToggleGroup from "@radix-ui/react-toggle-group";
import { formatTime } from "../lib/format";
import type { Analysis, Mode, RowSummary } from "../types";

const MODE_NOTE: Record<Mode, string> = {
  static: "static assets",
  dynamic: "dynamic responses",
};

const UNIVERSAL = new Set(["gzip", "brotli"]);
const name = (r: RowSummary) => `${r.compressor} (${r.setting})`;

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
  return (
    <section className="rounded-xl bg-deep p-6 text-white">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          {winner ? (
            <>
              {near_tie && runner_up ? (
                <p className="text-2xl font-black leading-snug tracking-tight">
                  Ship {name(winner)}: effectively tied with {name(runner_up)} –{" "}
                  {tie_reason === "browser"
                    ? `${winner.compressor} works in browsers and ${runner_up.compressor} doesn't.`
                    : UNIVERSAL.has(winner.compressor)
                      ? `${winner.compressor} is smaller and works in every browser.`
                      : `${winner.compressor} is smaller.`}
                </p>
              ) : (
                <p className="text-2xl font-black leading-snug tracking-tight">
                  Ship {name(winner)} for {MODE_NOTE[mode]}: reaches a user in{" "}
                  {formatTime(winner.delivery_s)}, {winner.percent_saved.toFixed(0)}% smaller.
                </p>
              )}
              {near_tie && (
                <p className="text-lg font-bold text-white/90">
                  For {MODE_NOTE[mode]}, it reaches a user in {formatTime(winner.delivery_s)},{" "}
                  {winner.percent_saved.toFixed(0)}% smaller.
                </p>
              )}
              {browser_best && browser_best.compressor !== winner.compressor ? (
                <p className="text-lg font-bold text-white/90">
                  Fastest to deliver overall: {name(winner)}. Best for browsers:{" "}
                  {name(browser_best)}.
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-2xl font-black">Every compressor failed on this file.</p>
          )}
          <p className="text-sm font-bold text-white/70">
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
      </div>
    </section>
  );
}
