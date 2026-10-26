export function formatTime(seconds: number): string {
  if (seconds < 0.001) return `${Math.round(seconds * 1e6)} µs`;
  if (seconds < 0.01) return `${(seconds * 1000).toFixed(2)} ms`;
  if (seconds < 1) return `${(seconds * 1000).toFixed(0)} ms`;
  return `${seconds.toFixed(2)} s`;
}

/** MB/s with one decimal; a value that rounds to zero shows as "<0.1" instead of 0.0. */
export function formatSpeed(mbps: number): string {
  return mbps > 0 && mbps < 0.05 ? "<0.1" : mbps.toFixed(1);
}

export function formatSize(bytes: number): string {
  return bytes >= 1_000_000 ? `${(bytes / 1_000_000).toFixed(2)} MB` : `${(bytes / 1000).toFixed(1)} KB`;
}
