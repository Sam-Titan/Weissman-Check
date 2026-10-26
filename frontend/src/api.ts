import type { Analysis, JobResult } from "./types";

const STALL_MS = 8000;

export async function fetchSample(name: string): Promise<File> {
  const res = await fetch(`/api/samples/${name}`);
  if (!res.ok) throw new Error("Could not load that sample.");
  return new File([await res.blob()], name);
}

export async function createRun(file: File, compressors: string[]): Promise<string> {
  const body = new FormData();
  body.append("file", file);
  body.append("compressors", compressors.join(","));
  const res = await fetch("/api/runs", { method: "POST", body });
  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    throw new Error(detail?.detail ?? "The server refused this run.");
  }
  return (await res.json()).run_id;
}

/** Fetches the stored compressed bytes and hands them to the browser as a file. */
export async function downloadRun(runId: string, compressor: string, setting: string): Promise<void> {
  const res = await fetch(`/api/runs/${runId}/download/${compressor}/${setting}`);
  if (!res.ok) throw new Error("That run expired, run it again.");
  const name = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? "download";
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function openEvents(
  runId: string,
  on: { result: (r: JobResult) => void; done: (analysis: Analysis) => void; lost: () => void },
): () => void {
  const source = new EventSource(`/api/runs/${runId}/events`);
  let finished = false;
  // The server pings every 2 s even during a slow job, so silence means the stream is dead.
  // (A dead server behind the Vite proxy leaves the connection hanging without an error.)
  let watchdog: ReturnType<typeof setTimeout>;
  const stop = () => {
    finished = true;
    clearTimeout(watchdog);
    source.close();
  };
  const lose = () => {
    if (!finished) {
      stop();
      on.lost();
    }
  };
  const alive = () => {
    clearTimeout(watchdog);
    watchdog = setTimeout(lose, STALL_MS);
  };
  alive();
  source.addEventListener("ping", alive);
  source.addEventListener("result", (e) => {
    alive();
    on.result(JSON.parse((e as MessageEvent).data));
  });
  source.addEventListener("done", (e) => {
    stop();
    on.done(JSON.parse((e as MessageEvent).data));
  });
  source.addEventListener("error", (e) => {
    // A server-sent "error" event carries data; a connection error does not.
    if ((e as MessageEvent).data) {
      stop();
      on.lost();
    } else {
      lose();
    }
  });
  return stop;
}
