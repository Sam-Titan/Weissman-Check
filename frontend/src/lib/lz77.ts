// A deliberately simple LZ77-style match finder for the replay card.
// It is an explanation of how LZ-style compressors spot repeats, not any real compressor's code.

export interface Match {
  pos: number; // where the repeat starts
  length: number; // how many characters repeat
  distance: number; // how far back the earlier copy starts
}

export const WINDOW = 4096; // how far back we look for an earlier copy
export const MIN_MATCH = 4; // repeats shorter than this are not worth a back-reference
export const MAX_MATCH = 258;
export const REF_COST = 3; // rough cost of a back-reference in this simplified model
const MAX_CHAIN = 64; // earlier candidates to try per position

/** Greedy scan: at each position take the longest earlier match, otherwise move on one character. */
export function findMatches(text: string): Match[] {
  const matches: Match[] = [];
  const heads = new Map<string, number[]>(); // 3-character prefix -> earlier positions
  const remember = (i: number) => {
    if (i + 3 > text.length) return;
    const key = text.slice(i, i + 3);
    const list = heads.get(key);
    if (list) list.push(i);
    else heads.set(key, [i]);
  };

  let i = 0;
  while (i < text.length) {
    let best: Match | null = null;
    const candidates = i + 3 <= text.length ? heads.get(text.slice(i, i + 3)) : undefined;
    if (candidates) {
      let tried = 0;
      for (let c = candidates.length - 1; c >= 0 && tried < MAX_CHAIN; c--, tried++) {
        const start = candidates[c];
        const distance = i - start;
        if (distance > WINDOW) break; // candidates are in order, so everything further is older
        let length = 0;
        while (length < MAX_MATCH && i + length < text.length && text[start + length] === text[i + length]) {
          length++;
        }
        if (length >= MIN_MATCH && (!best || length > best.length)) best = { pos: i, length, distance };
      }
    }
    const step = best ? best.length : 1;
    if (best) matches.push(best);
    for (let k = 0; k < step; k++) remember(i + k);
    i += step;
  }
  return matches;
}

export function bytesSaved(matches: Match[], upTo: number): number {
  let saved = 0;
  for (const m of matches) {
    if (m.pos + m.length <= upTo) saved += m.length - REF_COST;
  }
  return saved;
}
