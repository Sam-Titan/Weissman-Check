import { useEffect, useMemo, useRef, useState } from "react";
import Window from "./Window";
import { NARRATOR_INTRO } from "../content/narration";
import { bytesSaved, findMatches, REF_COST } from "../lib/lz77";

export const REPLAY_BYTES = 8 * 1024;
const TICK_MS = 40;
const LITERAL_STEP = 14; // characters of unmatched text covered per tick

interface Props {
  text: string | null; // first 8 KB of the file
  note?: string | null; // shown instead of the replay for files that are not text
  fileBytes: number;
  runId: number; // changes each time Run is clicked: starts the replay
  tall: boolean; // true once results are showing
}

/** How LZ-style compressors see your file (simplified replay of the first 8 KB). */
export default function ReplayCard({ text, note = null, fileBytes, runId, tall }: Props) {
  const matches = useMemo(() => (text ? findMatches(text) : []), [text]);
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const cursorEl = useRef<HTMLSpanElement>(null);
  const started = runId > 0;

  // A new run (or a new file) restarts the replay from the top.
  useEffect(() => {
    setCursor(0);
    setPlaying(started);
  }, [runId, text, started]);

  useEffect(() => {
    if (!playing || !text) return;
    const id = setInterval(() => {
      setCursor((c) => {
        if (c >= text.length) return c;
        const here = matches.find((m) => m.pos === c);
        if (here) return c + here.length; // a repeat lights up all at once
        const next = matches.find((m) => m.pos > c);
        return Math.min(c + LITERAL_STEP, next ? next.pos : text.length, text.length);
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [playing, text, matches]);

  // Finished? Pause a beat, then play again so the card keeps replaying.
  useEffect(() => {
    if (!playing || !text || cursor < text.length) return;
    const id = setTimeout(() => setCursor(0), 2500);
    return () => clearTimeout(id);
  }, [cursor, playing, text]);

  useEffect(() => {
    const box = scroller.current;
    const el = cursorEl.current;
    if (!box || !el || !playing) return;
    const top = el.offsetTop - box.clientHeight / 2;
    box.scrollTop = Math.max(0, top);
  }, [cursor, playing]);

  const seen = matches.filter((m) => m.pos + m.length <= cursor);
  const latest = seen.at(-1);

  return (
    <Window
      title="How LZ-style compressors see your file"
      color="pink"
      label="Replay"
      className={`min-h-[220px] max-[899px]:h-[380px] min-[900px]:min-h-0 min-[900px]:flex-1 ${
        tall ? "" : "min-[900px]:max-h-[400px]"
      }`}
      bodyClassName="flex flex-col p-4"
    >
      <p className="text-xs font-bold text-muted">Simplified replay</p>
      {note ? (
        <p className="mt-3 font-bold text-ink">{note}</p>
      ) : text === null ? (
        <p className="mt-3 text-ink">{NARRATOR_INTRO}</p>
      ) : (
        <>
          {fileBytes > REPLAY_BYTES && (
            <p className="text-xs text-muted">Replaying the first 8 KB of your file</p>
          )}
          <div
            ref={scroller}
            className="relative mt-2 min-h-0 flex-1 overflow-y-auto rounded-md border-2 border-ink bg-mint p-3 font-mono text-xs leading-relaxed break-all whitespace-pre-wrap"
            data-testid="replay-text"
          >
            {started ? (
              <ReplayText text={text} matches={matches} cursor={cursor} cursorRef={cursorEl} />
            ) : (
              text
            )}
          </div>
          {started && (
            <div className="mt-3 space-y-1">
              <div className="flex items-center justify-between">
                <p className="font-mono text-sm font-semibold" data-testid="saved">
                  Bytes saved so far: {bytesSaved(matches, cursor).toLocaleString()}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPlaying((p) => !p)}
                    className="btn px-3 py-1 text-sm"
                  >
                    {playing ? "Stop" : "Play"}
                  </button>
                  <button
                    onClick={() => {
                      setCursor(0);
                      setPlaying(true);
                    }}
                    className="btn px-3 py-1 text-sm"
                  >
                    Restart
                  </button>
                </div>
              </div>
              <p className="min-h-5 text-sm text-muted" data-testid="latest">
                {latest
                  ? `repeat of ${latest.length} chars from ${latest.distance} back (saves ${latest.length - REF_COST} ${latest.length - REF_COST === 1 ? "byte" : "bytes"})`
                  : "Scanning for repeated text…"}
              </p>
            </div>
          )}
        </>
      )}
    </Window>
  );
}

function ReplayText({
  text,
  matches,
  cursor,
  cursorRef,
}: {
  text: string;
  matches: ReturnType<typeof findMatches>;
  cursor: number;
  cursorRef: React.RefObject<HTMLSpanElement | null>;
}) {
  const parts: React.ReactNode[] = [];
  let at = 0;
  for (const m of matches) {
    if (m.pos + m.length > cursor) break;
    if (m.pos > at) parts.push(text.slice(at, m.pos));
    parts.push(
      <mark
        key={m.pos}
        data-match
        title={`repeat of ${m.length} chars from ${m.distance} back`}
        className="rounded-sm bg-sun text-ink"
      >
        {text.slice(m.pos, m.pos + m.length)}
        <sup className="ml-0.5 font-bold text-pink">
          {m.length}←{m.distance}
        </sup>
      </mark>,
    );
    at = m.pos + m.length;
  }
  if (cursor > at) parts.push(text.slice(at, cursor));
  return (
    <>
      {parts}
      <span ref={cursorRef} className="inline-block h-3 w-1 translate-y-0.5 bg-pink" />
      <span className="text-muted/50">{text.slice(cursor)}</span>
    </>
  );
}
