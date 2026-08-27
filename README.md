# Quantum Reliability Platform (QRP)

> Reliability intelligence for quantum workloads — analyze the circuit, evaluate the hardware,
> choose an error-management strategy, estimate the cost, and verify whether it helped.

**Status: bootstrap.** This repository is under active multi-agent construction. See
[`docs/MISSION.md`](docs/MISSION.md) for the full product/engineering mandate and
[`docs/DECISIONS.md`](docs/DECISIONS.md) for architecture decisions as they are made.

QRP is a hardware-independent **reliability control plane** for quantum computing, spanning
error suppression → mitigation → detection → correction. The first public deployment is a
**static interactive prototype on GitHub Pages** (demo data / local computation only, no secrets),
with a genuine FastAPI backend designed in-repo for local development and future deployment.

## What works today
_To be filled in as phases complete. See [`docs/DEMO_VS_REAL.md`](docs/DEMO_VS_REAL.md)._

## Repository layout
- `apps/web/` — React + TypeScript + Vite frontend (the deployable prototype)
- `services/api/` — FastAPI backend (local dev / future deployment)
- `packages/contracts/` — shared API/domain contracts
- `demo-data/` — deterministic, seeded demo datasets
- `docs/` — product, architecture, scientific, and process documentation

## Getting started
_Setup instructions added by the Release agent in Phase 0/10._
