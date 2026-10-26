export type Setting = "fast" | "strong" | "baseline";

export interface JobResult {
  compressor: string;
  setting: Setting;
  level_label: string;
  status: "ok" | "failed";
  original_bytes: number;
  compressed_bytes: number;
  compress_s: number;
  decompress_s: number;
  repeats: number;
  is_baseline: boolean;
  error?: string | null;
}
