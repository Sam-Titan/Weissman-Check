import type { Zone } from "../components/Gauge";

export const GOOD = "#2fd47f";
export const MID = "#ffd93d";
export const BAD = "#ff5a5f";

/** Position of v on a log scale between lo and hi, 0 to 1. */
export function logPos(v: number, lo: number, hi: number): number {
  if (!(v > 0) || !(lo > 0) || hi <= lo) return 0.5;
  return (Math.log(v) - Math.log(lo)) / (Math.log(hi) - Math.log(lo));
}

export const linPos = (v: number, lo: number, hi: number) => (hi > lo ? (v - lo) / (hi - lo) : 0.5);

// Left is always the bad end and right the good end, except entropy where right means "already dense".
export const TIME_ZONES: Zone[] = [
  { from: 0, to: 1 / 3, color: BAD, label: "slow" },
  { from: 1 / 3, to: 2 / 3, color: MID, label: "ok" },
  { from: 2 / 3, to: 1, color: GOOD, label: "fast" },
];

export const SAVED_ZONES: Zone[] = [
  { from: 0, to: 0.5, color: BAD, label: "little" },
  { from: 0.5, to: 0.8, color: MID, label: "good" },
  { from: 0.8, to: 1, color: GOOD, label: "great" },
];

export const DECOMP_ZONES: Zone[] = [
  { from: 0, to: 1 / 3, color: BAD, label: "slow" },
  { from: 1 / 3, to: 2 / 3, color: MID, label: "ok" },
  { from: 2 / 3, to: 1, color: GOOD, label: "fast" },
];

// Entropy runs 0 to 8 bits per byte; thresholds are the spec's: 6.0 and 7.5.
export const ENTROPY_ZONES: Zone[] = [
  { from: 0, to: 6 / 8, color: GOOD, label: "worth it" },
  { from: 6 / 8, to: 7.5 / 8, color: MID, label: "some gain" },
  { from: 7.5 / 8, to: 1, color: BAD, label: "dense" },
];

// Weissman on a log scale from 0.25 to 4, so 1.0 sits in the middle.
export const WEISSMAN_LO = 0.25;
export const WEISSMAN_HI = 4;
const half = (v: number) => logPos(v, WEISSMAN_LO, WEISSMAN_HI);
export const WEISSMAN_ZONES: Zone[] = [
  { from: 0, to: half(0.95), color: BAD, label: "worse" },
  { from: half(0.95), to: half(1.05), color: MID, label: "≈" },
  { from: half(1.05), to: 1, color: GOOD, label: "better" },
];
