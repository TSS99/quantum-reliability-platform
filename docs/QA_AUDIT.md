# Phase 9 — QA & Security Audit

Verification of the built prototype. All checks below were run against `main` and pass.

## Automated tests
| Suite | Result |
|---|---|
| Backend `pytest` (schemas, invariants I-1..12, deterministic IDs, QEM, QEC, optimizer, §46 scientific invariants) | **132 passed** |
| Frontend Vitest (shell, primitives, ExplainedScore, a11y baseline) | **14 passed** |
| Playwright E2E — Flows A–D + landing (headless Chromium) | **5 passed** |
| `npm audit --audit-level=high` | **0 vulnerabilities** |
| `ruff` (backend) | clean |

## E2E flows (§45)
- **Flow A** — landing → Launch Reliability Lab → Overview → New Analysis → change priority → a
  RUN / RUN-WITH-WARNING / DO-NOT-RUN verdict renders.
- **Flow B** — QEC Lab → change noise model → threshold plot (role="img") re-renders; "Simulated" badge present.
- **Flow C** — Hardware → calibration drift section visible with a non-stable validity state.
- **Flow D** — all 9 routes in the IA reachable under HashRouter; nav + a heading render on each.

## Accessibility (§42)
- Every page exposes a heading; every chart is `role="img"` with a required text `summary` (no blank
  SVG for non-visual users); every button/link has an accessible name; the target-error control is a
  labelled `slider`. Semantic states carry colour **+ icon + shape + text** (never colour alone).
  Theme toggle and focus rings verified; `prefers-reduced-motion` honoured globally.

## Security (§44, RECON-29..32)
- **No secret shapes** in the built `dist/` bundle; **no `VITE_*` secret-named vars** in source.
- **Meta CSP** present and enforced in the built HTML (`script-src 'self'`, `object-src 'none'`, …).
- `.env` is **not tracked**; `.env.example` holds placeholders only.
- `gitleaks` + `npm audit` + `pip-audit` run in CI (`.github/workflows/ci.yml`).
- The prototype is fully client-side/simulated: no credentials, no server calls, no PII collected.

## Scientific sanity (§46)
Covered by backend invariant tests: overhead ≥ 1 (shot multiplier), cost ≥ 0, confidence ∈ [0,1],
`rmse == sqrt(bias² + std²)`, infeasible plans are never scored or recommended, demo-replay receipts
have null actuals, QEC zero-noise/insufficient-statistics/impossible-config handling.

## Known limitations / deferred
- Full provider REST endpoints + DemoProvider (Python) not wired — the Pages prototype is client-side,
  so this is local-dev/future only.
- Playwright browser install runs in CI; no P0/P1 issues outstanding.
