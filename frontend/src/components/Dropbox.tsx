import { useRef, useState } from "react";
import Window from "./Window";

export const SAMPLES = [
  { label: "JSON API response", file: "api-response.json" },
  { label: "Server log", file: "server.log" },
  { label: "Minified JS", file: "app.min.js" },
];

export default function Dropbox({
  onFile,
  onSample,
  activeSample,
  message,
}: {
  onFile: (f: File) => void;
  onSample: (name: string) => void;
  activeSample: string | null;
  message: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <Window title="Add a file" color="orange" label="Dropbox" bodyClassName="p-0">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const f = e.dataTransfer.files[0];
          if (f) onFile(f);
        }}
        className={`m-3 rounded-md border-2 border-dashed border-ink p-5 text-center transition-colors ${
          over ? "bg-sun" : "bg-mint"
        }`}
      >
        <p className="font-pixel text-lg font-bold">Drop a file here</p>
        <p className="text-sm">
          Text, logs, code, or anything already compressed (up to 25 MB).{" "}
          <button type="button" onClick={() => input.current?.click()} className="font-bold text-accent underline">
            Or choose a file
          </button>
        </p>
        <input
          ref={input}
          type="file"
          data-testid="file-input"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <span className="text-sm font-bold">Try a sample:</span>
          {SAMPLES.map((s) => (
            <button
              key={s.file}
              type="button"
              aria-pressed={activeSample === s.file}
              onClick={() => onSample(s.file)}
              className="btn px-3 py-1 text-sm"
            >
              {s.label}
            </button>
          ))}
        </div>
        {message && (
          <p role="alert" className="mt-3 rounded border-2 border-ink bg-white px-2 py-1 text-sm font-bold text-red-600">
            {message}
          </p>
        )}
      </div>
    </Window>
  );
}
