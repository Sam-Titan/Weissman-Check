import { motion, useReducedMotion } from "motion/react";
import { COLORS, COMPRESSORS } from "../lib/compressors";
import Window from "./Window";

// Fixed, slightly ragged line lengths so the block looks like text.
const LINES = [0.96, 0.82, 1, 0.9, 0.7, 0.98, 0.86, 1, 0.78, 0.92, 0.66, 0.94];

/** The hero: a block of text squeezing into a smaller block, forever, plus a Start button. */
export default function Hero({ onStart }: { onStart: () => void }) {
  const still = useReducedMotion();
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center gap-7 px-6 py-8 text-center">
      <Window title="squeeze.exe" color="pink" className="w-full max-w-md" label="Squeeze animation">
        <div aria-hidden className="flex flex-col gap-1.5 bg-mint p-6">
          {LINES.map((w, i) => (
            <motion.div
              key={i}
              className="h-3 rounded-sm border-2 border-ink"
              style={{ background: COLORS[COMPRESSORS[i % COMPRESSORS.length]], width: `${w * 100}%` }}
              animate={still ? undefined : { scaleX: [1, 1, 0.32, 0.32, 1] }}
              transition={{ duration: 4.5, times: [0, 0.15, 0.55, 0.85, 1], ease: "easeInOut", repeat: Infinity }}
              initial={{ originX: 0 }}
            />
          ))}
        </div>
      </Window>
      <div className="space-y-3">
        <h1 className="font-pixel text-5xl leading-tight text-ink [text-shadow:3px_3px_0_#fff]">
          Weissman Check
        </h1>
        <p className="text-xl font-bold">…and the numbers that actually matter.</p>
        <p className="mx-auto max-w-lg text-lg">
          Drop in a text-like file. Six real compressors race on it, and you find out which one to ship and why.
        </p>
      </div>
      <button onClick={onStart} className="btn btn-primary px-10 py-3 text-xl">
        Start
      </button>
    </main>
  );
}
