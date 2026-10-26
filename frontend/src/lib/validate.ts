export const MAX_BYTES = 25 * 1024 * 1024;
const SNIFF_BYTES = 8 * 1024;

const BINARY_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "bmp", "ico", "tif", "tiff", "heic", "avif",
  "mp4", "mov", "avi", "mkv", "webm", "mp3", "wav", "flac", "ogg", "m4a",
  "zip", "gz", "br", "zst", "xz", "bz2", "7z", "rar", "tar", "pdf", "exe", "bin", "dll", "so", "wasm",
]);

export const BINARY_MESSAGE =
  "Weissman Check handles text-like files for now (JSON, CSV, logs, code, HTML). Images and video are coming later.";

export type Validation = { ok: true } | { ok: false; message: string };

function looksBinary(file: File, head: Uint8Array): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (BINARY_EXTENSIONS.has(ext)) return true;
  if (/^(image|video|audio)\//.test(file.type)) return true;
  if (head.includes(0)) return true; // a NUL byte never appears in text
  try {
    // stream: true tolerates a multi-byte character cut off at the end of the sample
    new TextDecoder("utf-8", { fatal: true }).decode(head, { stream: true });
  } catch {
    return true;
  }
  return false;
}

export async function validateFile(file: File): Promise<Validation> {
  if (file.size === 0) return { ok: false, message: "This file is empty, nothing to squeeze." };
  if (file.size > MAX_BYTES)
    return {
      ok: false,
      message: `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB; the limit is 25 MB.`,
    };
  const head = new Uint8Array(await file.slice(0, SNIFF_BYTES).arrayBuffer());
  if (looksBinary(file, head)) return { ok: false, message: BINARY_MESSAGE };
  return { ok: true };
}
