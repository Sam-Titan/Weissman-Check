import { ENTROPY_TIP } from "../content/narration";
import type { Entropy } from "../lib/entropy";
import { formatSize } from "../lib/format";
import Help from "./Tooltip";
import Window from "./Window";

const BIG_FILE_BYTES = 8 * 1024 * 1024;

export default function FileChip({ name, bytes, entropy }: { name: string; bytes: number; entropy: Entropy }) {
  return (
    <Window title="File" color="blue" label="File" bodyClassName="px-4 py-2">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-mono font-bold">{name}</span>
        <span className="font-mono text-sm text-muted">{formatSize(bytes)}</span>
        <span className="text-sm font-bold" data-testid="entropy">
          {entropy.verdict}
          <span className="ml-1 font-mono font-normal text-muted">({entropy.bitsPerByte.toFixed(2)} bits/byte)</span>
          <Help text={ENTROPY_TIP} />
        </span>
      </div>
      {bytes > BIG_FILE_BYTES && <p className="mt-1 text-xs text-muted">This can take a few minutes on big files.</p>}
    </Window>
  );
}
