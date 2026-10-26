import { useRef, useState } from "react";

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
      className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
        over ? "border-accent bg-accent/5" : "border-line bg-card"
      }`}
      aria-label="Dropbox"
    >
      <p className="text-lg font-bold">Drop a text-like file here</p>
      <p className="text-sm text-muted">
        JSON, CSV, logs, code, HTML.{" "}
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="font-bold text-accent underline"
        >
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
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <span className="text-sm font-bold text-muted">Try a sample:</span>
        {SAMPLES.map((s) => (
          <button
            key={s.file}
            type="button"
            aria-pressed={activeSample === s.file}
            onClick={() => onSample(s.file)}
            className={`rounded-xl border-2 border-accent px-3 py-1 text-sm font-bold ${
              activeSample === s.file ? "bg-accent text-white" : "bg-card text-accent"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      {message && (
        <p role="alert" className="mt-3 text-sm font-bold text-red-600">
          {message}
        </p>
      )}
    </div>
  );
}
