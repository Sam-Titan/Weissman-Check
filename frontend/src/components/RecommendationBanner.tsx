import * as ToggleGroup from "@radix-ui/react-toggle-group";
import type { Analysis, Mode, RowSummary } from "../types";

const MODE_NOTE: Record<Mode, string> = {
  static: "static assets (compressed once)",
  dynamic: "dynamic responses (compressed on every request)",
};

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
  const { winner, browser_best } = analysis.recommendation[mode];
  return (
    <section className="rounded-xl bg-accent p-5 text-white">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          {winner ? (
            <>
              <p className="text-xl font-bold">
                Ship {name(winner)} for {MODE_NOTE[mode]}: {winner.percent_saved.toFixed(0)}%
                smaller, decompresses at {winner.decompress_mbps.toFixed(0)} MB/s
              </p>
              {browser_best && browser_best.compressor !== winner.compressor ? (
                <p>
                  Fastest to deliver overall: {name(winner)}. Best for browsers:{" "}
                  {name(browser_best)}.
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-xl font-bold">Every compressor failed on this file.</p>
          )}
          <p className="text-sm opacity-80">
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
              className="px-3 py-1 font-bold capitalize data-[state=on]:bg-white data-[state=on]:text-accent"
            >
              {m}
            </ToggleGroup.Item>
          ))}
        </ToggleGroup.Root>
      </div>
    </section>
  );
}
