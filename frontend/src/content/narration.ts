export const METRIC_TIPS = {
  size: "How many bytes the compressed file takes. Smaller means less to send over the network.",
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
