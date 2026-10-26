export const METRIC_TIPS = {
  size: "How many bytes the compressed file takes. Smaller means less to send over the network.",
  bpb: "Bits per byte: how many bits the compressed file spends on each byte of the original. Compare it with the entropy figure on your file: compressors that use repeated strings can beat it.",
  saved: "How much smaller the compressed file is than the original, as a percentage.",
  compress: "How fast the compressor works, in megabytes of original file per second. Higher is faster.",
  decompress: "How fast a user's device can unpack it, in MB/s of original file. Higher is faster.",
  weissman:
    "A single score from compression ratio and compress time, measured against a baseline. Convenient, but it can mislead: see the control below the table.",
  time: "Time to get the file to a user at the assumed network speed: transfer plus unpacking, plus compressing in dynamic mode.",
} as const;

export type MetricKey = keyof typeof METRIC_TIPS;

export const NARRATOR_INTRO =
  "Hi, I'm your narrator. Drop in a text-like file, or pick a sample, and I'll run six real compressors on it and show you which one to ship. Here you'll also see how LZ-style compressors spot repeated text.";

export const ENTROPY_TIP =
  "Entropy counts how evenly the byte values 0-255 are spread, in bits per byte (8 means no pattern at all). It only counts how often each byte appears, so compressors that exploit repeated strings often beat it. Compare it with the bits per byte the compressors actually reach in the results.";

export interface Narration {
  title: string;
  lz: boolean; // true: the replay shows this family's repeat-spotting; false: words only
  body: string;
}

export const NARRATIONS: Record<string, Narration> = {
  gzip: {
    title: "gzip (DEFLATE)",
    lz: true,
    body: "Looks back over the last 32 KB for text it has already seen and replaces the repeat with a short (distance, length) pointer, then gives common bytes shorter bit codes (Huffman). The replay shows the repeat-spotting half. It works everywhere, which is why most people default to it.",
  },
  brotli: {
    title: "brotli",
    lz: true,
    body: "The same repeat-spotting idea, but with a much longer memory and a built-in dictionary of words common on the web (HTML, CSS, JavaScript). Its strongest setting is slow to compress, so it shines on files you compress once and serve many times. Every modern browser can unpack it.",
  },
  zstd: {
    title: "zstd",
    lz: true,
    body: "Finds repeats like gzip does, but codes the leftovers with a newer, faster method (finite-state entropy), and has a huge range of levels. Unpacking stays very fast even at strong settings. Browser support is newer: Chromium and Firefox yes, Safari has lagged.",
  },
  lz4: {
    title: "lz4",
    lz: true,
    body: "Pure repeat-spotting with almost no extra coding: pointers and raw bytes, nothing more. That makes it extremely fast both ways but gives a larger file. Its strong setting searches harder for repeats. Browsers can't unpack it, so it's for logs, caches and internal traffic.",
  },
  xz: {
    title: "xz (LZMA)",
    lz: false,
    body: "Also spots repeats, but over a huge window and with a statistical model that predicts each bit from the context before it. That usually gives some of the smallest files, at the cost of slow compression. The simplified replay doesn't apply: its modelling isn't something this card can show.",
  },
  bzip2: {
    title: "bzip2",
    lz: false,
    body: "Doesn't look for repeats at all. It reshuffles each block of text (the Burrows-Wheeler transform) so similar letters end up side by side, then squeezes those runs. Often small on text, but slow both ways. The replay doesn't apply to it.",
  },
};
