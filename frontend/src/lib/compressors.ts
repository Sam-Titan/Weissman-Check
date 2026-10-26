export const COMPRESSORS = ["gzip", "brotli", "zstd", "lz4", "xz", "bzip2"] as const;
export type CompressorName = (typeof COMPRESSORS)[number];

export const COLORS: Record<CompressorName, string> = {
  gzip: "var(--color-gzip)",
  brotli: "var(--color-brotli)",
  zstd: "var(--color-zstd)",
  lz4: "var(--color-lz4)",
  xz: "var(--color-xz)",
  bzip2: "var(--color-bzip2)",
};

export const BROWSER_SUPPORTED: ReadonlySet<string> = new Set(["gzip", "brotli", "zstd"]);
