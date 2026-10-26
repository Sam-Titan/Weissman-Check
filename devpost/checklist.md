---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast

## Slices

- [x] **1. Click a sample, get a real benchmark table**
  Becomes usable: A running app (`just dev`) where clicking a sample file runs all six compressors at fast and strong on the server, streams each result over SSE, and shows them in a plain table (size, % saved, compress/decompress MB/s).
  Why now: Retires the biggest unknowns first: library installs, SSE through the Vite proxy, and worst-case timing on a 25 MB file. Every later slice reads these results.
  PRD ref: `prd.md > The Core Journey` (steps 3, 5), `prd.md > The benchmark and progress bar`
  Spec ref: `spec.md > Stack`, `spec.md > Components > Backend: API / Benchmark Engine / Run Store / Samples`, `spec.md > File Structure`, `spec.md > External Services and Dependencies > API contract`
  Build: Scaffold uv/FastAPI backend and Vite/React/TS/Tailwind v4 frontend with the Justfile and theme tokens; sample generator and three samples; benchmark engine with adaptive median timing and round-trip check; run store; `POST /api/runs`, SSE events, samples route; baseline jobs; minimal frontend that fetches a sample, starts a run and renders result rows as they arrive; `test_timing.py`.
  Verify (mechanical): `uv sync` and `pnpm install` succeed; `just test` passes; curl `POST /api/runs` then `GET .../events` shows streamed `result` events then `done`; same stream works through `localhost:5173/api` (proxy not buffering); a synthetic 25 MB text run is timed and the worst case recorded; `just check` is clean.
  Learner check: Run `just dev`, open `http://localhost:5173`, click a sample, and watch rows appear one by one with real sizes and speeds.
  Commit: `Run real benchmarks on a sample and stream results into a table`

- [x] **2. Ship-this-one banner that flips static vs dynamic**
  Becomes usable: After a run, a banner names the compressor to ship at the assumed 20 Mbit/s, with a static/dynamic toggle that can change the winner and a browser-best line when the winner is not browser-supported.
  Why now: This is the practical answer the whole app exists for, and it carries the flip risk: if no sample flips, the speed or samples must be tuned now.
  PRD ref: `prd.md > Results: recommendation banner`
  Spec ref: `spec.md > Components > Backend: Analysis`, `spec.md > Components > Frontend: Recommendation Banner`, `spec.md > Testing`
  Build: `analysis.py` recommendation rule (static/dynamic winner, browser-best, all-failed), `done` event carries the analysis, `RecommendationBanner` with Radix toggle-group; `test_recommend.py` and `test_samples_flip.py`.
  Verify (mechanical): `just test` passes, including the spec's worked example (brotli-strong static, zstd-fast dynamic) and the real-sample flip check at 20 Mbit/s; banner renders in the running app and toggling changes text with no network call.
  Learner check: Run a sample, read the banner, press static/dynamic and say whether the answer changes and whether the reason makes sense to you.
  Commit: `Add recommendation banner with static/dynamic flip`

- [x] **3. Live 12-segment progress bar and metrics box**
  Becomes usable: While a run is in progress, the segmented bar fills one coloured segment per finished job and a metrics box updates live; Run is blocked until the run finishes; results replace the dropbox area when done.
  Why now: Delivers the app's one flourish and the compressor colours, which the later pieces reuse.
  PRD ref: `prd.md > The benchmark and progress bar`, `prd.md > Compressor page — during/after a run`
  Spec ref: `spec.md > Components > Frontend: Progress Bar and Metrics Box`, `spec.md > Look and Feel`, `spec.md > Components > Frontend: App shell and state`
  Build: `lib/compressors.ts` colours as CSS variables, reducer-driven `ProgressBar` and `MetricsBox` with greyed names and "?" tooltips, run state machine, lost-connection handling, left half switching to results.
  Verify (mechanical): `just check` clean; run in the browser via Playwright and confirm 12 segments, segments fill in order with the right colours, Run is disabled during the run; kill the server mid-run and confirm the "Lost connection" message.
  Learner check: Click a sample and Run; watch the bar fill, and say whether it feels right.
  Commit: `Add live segmented progress bar and metrics box`

- [ ] **4. Replay card: see the repeats in your file**
  Becomes usable: The replay card sweeps the first 8 KB of the file, highlights each repeated string with its "repeat of N chars from D back" label, and counts bytes saved; Stop and Restart work; it starts with Run and becomes the tall card after results.
  Why now: This is the unique kernel (seeing why, not just which), so it lands early, right after the real numbers exist.
  PRD ref: `prd.md > Replay card — "How compressors see your file"`
  Spec ref: `spec.md > Components > Frontend: Replay Card`
  Build: `lib/lz77.ts` greedy matcher (3-byte hash, 4 KB window, min match 4), `ReplayCard` with animated cursor, labels, counter, Stop/Restart, Motion layout resize; plain preview before Run; narrator intro text with no file.
  Verify (mechanical): `just check` clean; a one-off script (run with the project's tooling) feeds known repeated text to `lz77.ts` and confirms the expected matches; Playwright confirms highlights appear after Run and Stop/Restart do not affect the benchmark.
  Learner check: Run the server-log sample and watch the replay; say whether the highlights and counter explain why the file compressed.
  Commit: `Add LZ-style replay card`

- [ ] **5. Weissman score and the "break it" control**
  Becomes usable: The results table has a Weissman column; changing the time unit or baseline switches precomputed tables, and undefined/flagged cells explain themselves.
  Why now: Completes the second half of the kernel (does the single score mislead?) and puts the formula edge cases under test while the rest is still small.
  PRD ref: `prd.md > Results: Weissman "break it" control`
  Spec ref: `spec.md > Components > Backend: Analysis` (Weissman payload), `spec.md > Components > Frontend: Weissman "Break It" Control`, `spec.md > Components > Frontend: Results Table`
  Build: Weissman in `analysis.py` for 9 unit × baseline tables with all edge-case statuses; `WeissmanControl`; table cell rendering for ok/flagged/undefined; `test_weissman.py` including the worked example (0.72 flagged, 1.25, 1.00).
  Verify (mechanical): `just test` passes, every branch covered, no NaN/inf; Playwright changes unit and baseline and confirms the column changes.
  Learner check: Switch the unit from seconds to milliseconds and back, and tell me one row where the verdict changes; I'll walk through that real row with you.
  Commit: `Add Weissman score and break-it control`

- [ ] **6. Drop your own file, with checks and compressor choice**
  Becomes usable: A dropped file is validated (empty, over 25 MB, binary), shows a file chip with the entropy verdict and tooltip, and the carousel lets you include/exclude compressors with narration cards.
  Why now: Samples prove the loop; this makes it work on the learner's real data, which is the success definition.
  PRD ref: `prd.md > File input`, `prd.md > Compressor carousel, selection and narration cards`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > Components > Frontend: Dropbox and File Chip`, `spec.md > Components > Frontend: Compressor Carousel and Narration Card`
  Build: `Dropbox`, `FileChip`, `lib/validate.ts`, `lib/entropy.ts`, `CompressorCarousel`, `NarrationCard`, `content/narration.ts`, "Pick at least one compressor." state, large-file hint, server-side 413/422 checks.
  Verify (mechanical): `just check` clean; Playwright drops an empty file, a PNG, a 26 MB file and a real text file and confirms each message or chip; unchecking a compressor removes its jobs from the run; zero checked disables Run.
  Learner check: Drop one of your own text files and one image, uncheck two compressors, run, and say what you see.
  Commit: `Accept your own files with validation, entropy verdict and compressor selection`

- [ ] **7. Downloads, full table, and Try another file**
  Becomes usable: The table has bits per byte, browser-supported markers, "?" tooltips, failed rows, and a download button that returns the real compressed bytes; Try another file resets while keeping selections.
  Why now: Closes the Act step of the core journey and the remaining error paths (expired run, failed job).
  PRD ref: `prd.md > Results: table`, `prd.md > Try another file`
  Spec ref: `spec.md > Components > Frontend: Results Table`, `spec.md > Components > Frontend: Try Another File`, `spec.md > Important Failure Modes`
  Build: Download route and buttons, expired-run message, failed-row rendering, `RESET_FILE` reducer action, table ordering by delivery time for the current mode.
  Verify (mechanical): Download a `.br` and a `.zst` and decompress them with the matching tools to confirm they equal the original; request an expired run id and get the friendly message; force one job to fail in a test and confirm the others continue; `just test` and `just check` pass.
  Learner check: Download one file from the table and unpack it yourself, then click Try another file.
  Commit: `Add downloads, full results table and Try another file`

- [ ] **8. Narrator tour, hero page and final polish**
  Becomes usable: The app opens on the hero with the squeeze animation and Start, and the narrator box walks through the flow with Next and Skip tour; the look matches the flat 2013–2015 design.
  Why now: Framing last, since it depends on the finished flow it explains.
  PRD ref: `prd.md > Hero page`, `prd.md > Narrator and guided tour`, `prd.md > Look and Feel`
  Spec ref: `spec.md > Components > Frontend: Hero`, `spec.md > Components > Frontend: Narrator Box`, `spec.md > Look and Feel`
  Build: `Hero` with looping animation, `NarratorBox` tour steps, screen switch, final style pass, empty-state copy, README stub left for `6-ship`.
  Verify (mechanical): `just check` and `just test` pass; Playwright walks the full demo path (Start → sample → Run → banner flip → Weissman → download) with no console errors; screenshots reviewed.
  Learner check: Start from a fresh page load and run the one-minute demo path yourself.
  Commit: `Add hero page, narrator tour and polish`

## Hands-on Checkpoints

- [ ] Early usable behavior explored — after slice 2 (real results plus the static/dynamic flip)
- [ ] Core journey explored — after slice 5 (kernel complete: real results, banner, replay, Weissman)
- [ ] Final kick-the-tires exploration and feedback completed

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: [not started]
Route and stops: [not started]
Edit outcome: [not started]
Reflection: [not started]
Activity mode: [not started]

## Revisions
- Large-file worst case kept at current levels — measured a 24 MB log at about 175 s total (brotli 11: 86 s, xz 9: 35 s, zstd 19: 32 s), so the >8 MB hint will say it can take a few minutes rather than a minute; the lower-strong-level fallback is not needed.
- Playwright MCP could not find Chrome here, so browser checks use the Playwright library with its own Chromium from a scratch script instead.
- Added a 2-second `ping` event and a browser-side stall watchdog — behind the Vite proxy a killed server leaves the event stream hanging without any error, so "Lost connection" never showed; the benchmark now also runs in a worker thread so pings flow during slow jobs, and it stops after the current job if the browser leaves.
- Banner and table gained near-tie handling, a time-to-user column, selected-sample state and browser-column marks after early feedback (check #1) — near-ties (brotli vs zstd within about 1 ms) could flip between runs.
