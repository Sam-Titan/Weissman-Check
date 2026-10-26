---
doc: scope
status: approved
---

# Weissman Check

*…and the numbers that actually matter.*

A web app where developers upload a text-like file, run it through six real lossless compressors, and see which one to ship, with an explanation of why.

## The Unique Kernel
Seeing why, not just which. After the real benchmark runs, the app shows a real analysis of the user's own file (the repeated strings an LZ-style compressor would exploit) with plain-English narration cards for each algorithm. It is labelled as an explanation, not live compressor internals. Beside that sits a practical answer: which compressor should I ship, and does the single score (Weissman) mislead?

## Who It's For
Developers only: web and backend developers choosing a compression library or tool for their own data (API responses, static assets, logs, backups), who default to gzip today.

## The Core Loop
1. Open the app. A static narrator box explains what it does and how to use it.
2. Upload a text-like file and select which compressors to compare.
3. The real benchmark runs, with a progress bar and a metrics card.
4. See the results: final metrics including the Weissman score, a side-by-side comparison, and a shared visualization of the file's repeated strings with six narration cards.
5. Get a recommendation that accounts for compress-once (static) versus compress-per-request (dynamic).

## Inspiration & Identity
Its own retro-startup look, with no show branding (no logos, names or imagery from *Silicon Valley*). The Weissman score appears as a metric, nodding to the show. Nostalgic, easy to understand, impressive UI/UX.

## Why This Matters to the Learner
Wants to learn to work efficiently with an AI agent, and to learn how lossless compression works and how compressors are scored. Likes bringing something from fiction into reality. Wants something other developers actually use.

## What "Working" Looks Like
In a one-minute demo, someone opens the app, reads the narrator box, uploads a text-like file, selects compressors and runs the benchmark. They see the metrics and Weissman scores, then the shared visualization of repeated strings in their file with a narration card for each algorithm. The "oh, that's cool" beat is seeing why the file compressed the way it did, then getting a clear "ship this one" answer.

## The POC Boundary
- Text-like files only (logs, JSON, source, plain text).
- Six compressors: gzip, brotli, zstd, lz4, xz, bzip2, each at a fast and a strong setting, selectable by the user.
- Compare mode only (the user picks which compressors to compare).
- Real benchmark first; metrics card and final metrics including the Weissman score.
- One shared visualization: a real analysis of the user's file showing the repeated strings an LZ-style compressor would exploit, computed after the benchmark and labelled as an explanation.
- Six narration cards, one per algorithm. For bzip2 and xz, narration only (the shared LZ-style visualization does not apply).
- A recommendation that accounts for compress-once versus per-request.
- A static narrator box that explains the app and how to use it.
- Own retro-startup look.

## Later
- Per-algorithm custom visualizations.
- Avatar animation.
- Images and video (already-compressed formats; small lossless gains and harder to visualize).
- Non-developer audience (curious non-programmers).
- Deployment (optional for the hackathon).

## Explicitly Cut
- Solo mode: every run is a comparison; a single compressor is just a comparison of one.
- Show branding: no *Silicon Valley* logos, names or imagery, to keep the look our own.
- Claiming to show live compressor internals: the visualization is an analysis of the file, not the compressors' actual working state.
