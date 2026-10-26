export function formatTime(seconds: number): string {
  return seconds < 1 ? `${(seconds * 1000).toFixed(seconds < 0.01 ? 1 : 0)} ms` : `${seconds.toFixed(2)} s`;
}

export function formatSize(bytes: number): string {
  return bytes >= 1_000_000 ? `${(bytes / 1_000_000).toFixed(2)} MB` : `${(bytes / 1000).toFixed(1)} KB`;
}
