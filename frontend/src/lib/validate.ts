export const MAX_BYTES = 25 * 1024 * 1024;
export const SNIFF_BYTES = 8 * 1024;

export type Validation = { ok: true } | { ok: false; message: string };

/** Content-only hint used for the preview: a NUL byte or invalid UTF-8 means the bytes are not text. */
export function looksBinary(head: Uint8Array): boolean {
  if (head.includes(0)) return true;
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
  return { ok: true };
}
