# Weissman Check

Upload a text-like file, run it through six real lossless compressors (gzip, brotli, zstd, lz4, xz, bzip2) at a fast and a strong setting, and see which one to ship and why.

## Run it

Needs [uv](https://docs.astral.sh/uv/), [pnpm](https://pnpm.io/) (Node 24) and [just](https://just.systems/).

```bash
just setup   # once: uv sync + pnpm install
just dev     # FastAPI on :8000, Vite on :5173
just test    # backend tests (pytest)
```

Then open <http://localhost:5173>.

`just check` runs Ruff and the TypeScript type check.

## About this repo

- Planned and built with the Devpost Learn skill pack. The planning documents (scope, PRD, spec, build checklist and app map) are in `devpost/`.
- `docs/toolkit.md` is my personal tooling reference, reused across projects; it isn't project code.
