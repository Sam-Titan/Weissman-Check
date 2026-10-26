---
doc: prd
status: approved
---

# Weissman Check — Product Requirements

A web app where developers upload a text-like file, run it through six real lossless compressors (each at a fast and a strong setting), and see which one to ship and why.
Source: `scope.md > The Unique Kernel`, `scope.md > The Core Loop`, `scope.md > The POC Boundary`.

## The Core Journey
1. **Arrive.** The visitor lands on a simple hero: a looping animation of a block of text squeezing into a smaller block, and a **Start** button. (`scope.md > The Core Loop` step 1)
2. **Enter the app.** Start opens the compressor page. The narrator box begins a guided tour (Next / Skip tour).
3. **Give it a file.** The visitor drags a text-like file into the dropbox, or clicks one of three sample buttons (JSON API response, server log, minified JS).
4. **Choose what to compare.** In the compressor carousel, each compressor card has an include checkbox. All six are included by default. The card being read in the carousel is separate from which ones are included.
5. **Run.** The visitor clicks Run. The real benchmark runs, and a simplified LZ-style replay of the file starts alongside it.
6. **Watch.** A 12-segment progress bar fills as each (compressor × setting) run finishes. The replay sweeps the text and highlights repeats.
7. **See the answer.** When the benchmark finishes, the left half automatically becomes the results: a recommendation banner first, then a results table, then the Weissman "break it" control.
8. **Act.** The visitor flips static/dynamic on the banner, downloads any compressed file from the table, plays with the Weissman control, or clicks **Try another file**.

Success: in a one-minute demo, someone goes from the hero to a "ship this one" answer on their own file, and has seen why it compressed the way it did. (`scope.md > What "Working" Looks Like`)

## Screens and Layout
Two surfaces: the hero page and the compressor page. There is no nav bar and there are no extra pages. The libraries and metrics pages were cut, and their content moved into narration cards and "?" tooltips.

### Hero page
- One looping animation (text block squeezing into a smaller block), the app name, and a Start button.

### Compressor page — before a run
- **Left half:** the dropbox, a rectangle with drag-and-drop text and three sample buttons.
- **Right half, top (square card):** "How compressors see your file". Before Run it shows a preview of the file's text with nothing highlighted. Before any file is added it shows a short intro from the narrator.
- **Right half, below the card:** the metrics box. Before any run it lists the metric names greyed out, each with a "?" tooltip.
- **Above the right column:** the compressor carousel, with one card per compressor and an include checkbox on each.
- **Under the carousel:** a narration card that changes to explain the compressor being read.
- **Narrator box:** the guided tour. It steps through the flow with Next and Skip tour.

### Compressor page — during a run
- The dropbox area shows the segmented progress bar (12 segments, one per compressor × setting). Each segment fills in its compressor's colour as that run finishes.
- The replay card animates. Its Stop and Restart controls apply to the replay only.

### Compressor page — after a run
- **Left half:** switches automatically from the dropbox to the results. A **Try another file** button brings the dropbox back.
- **Right half:** the replay card becomes a tall rectangle and keeps its replay, with Stop/Restart. The metrics box is replaced by the results table on the left.
- **Results content, top to bottom:**
  1. The recommendation banner (a fixed-height block, with the static/dynamic toggle on it). When every option reaches a user within 1 ms of the best, it says "Too small to matter" and shows no pick.
  2. The results table.
  3. The Weissman "break it" control, inside the Weissman gauge on the scorecard (default time unit: milliseconds).
- The results below the banner are three tabs: a **scorecard** (default), the table, and the delivery time chart. The scorecard has a row of compressor chips and one semicircle gauge each for time to user, saved, decompress speed, the file's entropy and the Weissman score, with coloured zones and a tick for where gzip level 6 lands. Selecting a chip or a table row changes every gauge.
- A **delivery time chart** (stacked compress / transfer / decompress bars per run) sits in a tab next to the results table and follows the static/dynamic toggle.

## Look and Feel
Established by the learner:
- **Era and mood:** retro 90s file-archiver desktop (revised after the learner found the flat look too plain): bright, playful, chunky. Windows with coloured title bars, pixel-font titles, buttons that press down.
- **Surfaces:** bright sky-blue dotted desktop, white windows with 2px dark ink borders and a hard offset shadow (no blur, no gradients).
- **Accent colour:** sunny yellow for primary buttons and the verdict window, with pink, green, orange and violet title bars.
- **Compressor colours:** each compressor has its own bright colour, used consistently everywhere (carousel card, progress segments, table rows, replay highlights). Examples: gzip blue, brotli orange, zstd teal, lz4 yellow, xz purple, bzip2 pink.
- **Fonts:** Silkscreen (pixel) for titles, Space Grotesk for the UI, Source Code Pro for numbers and file text.
- **Flair:** one moment of flair, the segmented progress bar.
- **Avoid:** generic AI-app styling, dark mode by default, any *Silicon Valley* branding (`scope.md > Inspiration & Identity`).

## Features and Behavior

### Narrator and guided tour
The narrator box is the walkthrough. It steps through the flow (drop a file, choose compressors, run, read the results) with Next and **Skip tour** buttons. The user can also ignore it and explore.
- [ ] On first arrival at the compressor page the narrator box shows step 1 with Next and Skip tour.
- [ ] Next advances through the steps, and Skip tour dismisses the tour while leaving the app fully usable.
- [ ] The narrator's intro text is also what the replay card shows before any file is added.

### File input
- [ ] A text-like file (JSON, CSV, logs, code, HTML) can be dropped or chosen and appears as a text preview in the replay card.
- [ ] The three sample buttons (JSON API response, server log, minified JS) each load a ready-made file in one click.
- [ ] After a file is accepted, a file chip shows its name, size, and an entropy verdict in plain English, such as "Highly repetitive, worth compressing" or "Already dense, little to gain".
- [ ] The entropy verdict has a "?" tooltip explaining what it means.

### Compressor carousel, selection and narration cards
Six compressors: gzip, brotli, zstd, lz4, xz, bzip2. Each is run at a fast and a strong setting.
- [ ] The carousel shows six cards in their own colours, each with an include checkbox, all checked by default.
- [ ] Reading a card (via the carousel) updates the narration card below it. Reading does not change which compressors are included.
- [ ] For gzip, brotli, zstd and lz4, the narration explains how that compressor uses repeated strings (the LZ-style idea).
- [ ] For xz and bzip2, the narration explains their different approach in words only. The replay is not claimed to apply to them.
- [ ] Unchecking a compressor removes it from the run and the results.
- [ ] If none is checked, Run is disabled with the hint "Pick at least one compressor."

### The benchmark and progress bar
- [ ] Clicking Run starts a real benchmark of every included compressor at both settings on the user's actual file.
- [ ] The progress bar has 12 segments, one per compressor × setting. Segments for unchecked compressors are shown as skipped.
- [ ] Each segment fills in its compressor's colour as that run finishes.
- [ ] The metrics box on the right shows live values during the run and fills in as each segment finishes. After the run, the results table on the left replaces it.

### Replay card — "How compressors see your file"
- [ ] The replay is labelled "How LZ-style compressors see your file (simplified replay)".
- [ ] It is computed from the user's real file contents. A cursor sweeps through the text, and each repeated string lights up when found.
- [ ] Each highlight is labelled with its length and where it first appeared (for example "repeat of 14 chars from 120 back").
- [ ] A "bytes saved so far" counter climbs as the replay proceeds.
- [ ] Stop pauses the replay and Restart replays it from the beginning. Neither affects the benchmark.
- [ ] The replay starts when Run is clicked, alongside the benchmark. Before Run, only the plain text preview is shown.

### Results: recommendation banner
"Best" means the shortest time to get the file to a user at an assumed network speed (for example 4G), and that assumed speed is stated on the banner.
- **Static** (compressed once): time = transfer + decompression. Compression time is ignored.
- **Dynamic** (compressed on every request): time = compression + transfer + decompression.
- [ ] The first thing in the results is a one-line banner such as "Ship brotli (strong) for static assets: 78% smaller, decompresses at 410 MB/s", naming the compressor, setting, savings and decompression speed, and stating the assumed network speed.
- [ ] A static/dynamic toggle sits on the banner, using the two formulas above.
- [ ] Flipping the toggle updates the banner on screen, and the winner can change because compression time counts only in dynamic mode.
- [ ] Only gzip, brotli and zstd can be decompressed by browsers. If the overall winner is lz4, xz or bzip2, the banner shows both, for example "Fastest to deliver overall: xz (strong). Best for browsers: brotli (strong)."

### Results: table
- [ ] One row per compressor × setting that ran, in the compressor's colour.
- [ ] Columns: size, % saved, compress speed, decompress speed, Weissman score, and a download button.
- [ ] The table marks which compressors are browser-supported (gzip, brotli, zstd).
- [ ] Each metric heading has a "?" tooltip explaining it in plain English.
- [ ] Each download button downloads that row's real compressed file.
- [ ] A row for a failed run shows "failed". The other rows are unaffected.

### Results: Weissman "break it" control
- [ ] The default baseline for the Weissman score is gzip level 6.
- [ ] The user can change the time unit or the baseline used in the Weissman score, and the score column and ranking update on screen.
- [ ] A short note explains that any single score can mislead and what the control just changed.

### Try another file
- [ ] The button returns to the dropbox state (replay card back to a plain preview or intro, results cleared). Compressor selections are kept.

## States and Boundaries
- **First use (before any file):** the dropbox with drag-and-drop text and three sample buttons. The replay card shows the narrator's intro. The metrics box lists the metric names greyed out, each with a "?" tooltip.
- **Binary or image file:** a friendly message, "Weissman Check handles text-like files for now (JSON, CSV, logs, code, HTML). Images and video are coming later." The run is not started.
- **File over 25 MB:** rejected before upload, with the limit stated.
- **Empty file:** "This file is empty, nothing to squeeze."
- **No compressors selected:** Run is disabled, with the hint "Pick at least one compressor."
- **One compressor fails mid-run:** its row shows "failed" and the others continue.
- **Run in progress:** the progress bar and replay are active. Run is not available again until the run finishes.
- **Run finished:** results replace the dropbox automatically, and the replay card becomes a tall rectangle that keeps replaying.
- **Refresh:** everything is gone. There is no saved state and there are no accounts, by design for the proof of concept.

## Product Decisions
- Cut the libraries page and metrics page. Their content moves to narration cards (when a compressor is read in the carousel) and "?" tooltips on metrics, so the app stays one flow.
- The guided walkthrough merges into the single narrator box, with Next and Skip tour, so there is one place that explains things.
- The welcome page is a simple hero with one animation and a Start button, which keeps it small.
- The replay is a simplified LZ-style pass computed from the real file, labelled as a simplified replay. The real benchmark runs separately. This keeps the explanation honest (`scope.md > Explicitly Cut`).
- "Best" is the shortest time to get the file to a user at an assumed network speed (stated on the banner). Static counts transfer + decompression; dynamic adds compression. This is what makes the winner flip with the toggle.
- Browser support is part of the recommendation: only gzip, brotli and zstd work in browsers, so the banner shows both the overall winner and the best browser-supported one when they differ.
- The file chip shows an entropy verdict in plain English, so users learn up front whether the file is worth compressing.
- The Weissman baseline is gzip level 6.
- The progress bar is real and segmented, 12 segments, and is the one moment of flair.
- The left half switches to results automatically when the run finishes, not after a download. The user can try another file from there.
- Carousel reading and inclusion are separate: the carousel is for learning, and the checkboxes pick what to compare.
- Nothing persists. A refresh starts fresh, which is acceptable for the proof of concept.
- A bright, retro file-archiver look with per-compressor colours used consistently everywhere.

## What We're Building
- Hero page with a looping squeeze animation and a Start button.
- Compressor page with a dropbox, three sample files, a text preview, and the narrator-led guided tour (Next / Skip tour).
- Compressor carousel with six cards, include checkboxes, and a narration card per compressor.
- Real benchmark of gzip, brotli, zstd, lz4, xz and bzip2, each at fast and strong, with the 12-segment progress bar.
- Replay card with repeat highlights, labels, a bytes-saved counter, and Stop/Restart.
- Results: recommendation banner with static/dynamic toggle, a scorecard of gauges, a delivery time chart showing where the time goes, results table with per-row download, "?" tooltips on metrics, and the Weissman "break it" control.
- The empty and error states above, and Try another file.
- The bright, retro file-archiver look.

## Deferred From the POC
- Separate libraries and metrics pages: content already lives in narration cards and tooltips.
- Avatar animation: extra animation work that doesn't prove the idea.
- Per-compressor custom visualizations: the single shared replay is enough to show the kernel.
- Images and video: already-compressed formats with small lossless gains, and harder to visualize.
- Non-developer audience: the proof of concept targets developers.
- Deployment: optional for the hackathon.

## Possible Later Enhancements
- A live "how it works" visualization specific to each compressor (Huffman trees for gzip, context models for brotli, and so on).
- Saving or sharing a result link.
- Optional dark theme.

## Non-Goals
- No solo mode. Every run is a comparison.
- No *Silicon Valley* branding (logos, names or imagery), to keep the look original.
- No claim that the replay is the compressors' live internal state. It is a labelled explanation.
- No accounts, saved history, or server-side storage of uploaded files.
- No binary, image or video input.

## Open Questions
- Which other Weissman time units and baselines to offer besides the gzip level 6 default. *Assumption: a small set of two or three of each. Can be settled in `4-spec`.*
- Exact wording and the "fast"/"strong" level for each compressor, the assumed network speed value, and the entropy verdict thresholds. *Can wait for `4-spec`.*
- Where the tall replay rectangle's text goes when the file is large. *Assumption: it scrolls or shows the first portion. Can wait for `4-spec`.*
