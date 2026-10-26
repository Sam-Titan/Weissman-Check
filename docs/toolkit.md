# My dev toolkit (reference)

A menu of tools I know and like, not a requirements list. For any project,
use only what a proof of concept actually needs. The planning docs in
devpost/ (scope, prd, spec, checklist) always take priority over this file.

**Setup and dev utilities**

- **WSL2 (Ubuntu):** Linux inside Windows, where everything runs.
- **uv:** Python’s Rust-based installer and runner. Creates the environment, installs packages, and runs everything (`uv sync`, `uv run …`).
- **pnpm (via corepack):** Fast, disk-efficient installer and runner for the frontend’s JavaScript packages.
- **Node 24:** Runs the frontend tooling.
- **just (`Justfile`):** Modern Rust-based command runner for short commands like `just dev`, `just check`, `just test`, with automatic `.env` loading.
- **Git + GitHub:** Version control and public/private repos.
- **Lefthook + Gitleaks:** Runs linters, type checks, and secret scanning automatically on every commit so broken code or leaked `.env` keys never get pushed.
- **Claude Code:** The coding agent. In this project, progress is tracked in `devpost/` (scope, prd, spec, checklist) and the git log, so don't create a separate PROGRESS.md.

**Backend (Python)**

- **FastAPI + Uvicorn:** The web API and the server that runs it.
- **Pydantic + pydantic-settings:** Data models and validation, plus reading and validating the `.env` file.
- **httpx:** Async HTTP requests for external APIs.

**Frontend (React + TypeScript)**

- **Vite:** Dev server and build tool, which also proxies `/api` to the backend.
- **React + TypeScript:** The user interface and type safety.
- **Tailwind CSS v4 + shadcn ui + lucide-react:** Styling, ready-made components (buttons, tables, dialogs), and icons.
- **TanStack Query:** Fetches and caches backend data, and cancels outdated requests.
- **Zustand:** Shared UI state (toggles, filters, selections).
- **React Router:** Multi-page navigation.
- **react-hook-form + zod:** Forms and strict client-side validation.
- **Motion + sonner:** Animations and pop-up toast notifications.

**Glue between the two**

- **Hey API (`@hey-api/openapi-ts`) / Orval:** Turns FastAPI's `openapi.json` description into TypeScript types and ready-to-use TanStack Query hooks automatically so field names stay in sync.
- **shared/mocks/:** Holds fake data so the frontend can start before the backend routes exist.
- **.env:** Holds environment settings and API keys.

**Quality, testing and CI/CD**

- **Ruff + ty:** Rust-based Python linter, formatter (`Ruff`), and ultra-fast static type checker (`ty`).
- **Biome:** Rust-based linter and formatter for the frontend code.
- **pytest / vitest:** Backend and frontend unit tests.
- **Playwright + `@playwright/mcp`:** Automated browser and MCP server so Claude Code can visually inspect the live site, read console errors, and fix the frontend automatically without your input.
- **Lighthouse CI (`@lhci/cli`):** Runs automated performance, accessibility, and SEO audits in the terminal or GitHub Actions to make sure heavy React bundles or 3D assets don't slow down the site.
- **Locust:** Python load-testing tool to simulate concurrent users hitting the API.
- **GitHub Actions + Dependabot:** Runs all linters and tests in the cloud on every push, plus alerts for vulnerable dependencies.

**Hosting, monitoring and analytics**

- **Netlify / Cloudflare Pages:** Hosts the frontend website and forwards `/api` calls.
- **Render / Railway / AWS:** Hosts the backend API and workers.
- **PostHog:** Cookieless visitor analytics, user funnels, and session replays.
- **Logfire / Sentry:** Real-time crash reporting and performance tracing for FastAPI, LLM calls, and the frontend.

**Optional modules (plug-and-play per project)**

**Agentic AI & LLMs**

- **LangChain / LangGraph + PydanticAI:** Multi-agent workflows, state graphs, and type-safe agent functions.
- **LiteLLM:** Unified wrapper to call Claude, Gemini, OpenAI, or Groq using the same code.
- **FlashRank:** Free, local 4MB ONNX reranker (runs on CPU with zero API costs) to boost RAG search accuracy.
- **Docling / MarkItDown:** Converts complex PDFs, tables, and docs into clean, LLM-ready Markdown locally.
- **Crawl4AI:** Free, local Playwright-based web scraper that turns any URL into clean Markdown for agents.
- **Promptfoo / Braintrust:** Tests and evaluates prompts across dozens of test cases to catch hallucinations.

**Database, vectors and background jobs**

- **SQLModel + Alembic:** Combines Pydantic and SQLAlchemy for database tables, plus safe schema migrations (`Alembic`) when columns change.
- **SQLite (Local) / Supabase or Neon Postgres (Cloud):** Local file database for quick dev, and free cloud PostgreSQL that persists across Render/Railway rebuilds.
- **pgvector / ChromaDB:** `pgvector` stores embeddings permanently inside cloud Postgres so vectors never wipe on server restarts; `ChromaDB` for quick local prototyping.
- **Redis + ARQ / Taskiq:** Caching layer and background task queues for running slow LLM workflows or heavy 3D processing without freezing FastAPI.

**Auth and security**

- **Clerk / Supabase Auth:** Drop-in user logins, OAuth (Google/GitHub), and JWT session management.
- **SlowAPI:** Rate-limiting for FastAPI routes so bots cannot spam expensive endpoints.

**3D graphics and spatial processing**

- **three.js:** 3D graphics in the browser.
- **React Three Fiber + drei + postprocessing:** Uses `three.js` from React; camera controls, labels, and outline glow.
- **r3f-perf:** Monitors FPS, GPU memory, and draw calls inside the 3D scene during development.
- **trimesh + fast-simplification:** Python tools to build, clean, and shrink heavy 3D meshes.
- **gltf-transform + gltfjsx:** Compresses `.glb` files by 70–90% (Draco/Meshopt + WebP) and turns them into reusable React components.

**Containerization**

- **Docker / Docker Compose:** Packages the whole app (frontend, backend, Redis, DB) so it runs anywhere with one command.
- **Caddy:** Modern 4-line web server (replaces `nginx`) that serves the website inside Docker, forwards `/api` calls, and handles automatic HTTPS.