export interface Entropy {
  bitsPerByte: number;
  verdict: string;
}

// Thresholds are the learner's choice (spec.md > Frontend: Dropbox and File Chip).
export function verdictFor(bits: number): string {
  if (bits < 6.0) return "Highly repetitive, worth compressing";
  if (bits <= 7.5) return "Some gain";
  return "Already dense, little to gain";
}

/** Shannon entropy in bits per byte over the whole file (a 256-entry count of byte values). */
export function entropyOf(bytes: Uint8Array): Entropy {
  const counts = new Array<number>(256).fill(0);
  for (let i = 0; i < bytes.length; i++) counts[bytes[i]]++;
  let bits = 0;
  for (const c of counts) {
    if (c === 0) continue;
    const p = c / bytes.length;
    bits -= p * Math.log2(p);
  }
  return { bitsPerByte: bits, verdict: verdictFor(bits) };
}
