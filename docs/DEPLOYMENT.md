# Deployment

## What is deployed

The **frontend only**, as a static site on GitHub Pages:

- **Live:** https://tss99.github.io/quantum-reliability-platform/
- **Source:** `apps/web`, built by `.github/workflows/pages.yml` on every push to `main`.

The FastAPI backend is **deliberately not deployed**. GitHub Pages is a static host and is not
intended to run a commercial SaaS or handle sensitive transactions (MISSION §48). The prototype is
fully client-side; the backend exists for local development and future hosting.

## How the Pages deploy works

1. Push to `main` triggers `Deploy Pages`.
2. `build` job: `npm ci` → `typecheck` → `vite build` with `VITE_BASE_PATH=/quantum-reliability-platform/`.
3. The `dist/` artifact is uploaded and published by `actions/deploy-pages`.

Two details that matter:

- **Base path.** Vite's `base` is parameterised via `VITE_BASE_PATH`; if the repository is renamed,
  change that one env value in `pages.yml` — nothing in the source hard-codes the path.
- **Routing.** The app uses **HashRouter** (`createRouter()` factory). A static host has no rewrite
  rule, so `BrowserRouter` deep links would 404 on refresh. `VITE_ROUTER_MODE=browser` switches to
  BrowserRouter for a future host that can rewrite, without forking the route table.
  *Consequence:* in-page anchors (`href="#section"`) must never be used — they collide with the
  router hash. Scroll programmatically instead (there is an E2E regression test for this).

## CI gates

`.github/workflows/ci.yml` runs three independent jobs:

| Job | Runs |
|---|---|
| `web` | `npm ci`, `typecheck`, `vitest`, `vite build` |
| `api` | `pip install -e ".[dev]"`, `ruff check`, `pytest` |
| `security` | gitleaks, `npm audit --audit-level=high`, `pip-audit` |

The Pages deploy depends on the **frontend** build only — a backend lint failure must not block
shipping a static site that does not contain the backend.

**Version pinning matters here.** Two real CI failures came from local/CI drift:
- Node must be **≥ 22** (`jsdom@30` requires it; Node 20 crashed the Vitest workers).
- `ruff` is **pinned** (`ruff==0.15.2`) with an explicit rule selection, so lint behaves identically
  locally and in CI.

## Running locally

```bash
# Frontend
cd apps/web && npm ci
npm run dev                 # http://localhost:5173
npm run build && npm run preview

# Backend
cd services/api && pip install -e ".[dev]"
uvicorn app.main:app --reload      # http://127.0.0.1:8000
#   /docs      interactive OpenAPI
#   /health    liveness
```

QEC simulation endpoints additionally need `pip install stim pymatching`; without them
`/api/v1/qec/simulate` returns **503** with an actionable message rather than failing obscurely.

## Regenerating the QEC fixture grid

```bash
cd services/api && python scripts/generate_qec_fixtures.py
```

Runs the real simulator through the same service layer the API uses, writing `demo-data/qec/`
(≤ 200 KB, enforced). Deterministic for the pinned library versions and platform.

## Secrets

There are none, by design. No API keys, tokens or credentials exist in the repository or the built
bundle; `.env` is gitignored and `.env.example` holds placeholders only. CI scans the repo
(gitleaks) and the release checklist scans the built `dist/`. Real provider credentials, when
adapters are implemented, must live server-side only — never in the browser bundle (MISSION §44).
