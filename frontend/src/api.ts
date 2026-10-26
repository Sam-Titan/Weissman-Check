import type { JobResult } from "./types";

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

export function openEvents(
  runId: string,
  on: { result: (r: JobResult) => void; done: () => void; lost: () => void },
): () => void {
  const source = new EventSource(`/api/runs/${runId}/events`);
  let finished = false;
  source.addEventListener("result", (e) => on.result(JSON.parse((e as MessageEvent).data)));
  source.addEventListener("done", () => {
    finished = true;
    source.close();
    on.done();
  });
  source.onerror = () => {
    if (!finished) {
      source.close();
      on.lost();
    }
  };
  return () => source.close();
}
