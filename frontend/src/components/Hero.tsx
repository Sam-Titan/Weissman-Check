import { motion, useReducedMotion } from "motion/react";
import { COLORS, COMPRESSORS } from "../lib/compressors";

// Fixed, slightly ragged line lengths so the block looks like text.
const LINES = [0.96, 0.82, 1, 0.9, 0.7, 0.98, 0.86, 1, 0.78, 0.92, 0.66, 0.94];

/** The hero: a block of text squeezing into a smaller block, forever, plus a Start button. */
export default function Hero({ onStart }: { onStart: () => void }) {
  const still = useReducedMotion();
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-8 px-6 text-center">
      <div
        aria-hidden
        className="flex w-full max-w-md flex-col gap-1.5 rounded-xl border border-line bg-card p-6"
      >
        {LINES.map((w, i) => (
          <motion.div
            key={i}
            className="h-2.5 rounded-full"
            style={{ background: COLORS[COMPRESSORS[i % COMPRESSORS.length]], width: `${w * 100}%` }}
            animate={still ? undefined : { scaleX: [1, 1, 0.32, 0.32, 1] }}
            transition={{ duration: 4.5, times: [0, 0.15, 0.55, 0.85, 1], ease: "easeInOut", repeat: Infinity }}
            initial={{ originX: 0 }}
          />
        ))}
      </div>
      <div className="space-y-3">
        <h1 className="text-5xl font-black tracking-tight text-deep">Weissman Check</h1>
        <p className="text-xl font-bold text-muted">…and the numbers that actually matter.</p>
        <p className="mx-auto max-w-xl text-lg">
          Drop in a text-like file. Six real compressors race on it, and you find out which one to ship and why.
        </p>
      </div>
      <button
        onClick={onStart}
        className="rounded-xl bg-accent px-10 py-3 text-xl font-black text-white"
      >
        Start
      </button>
    </main>
  );
}
