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
  too_small_to_matter: boolean;
}

export interface RowTimes {
  compress_s: number;
  transfer_s: number;
  decompress_s: number;
  saved_percent: number;
  decompress_mbps: number;
  static_s: number;
  dynamic_s: number;
}

export interface Range {
  min: number;
  max: number;
}

export interface GaugeScales {
  time_static: Range;
  time_dynamic: Range;
  decompress_mbps: Range;
  gzip_default: {
    saved_percent: number;
    decompress_mbps: number;
    static_s: number;
    dynamic_s: number;
  } | null;
}

export interface Analysis {
  gauges: GaugeScales;
  network_mbps: number;
  original_bytes: number;
  rows: Record<string, RowTimes>;
  weissman: Record<Unit, Record<Baseline, Record<string, ScoreCell>>>;
  recommendation: Record<Mode, ModeRecommendation>;
}

export type Unit = "s" | "ms" | "us";
export type Baseline = "gzip6" | "gzip1" | "zstd3";

export interface ScoreCell {
  status: "ok" | "flagged" | "undefined";
  value: number | null;
  note: string;
}
