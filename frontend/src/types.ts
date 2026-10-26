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

export type Mode = "static" | "dynamic";

export interface RowSummary {
  compressor: string;
  setting: Setting;
  level_label: string;
  compressed_bytes: number;
  percent_saved: number;
  decompress_mbps: number;
  delivery_s: number;
}

export interface ModeRecommendation {
  winner: RowSummary | null;
  browser_best: RowSummary | null;
  near_tie: boolean;
  runner_up: RowSummary | null;
  tie_reason: "browser" | "smaller" | null;
}

export interface RowTimes {
  static_s: number;
  dynamic_s: number;
}

export interface Analysis {
  network_mbps: number;
  original_bytes: number;
  rows: Record<string, RowTimes>;
  recommendation: Record<Mode, ModeRecommendation>;
}
