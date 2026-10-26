import { ENTROPY_TIP } from "../content/narration";
import type { Entropy } from "../lib/entropy";
import { formatSize } from "../lib/format";
import Help from "./Tooltip";

const BIG_FILE_BYTES = 8 * 1024 * 1024;

export default function FileChip({ name, bytes, entropy }: { name: string; bytes: number; entropy: Entropy }) {
  return (
    <div className="rounded-xl border border-line bg-card px-4 py-3" aria-label="File">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-mono font-bold">{name}</span>
        <span className="font-mono text-sm text-muted">{formatSize(bytes)}</span>
        <span className="text-sm font-bold" data-testid="entropy">
          {entropy.verdict}
          <span className="ml-1 font-mono font-normal text-muted">
            ({entropy.bitsPerByte.toFixed(2)} bits/byte)
          </span>
          <Help text={ENTROPY_TIP} />
        </span>
      </div>
      {bytes > BIG_FILE_BYTES && (
        <p className="mt-1 text-xs text-muted">This can take a few minutes on big files.</p>
      )}
    </div>
  );
}
