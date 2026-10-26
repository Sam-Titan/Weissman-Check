---
doc: spec
status: approved
---

# Weissman Check — Technical Spec

## How This Works, In Plain Language
Weissman Check has two programs that run on your laptop.

- **The browser app** (React + TypeScript) is everything you see: the hero page, the dropbox, the compressor carousel, the progress bar, the replay card and the results. It also does the cheap, instant work on its own: checking that a file is text, giving the entropy verdict, and computing the **replay** (the simplified LZ-style pass over the first ~8 KB of the file).
- **The Python server** (FastAPI) does the real work. It takes the uploaded file and runs it through gzip, brotli, zstd, lz4, xz and bzip2 at a fast and a strong setting. Every run is timed (compress time and decompress time, each the **median of several repeats**), and its real compressed bytes are kept in memory so the download buttons can hand them back.

The server tells the browser about each finished run as soon as it is done (a **stream of events**, Server-Sent Events), so the 12-segment bar fills one segment at a time and the metrics box updates live. When the last run finishes, the **server computes the answer** (one place, in Python) and sends it in the final `done` event. The browser only decides which precomputed piece to show:

- **Recommendation rule.** For each run, `time to the user = (compress time, dynamic only) + size ÷ network speed + decompress time`. The smallest time wins. Static content is compressed once and served many times, so compress time is free. Dynamic content is compressed on every request, so it is not. That is the only reason the winner can flip when you press the toggle. The server sends the static winner, the dynamic winner and the browser-best pick for each mode.
- **Weissman score.** `W = (r / r̄) × (log T̄ / log T)`, where `r` is the compression ratio, `T` is the compress time, and `r̄`, `T̄` are the same for the baseline (gzip level 6 by default). The server precomputes it for **all 9 combinations** of time unit (3) × baseline (3), so changing the unit or baseline in the "break it" control just switches which precomputed table is shown. Cases where the maths breaks come back as `undefined` or `flagged` with a one-line explanation, never NaN.

Nothing is saved. There are no accounts, no database, and the server forgets a file a few minutes after the run. This matches `prd.md > States and Boundaries > Refresh`.

**Why this shape:** the numbers must come from the real compressors (that is the whole point of the app), which means Python's C-backed libraries. All the "explaining" (replay, entropy, formulas) is cheap and benefits from being instant and interactive, so it lives in the browser. The formulas live in exactly one place (the Python backend, covered by pytest). The server sends every variant up front, so the toggle and the "break it" control need no server round-trip and no second copy of the maths in TypeScript.

## The Core Journey Through the System
PRD ref: `prd.md > The Core Journey`.

1. **Arrive.** Browser shows `Hero` (looping squeeze animation + Start). Start swaps to the `CompressorPage`. No server call. (`prd.md > Screens and Layout`)
2. **Narrator starts.** `NarratorBox` shows tour step 1 with Next / Skip tour. (`prd.md > Narrator and guided tour`)
3. **Give it a file.** The user drops a file or clicks a sample button. Samples are fetched from `GET /api/samples/{name}`; dropped files are read locally. The browser checks size (≤ 25 MB), emptiness, and text-likeness, then computes the entropy verdict, shows the file chip, and puts the first 8 KB in the replay card as plain text. (`prd.md > File input`)
4. **Choose what to compare.** Checkboxes in `CompressorCarousel` update the `included` list. Reading a card only changes `NarrationCard`. (`prd.md > Compressor carousel, selection and narration cards`)
5. **Run.** Browser `POST /api/runs` (file + included compressors). The server stores the file in memory and returns a `run_id`. The browser opens `GET /api/runs/{run_id}/events` (Server-Sent Events) and starts the replay at the same moment.
6. **Watch.** The server runs the jobs one by one (a hidden baseline set first, see Benchmark Engine) and emits a `result` event per job. Each event fills one progress segment and updates the live metrics box. The replay sweeps the 8 KB prefix independently. (`prd.md > The benchmark and progress bar`, `prd.md > Replay card`)
7. **See the answer.** The server finishes with a `done` event carrying the **analysis** (static/dynamic/browser-best winners and the 9 Weissman tables). The browser slides the left half over to `Results` (banner, table, "break it" control) and shows the pieces for the current mode and unit/baseline. The replay card resizes to the tall rectangle and keeps replaying. (`prd.md > Results: recommendation banner`, `Results: table`)
8. **Act.** Toggle static/dynamic → show the other precomputed winner (no server call, no maths). Download → `GET /api/runs/{run_id}/download/{compressor}/{setting}` streams the stored real compressed bytes. Weissman control → show the precomputed table for that unit × baseline. Try another file → clear file, run and results; keep `included`.

```
Browser (React)                              Server (FastAPI)
─────────────────────────────                ───────────────────────────────
drop / sample ──────────── GET /api/samples/{name} ───────▶ samples/*.{json,log,js}
validate + entropy + preview (local)
Run ─────────────────────── POST /api/runs ───────────────▶ RunStore (file in memory)
                         ◀─────────────── run_id
EventSource ─────────────── GET /api/runs/{id}/events ────▶ BenchmarkEngine ─▶ 6 libs
   ◀── result × (12..15) ── ◀── done + analysis            (median within a time budget)
show winners / Weissman tables (precomputed)  ◀─ analysis.py (single source of truth)
Download ────────────────── GET /api/runs/{id}/download/.. ▶ compressed bytes (memory)
```

## Stack
| Layer | Choice | Why / docs |
|---|---|---|
| Python tooling | **uv**, Python 3.12+ | Learner's preferred; `uv sync`, `uv run`. https://docs.astral.sh/uv/ |
| API | **FastAPI + Uvicorn** | Learner's strength. https://fastapi.tiangolo.com/ (SSE via `StreamingResponse`, `text/event-stream`) |
| Compressors | stdlib `gzip`, `bz2`, `lzma`; PyPI `brotli`, `zstandard`, `lz4` | Real C libraries behind Python bindings. https://github.com/google/brotli · https://python-zstandard.readthedocs.io/ · https://python-lz4.readthedocs.io/ |
| Models | **Pydantic** (ships with FastAPI) | Typed request/event shapes. |
| Python quality | **Ruff** (lint + format) + **pytest** | Minimal, as requested. Tests cover the Weissman formula (including edge cases) and the recommendation rule, which live only in the backend (see Testing). |
| Frontend | **React + TypeScript + Vite**, **pnpm** (Node 24) | Learner's strength. Vite proxies `/api` to the server. https://vite.dev/ |
| Styling | **Tailwind CSS v4** with a custom theme (`@theme` tokens from the PRD) | Learner's change from plain CSS. https://tailwindcss.com/docs. Not shadcn's default look (the generic style the PRD rules out). |
| Unstyled UI pieces | **Radix Primitives** (`@radix-ui/react-tooltip`, `react-switch`/`toggle-group`) | Accessible tooltip / toggle behavior, styled by us. https://www.radix-ui.com/primitives |
| Animation | **Motion** (`motion/react`) | Results slide-in, replay card resize. https://motion.dev/docs/react |
| Fonts | **@fontsource/lato** + **@fontsource/source-code-pro** | Self-hosted via npm so the demo works offline. |
| Task runner | **just** (`Justfile`) | `just dev` starts both servers. No Docker Compose. |
| State | React `useReducer` / `useState` in `App` | No TanStack Query, Zustand, React Router, Hey API, CI or Lefthook (learner's decision). |

Not verified yet (check in Build step 1): current versions of `brotli`, `zstandard`, `lz4` that install cleanly with `uv` on Python 3.12/3.13 (wheels exist for Linux/WSL2), and that Vite's dev proxy passes `text/event-stream` through without buffering.

## Where It Runs and How Someone Tries It
- **Runtime:** local only. Python 3.12+, uv, Node 24, pnpm, just. No API keys, no `.env` values required.
- **Start:** `just setup` once (runs `uv sync` and `pnpm install`), then `just dev` (FastAPI on `:8000`, Vite on `:5173`). **Open `http://localhost:5173`.**
- **Demo recording (required for submission):** click Start, click the **JSON API response** sample, Run, read the banner, flip static ↔ dynamic so the winner changes, drag the Weissman control, click a download. Record that screen. A public GitHub repo is also required; `6-ship` handles both.
- **Deployment:** optional and not planned. Nothing in the architecture prevents it later (one Python process + static frontend build).
- Other commands: `just test` (pytest), `just check` (ruff + `tsc --noEmit`).

## Look and Feel
Carried from `prd.md > Look and Feel` (do not re-interview). Tailwind v4 `@theme` tokens in `frontend/src/styles.css`:

- **Surfaces:** page `#F7F8FA`, cards `#FFFFFF` with 1px `#E3E7ED` border, `rounded-xl`, no shadows or gradients. Generous spacing.
- **Accent:** one bright blue `#1E88FF` for buttons and the recommendation banner (white text).
- **Compressor colours (used in carousel, progress segments, table rows, replay highlights):** gzip `#2F80ED` blue, brotli `#F2994A` orange, zstd `#1ABC9C` teal, lz4 `#F2C94C` yellow, xz `#9B51E0` purple, bzip2 `#EB5C9A` pink. Defined once in `frontend/src/lib/compressors.ts` and exposed as CSS variables.
- **Fonts:** Lato for UI; Source Code Pro for numbers and file text.
- **Motion:** smooth 200–300 ms transitions (Motion). The segmented progress bar is the one flourish; everything else stays calm.
- **Tone of copy:** friendly, plain English, a little wry. No *Silicon Valley* names, logos or imagery. Light theme only.

## Components

### Backend: API
`backend/app/main.py` — FastAPI app with four routes (see External Services and Dependencies > API contract). One run at a time: if a run is in progress, `POST /api/runs` returns `409`. This keeps timings clean.
PRD ref: `prd.md > The benchmark and progress bar`.

### Backend: Benchmark Engine
`backend/app/benchmark.py` — a generator `run_benchmark(data, included)` that yields one result per job.
- **Jobs:** 6 compressors × {fast, strong} = 12; only included compressors run. Settings:

  | Compressor | fast | strong | output ext |
  |---|---|---|---|
  | gzip | level 1 | level 9 | `.gz` |
  | brotli | quality 1 | quality 11 | `.br` |
  | zstd | level 1 | level 19 | `.zst` |
  | lz4 | level 0 (default) | level 12 (HC) | `.lz4` |
  | xz | preset 1 | preset 9 | `.xz` |
  | bzip2 | level 1 | level 9 | `.bz2` |

- **Baselines:** the Weissman baseline is gzip level 6, and the control also offers gzip level 1 and zstd level 3. These three are always measured as extra **baseline jobs** (reusing a result if the same setting is already a normal job). They are not shown as table rows unless they are normal jobs and are not part of the progress bar's 12 segments.
- **Timing (adaptive):** `time.perf_counter()`. Compress and decompress are each timed in a loop that always runs **at least once** and keeps repeating while the total time spent on that step is under a small **time budget** (default 0.5 s) and fewer than 7 repeats have run; the recorded value is the **median**. A slow job (for example brotli 11 or xz 9 on a large file, where one run already exceeds the budget) therefore runs exactly once, and fast jobs on small files get several repeats for stable speeds. The repeat count is recorded in each result. The first decompress also verifies the round trip equals the input; a mismatch counts as a failure. Constants `TIME_BUDGET_S` and `MAX_REPEATS` live at the top of `benchmark.py`.
- **Compress speed / decompress speed** are reported in MB/s of *original* bytes (`size_original / median_time`).
- **Failure:** any exception in a job yields `status: "failed"` for that job; the rest continue.
PRD ref: `prd.md > The benchmark and progress bar`, `prd.md > Results: table`.

### Backend: Analysis (single source of truth)
`backend/app/analysis.py` — pure functions, no I/O. Given the list of successful `JobResult`s and the baseline results, it returns one `Analysis` object, sent with the `done` event.

```
transfer_s    = compressed_bytes / (NETWORK_MBPS × 1_000_000 / 8)      # NETWORK_MBPS = 20
static_time   = transfer_s + decompress_s
dynamic_time  = compress_s + transfer_s + decompress_s
winner(mode)  = argmin of that mode's time over successful rows
browser_best(mode) = same, restricted to {gzip, brotli, zstd}
```
- **Recommendation payload:** for `static` and `dynamic`: `winner`, `browser_best`, each with compressor, setting, size, % saved, decompress MB/s, and delivery time; plus `network_mbps` so the banner can state the assumed speed. If the winner is already a browser-supported compressor, `browser_best` equals it and the banner shows one line; otherwise the banner shows both (`prd.md > Results: recommendation banner`). If no row succeeded, `winner` is null.
- **Weissman payload:** `weissman[unit][baseline]` for unit ∈ {`s`, `ms`, `us`} × baseline ∈ {`gzip6`, `gzip1`, `zstd3`} (9 tables). Each table maps `compressor/setting` to a score object `{status, value, note}`:

```
W = α · (r / r̄) · (ln T̄ / ln T)        α = 1, natural log
r = original_bytes / compressed_bytes    T = median compress time in the chosen unit
r̄, T̄ = same for the baseline run in the same unit
```

  | Situation | status | value | note (one line) |
  |---|---|---|---|
  | `T` or `T̄` ≤ 0 or non-finite | `undefined` | null | "A time of zero (or less) has no logarithm." |
  | `ln T = 0` (T is exactly 1 unit) | `undefined` | null | "Time equals exactly 1 unit, so the score divides by zero." |
  | `ln T̄ = 0` (baseline time is exactly 1 unit) | `undefined` | null | "Baseline time equals exactly 1 unit, so the score is meaningless." |
  | `ln T` and `ln T̄` have opposite signs | `undefined` | null | "One time is under 1 unit and the other over, so the score would be negative." |
  | both `ln` negative (both times under 1 unit) | `flagged` | the number | "Times under 1 unit have negative logs, so faster runs score lower here." |
  | otherwise | `ok` | the number | empty |

  Values are never NaN or infinity; every branch is covered by a pytest case. The baseline itself scores `ok` 1.0 unless a rule above applies. These are the cases the "break it" control exists to show.
PRD ref: `prd.md > Results: recommendation banner`, `prd.md > Results: Weissman "break it" control`.

### Backend: Run Store
`backend/app/store.py` — in-memory dict of runs: `{run_id: Run(data, outputs: dict[(compressor, setting)] -> bytes, created_at)}`. Keeps at most 3 runs and drops any run older than 10 minutes (checked on each request). Lost on server restart, by design.
PRD ref: `prd.md > Results: table` (downloads of real files), `prd.md > Non-Goals` (no server-side storage of uploads).

### Backend: Samples
`backend/app/samples/` holds three deterministic, **synthetic sample files** (generated by `scripts/make_samples.py`, ~1–2 MB each): `api-response.json`, `server.log`, `app.min.js`. They are labelled as sample data in the UI. `GET /api/samples/{name}` serves them.
PRD ref: `prd.md > File input`.

### Frontend: App shell and state
`frontend/src/App.tsx` — holds one `useReducer` for: `screen` (`hero | compressor`), `file`, `included[]`, `runStatus` (`idle | running | done`), `results[]`, `mode` (`static | dynamic`), `weissman` (`unit`, `baseline`), `tour` step. Explicit fields only; nothing persisted.
PRD ref: `prd.md > States and Boundaries`.

### Frontend: Hero
`Hero.tsx` — looping SVG/CSS squeeze animation (a block of text lines shrinking into a smaller block), app name, Start button.
PRD ref: `prd.md > Hero page`.

### Frontend: Narrator Box
`NarratorBox.tsx` — tour steps (drop file → pick compressors → run → read results) with Next / Skip tour; Skip leaves the app usable. Its first-step intro text is also shown in the replay card before any file is added.
PRD ref: `prd.md > Narrator and guided tour`.

### Frontend: Dropbox and File Chip
`Dropbox.tsx`, `FileChip.tsx`, `lib/validate.ts`, `lib/entropy.ts`.
- Validation (all local, before any upload): empty → "This file is empty, nothing to squeeze."; > 25 MB → rejected with limit stated; binary → the friendly "text-like files for now" message. Binary test: image/video extension or MIME, or any NUL byte / invalid UTF-8 in the first 8 KB.
- Entropy verdict: Shannon entropy in bits per byte over the whole file (counts in a 256-entry array). **Thresholds (learner's choice):** `< 6.0` "Highly repetitive, worth compressing"; `6.0–7.5` "Some gain"; `> 7.5` "Already dense, little to gain". The "?" tooltip explains entropy and notes that this figure only counts how often each byte value appears, so compressors that exploit repeated strings often beat it; the results table's **bits per byte** column shows the real output.
PRD ref: `prd.md > File input`, `prd.md > States and Boundaries`.

### Frontend: Compressor Carousel and Narration Card
`CompressorCarousel.tsx`, `NarrationCard.tsx`, `content/narration.ts` — six cards with include checkboxes (all checked); the card in view drives the narration text. Run is disabled with "Pick at least one compressor." when none is checked. For gzip/brotli/zstd/lz4 the narration explains repeated strings (LZ-style); for xz and bzip2 it explains their different approach in words only and says the replay does not apply.
PRD ref: `prd.md > Compressor carousel, selection and narration cards`.

### Frontend: Progress Bar and Metrics Box
`ProgressBar.tsx`, `MetricsBox.tsx` — 12 segments in fixed order (compressor × setting); unchecked ones render as skipped; each fills in its colour on its `result` event (Motion fill). Metrics box lists greyed metric names with "?" tooltips before a run, fills live during it, and is replaced by the results table after.
PRD ref: `prd.md > The benchmark and progress bar`.

### Frontend: Replay Card
`ReplayCard.tsx`, `lib/lz77.ts` — takes the first **8 KB** of the file (card says "Replaying the first 8 KB of your file" when the file is larger). `lz77.ts` finds matches with a greedy match finder (hash of 3-byte prefixes, window 4 KB, minimum match length 4) and returns a list `{pos, length, distance}`. The card animates a cursor over the text; each match lights up, is labelled "repeat of N chars from D back", and a "bytes saved so far" counter adds `length − 3` per match (3 ≈ cost of a back-reference in the simplified model). Stop/Restart control only the animation. Starts when Run is clicked; before that it shows plain text (or the narrator intro with no file). After the run it becomes the tall rectangle (text scrolls) via Motion `layout`. Label: "How LZ-style compressors see your file (simplified replay)".
PRD ref: `prd.md > Replay card`.

### Frontend: Recommendation Banner
`RecommendationBanner.tsx` — shows `analysis.recommendation[mode]`; no maths, only formatting. The static/dynamic toggle (Radix toggle-group) switches `mode` in the reducer.
- Banner format: "Ship **brotli (strong)** for static assets: 78% smaller, decompresses at 410 MB/s · at 20 Mbit/s" (the speed comes from `analysis.network_mbps`).
- If `browser_best` differs from `winner`, the banner shows both: "Fastest to deliver overall: xz (strong). Best for browsers: brotli (strong)."
- If `winner` is null (every run failed), the banner says the run failed.
PRD ref: `prd.md > Results: recommendation banner`.

### Frontend: Results Table
`ResultsTable.tsx` — one row per successful or failed normal job, coloured by compressor; columns: size, % saved, **bits per byte** (`compressed_bytes × 8 / original_bytes`, so the user can compare it with the entropy verdict), compress MB/s, decompress MB/s, Weissman, download; browser-supported marker for gzip/brotli/zstd; "?" tooltip on each metric heading; failed rows show "failed". Default order is delivery time for the current mode (read from the analysis). The Weissman cell renders the score object: `ok` shows the number, `flagged` shows the number with a warning marker and the note on hover, `undefined` shows "undefined" with the note on hover.
PRD ref: `prd.md > Results: table`.

### Frontend: Weissman "Break It" Control
`WeissmanControl.tsx` — two selectors (time unit, baseline) that choose `analysis.weissman[unit][baseline]` to display. No score maths in the frontend. A short note under the control states what just changed and that any single score can mislead; when a flagged or undefined cell is on screen, the note also shows that cell's one-line explanation.
PRD ref: `prd.md > Results: Weissman "break it" control`.

**Worked example (illustrative numbers, for the learner's question; the app shows real ones).** 1,000,000-byte file, 20 Mbit/s = 2,500,000 B/s:

| Run | size | compress | decompress | transfer | static | dynamic |
|---|---|---|---|---|---|---|
| zstd (fast) | 230,000 | 0.012 s | 0.004 s | 0.092 s | 0.096 s | 0.108 s |
| brotli (strong) | 150,000 | 1.100 s | 0.006 s | 0.060 s | **0.066 s** | 1.166 s |

Static ignores compress time, so brotli-strong's tiny size wins (0.066 < 0.096). Dynamic pays 1.1 s per request, so zstd-fast wins (0.108 < 1.166). Weissman for zstd-fast against gzip-6 (210,000 B, 0.030 s): `r/r̄ = 4.348/4.762 = 0.913`. In seconds: `ln 0.030 / ln 0.012 = −3.507/−4.423 = 0.793` → W = **0.72**, status `flagged` (both times are under 1 s, so logs are negative and the faster compressor scores *lower* than gzip-6). In milliseconds: `ln 30 / ln 12 = 3.401/2.485 = 1.369` → W = **1.25**. Same data, different verdict. In microseconds `ln 30000 / ln 12000 = 1.098` → W = **1.00**. (The backend computes all of these; the app shows the real numbers.)

### Frontend: Try Another File
Reducer action `RESET_FILE`: clear file, results, run status; keep `included`; show the dropbox; replay card returns to plain preview / intro.
PRD ref: `prd.md > Try another file`.

## Data Model
No database. All state is short-lived.

| Data | Lives in | Updated by | When the user leaves/returns |
|---|---|---|---|
| Uploaded file bytes | Server memory (`Run.data`) and browser memory (`File`) | `POST /api/runs` | Server drops after 10 min or restart; browser loses on refresh |
| Compressed outputs | Server memory (`Run.outputs`) | Benchmark Engine | Same as above; download after expiry returns 404 and the UI says "That run expired, run it again." |
| Included compressors, mode, Weissman unit/baseline, tour step | Browser `useReducer` | User actions | Gone on refresh (intentional) |
| Results | Browser state, filled from SSE events | `result` events | Gone on refresh |

Shapes (Pydantic on the server, mirrored TS types in `frontend/src/types.ts`; hand-written, no codegen):

```
RunRequest   : file (multipart), compressors: list[str]
RunCreated   : run_id: str, jobs: list[JobId], baselines: list[JobId]
JobId        : compressor: str, setting: "fast" | "strong" | "baseline"
JobResult    : compressor, setting, level_label, status: "ok" | "failed",
               original_bytes, compressed_bytes, compress_s, decompress_s,
               repeats (adaptive), is_baseline: bool, error?: str
Analysis     : network_mbps,
               recommendation: {static|dynamic: {winner, browser_best}},   # each a RowSummary or null
               weissman: {s|ms|us: {gzip6|gzip1|zstd3: {"compressor/setting": {status: ok|flagged|undefined, value: number|null, note}}}}
SSE events   : "result" (JobResult), "done" (Analysis), "error" ({message})
```

## File Structure
```
weissman-check/
├── Justfile                    # setup, dev, test, check
├── README.md                   # how to run + demo steps (written by 6-ship)
├── pyproject.toml              # uv project, ruff config, pytest config
├── backend/
│   ├── app/
│   │   ├── main.py             # FastAPI routes, SSE streaming, CORS-free (Vite proxy)
│   │   ├── benchmark.py        # jobs, settings table, median timing, round-trip check
│   │   ├── analysis.py         # recommendation rule + 9 Weissman tables (single source of truth)
│   │   ├── store.py            # in-memory runs with TTL and size cap
│   │   ├── models.py           # Pydantic request/event models
│   │   └── samples/            # api-response.json, server.log, app.min.js (synthetic)
│   └── tests/
│       ├── test_weissman.py    # formula, 9 combinations, every edge-case branch
│       ├── test_recommend.py   # static vs dynamic rule, browser-best rule, all-failed
│       ├── test_timing.py      # adaptive repeat loop (fake slow/fast jobs)
│       └── test_samples_flip.py# real benchmark on samples: winner flips at 20 Mbit/s
├── scripts/
│   └── make_samples.py         # deterministic generator for the sample files
├── frontend/
│   ├── package.json
│   ├── vite.config.ts          # /api proxy → :8000
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx             # screen switch + reducer
│       ├── styles.css          # Tailwind v4 @theme tokens (colours, fonts)
│       ├── types.ts
│       ├── api.ts              # createRun, openEvents, downloadUrl, fetchSample
│       ├── lib/
│       │   ├── compressors.ts  # names, colours, browser-support flag, fast/strong labels
│       │   ├── entropy.ts
│       │   ├── validate.ts
│       │   └── lz77.ts         # replay match finder (first 8 KB)
│       ├── content/
│       │   ├── narration.ts    # six narration cards + narrator tour steps + tooltips
│       │   └── samples.ts      # sample button labels → file names
│       └── components/
│           ├── Hero.tsx
│           ├── NarratorBox.tsx
│           ├── Dropbox.tsx
│           ├── FileChip.tsx
│           ├── CompressorCarousel.tsx
│           ├── NarrationCard.tsx
│           ├── ProgressBar.tsx
│           ├── MetricsBox.tsx
│           ├── ReplayCard.tsx
│           ├── RecommendationBanner.tsx
│           ├── ResultsTable.tsx
│           ├── WeissmanControl.tsx
│           └── Tooltip.tsx     # Radix tooltip wrapper, our styling
└── devpost/                    # planning docs (scope, prd, spec, checklist)
```

## External Services and Dependencies
No external network services, accounts, keys or cost. Everything runs on localhost.

### API contract
| Route | Request | Response |
|---|---|---|
| `POST /api/runs` | multipart: `file`, `compressors` (comma list) | `201 RunCreated`; `409` if a run is in progress; `413` if > 25 MB; `422` if empty or no compressor |
| `GET /api/runs/{id}/events` | — | `text/event-stream`: `event: result` + JSON `JobResult` per job (including baselines), then `event: done` with the JSON `Analysis` |
| `GET /api/runs/{id}/download/{compressor}/{setting}` | — | the stored compressed bytes, `Content-Disposition: attachment; filename="<name>.<ext>"`; `404` if expired |
| `GET /api/samples/{name}` | — | the sample file; `404` for unknown names |

The server also re-checks the 25 MB limit and rejects empty files; the browser checks first for the friendly messages.

### Libraries (docs)
- FastAPI: https://fastapi.tiangolo.com/ · Uvicorn: https://www.uvicorn.org/
- Python `gzip`/`bz2`/`lzma`: https://docs.python.org/3/library/
- brotli: https://pypi.org/project/Brotli/ · zstandard: https://python-zstandard.readthedocs.io/ · lz4: https://python-lz4.readthedocs.io/
- React: https://react.dev/ · Vite: https://vite.dev/ · Tailwind v4: https://tailwindcss.com/docs · Motion: https://motion.dev/docs/react · Radix: https://www.radix-ui.com/primitives
- Server-Sent Events / `EventSource`: https://developer.mozilla.org/docs/Web/API/EventSource
- Background on the formula: the Weissman score as defined for HBO's *Silicon Valley* (text-only reference in the narration; no show branding).

## Testing
Minimal, as the learner chose. All logic under test lives in the backend; there are no mirrored fixtures and no frontend test runner.
- `test_weissman.py` — worked example from this spec (0.72 `flagged` in seconds, 1.25 `ok` in milliseconds, 1.00 in microseconds); all 9 unit × baseline tables are present; the baseline scores 1.0; **every edge-case branch** (T ≤ 0, `ln T = 0`, `ln T̄ = 0`, opposite signs → `undefined`; both negative → `flagged`) returns the right status and a non-empty note; no value is ever NaN or infinite.
- `test_recommend.py` — the worked-example rows give brotli-strong for static and zstd-fast for dynamic; when the overall winner is xz/lz4/bzip2 the `browser_best` is the best of gzip/brotli/zstd; failed rows are ignored; all-failed returns null winners.
- `test_timing.py` — the adaptive loop with fake jobs: a job slower than the budget runs once, a fast job runs up to `MAX_REPEATS`, median is returned.
- `test_samples_flip.py` — **sample flip check.** Runs the real benchmark on each sample, builds the `Analysis` at 20 Mbit/s, and asserts that **at least one sample** has different static and dynamic winners. If it fails, the fix is tuning the assumed speed or the sample generator, not weakening the test.

## Important Failure Modes
- **A compressor library is missing or one job throws (for example brotli quality 11 on a hard file, or out-of-memory on xz preset 9)** → that row shows "failed"; other jobs continue; banner and table use only successful rows (`prd.md > One compressor fails mid-run`).
- **The event stream drops mid-run (server restart, proxy buffering)** → `EventSource` errors; the UI shows "Lost connection to the benchmark. Try again." and returns to idle with the dropbox available.
- **Slow large file (brotli 11 / xz 9 / zstd 19 on up to 25 MB)** → the time budget makes these run once; the progress bar and metrics box show the job in progress. A "this can take a minute on big files" hint appears when size > 8 MB. The early 25 MB timing check (Build step 1) confirms the worst case stays tolerable; if not, the strong level for large files is lowered.
- **Downloads after the run expired** → 404 handled with "That run expired, run it again."

## What Was Simplified and Why
- **In-memory run store** instead of a database or temp files — nothing needs to survive a restart (`prd.md > Non-Goals`). The fuller version would need cleanup and storage rules.
- **One run at a time** instead of concurrent runs — concurrency makes timings unreliable and the demo is single-user.
- **Replay on the first 8 KB, in the browser** instead of the full file / server — keeps the animation instant and readable. The card says so.
- **Fixed network speed (20 Mbit/s)** instead of a user-selectable one — one assumption stated on the banner is enough to prove the static/dynamic flip. The fuller version would add a selector.
- **Hand-written TS types** instead of generated clients — one small API, so codegen adds more than it saves.
- **All maths in Python, none in TypeScript** — one source of truth; the cost is sending 9 precomputed Weissman tables (a few KB) instead of computing on demand.
- **Synthetic sample files** instead of real captured data — deterministic, safe to commit and chosen to show the flip. Labelled as samples.
- **Local-only run** — deployment is optional and the demo is a recording.

## Decisions and Open Issues

### Decisions
- **Stack (learner's choice, based on their toolkit):** FastAPI + uv + Ruff + pytest; React/TS/Vite + pnpm; Tailwind v4 with custom theme (shadcn's default look rejected, Radix primitives only for tooltip/toggle behavior); Motion; Justfile with `just dev`. Excluded by the learner: Docker Compose, TanStack Query, Zustand, React Router, Hey API, CI, Lefthook.
- **Streaming (recommended, accepted):** SSE for live progress (create the run with `POST`, then listen with `EventSource`). Tradeoff: two calls instead of one, but works with `EventSource` and the Vite proxy.
- **Downloads (accepted):** compressed bytes kept in server memory for ~10 minutes. Tradeoff: lost on restart and after expiry.
- **Timing (learner's choice):** median of repeated runs inside a small time budget (0.5 s per step, max 7 repeats, min 1), so slow strong settings on large files run once.
- **Single source of truth (learner's choice):** recommendation and Weissman computed only in Python (`analysis.py`); the frontend switches between precomputed values. Tradeoff: slightly bigger `done` payload, no client-side recalculation of arbitrary inputs.
- **Weissman edge cases (learner's choice):** `undefined` or `flagged` with a one-line note, never NaN; rules in Backend: Analysis.
- **Entropy thresholds (learner's choice):** 6.0 / 7.5 bits per byte, with a tooltip about repeat-exploiting compressors and a bits-per-byte column in the table.
- **Replay (learner's choice):** browser-side, capped to the first ~8 KB, labelled.
- **Build order (learner's choice):** benchmark + table + banner → progress bar → replay → Weissman "break it" → narrator tour → hero. Checklist order is for `5-build`.
- **Accepted defaults (learner):** fast/strong levels per compressor, 20 Mbit/s as "4G", Weissman units (s/ms/µs) and baselines (gzip 6 / gzip 1 / zstd 3), one run at a time. **Derived by me:** natural log, α = 1, hidden baseline jobs, the exact edge-case table, 25 MB checked client- and server-side. These resolve `prd.md > Open Questions`.

### Learner's question and how it gets clarified
The learner wants to understand how the recommendation rule and the Weissman score are computed, and why the winner flips between static and dynamic. This is clarified in two ways: the worked example above (same data, static winner brotli-strong vs dynamic winner zstd-fast; Weissman 0.72 in seconds vs 1.25 in milliseconds), and tests during the build: `test_weissman.py` and `test_recommend.py` encode these numbers (in Python, where the maths lives), and `test_samples_flip.py` shows it on real data. The narration/tooltips use the same explanation. In Build step "Weissman break it", the agent should walk the learner through one real row of their own results.

### Open issues
- **Sample flip is unproven until built.** The 20 Mbit/s constant and the sample files must be tuned so at least one sample flips; the flip test is the gate.
- **To verify early in the build:** library installs and wheels, SSE through the Vite proxy, brotli-11/xz-9/zstd-19 worst-case time on a 25 MB file (may need a lower strong setting for large files).
- **Time budget (0.5 s, 7 repeats)** is a starting point; tune in the early timing check.
