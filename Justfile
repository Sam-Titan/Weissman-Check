set shell := ["bash", "-cu"]

setup:
    uv sync
    cd frontend && pnpm install

dev:
    #!/usr/bin/env bash
    trap 'kill 0' EXIT
    uv run uvicorn backend.app.main:app --port 8000 --reload &
    (cd frontend && pnpm dev) &
    wait

test:
    uv run pytest

check:
    uv run ruff check .
    uv run ruff format --check .
    cd frontend && pnpm exec tsc --noEmit
