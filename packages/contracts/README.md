# @qrp/contracts

TypeScript types and Zod schemas for the QRP API contract.

**These files are GENERATED, not hand-edited** (ADR-0001 / RECON-1). The backend Pydantic models in
`services/api` are authoritative: they emit `openapi.json`, from which the TS types + Zod schemas here
are generated and committed. CI checks them for staleness. To change the contract, edit the Pydantic
models and regenerate — never edit generated output by hand.

Regenerate with `python scripts/generate_contracts.py` from the repo root. It writes `openapi.json`
(the raw schema) and `src/generated.ts` (TS interfaces + Zod schemas); `src/index.ts` re-exports it.
CI runs the same script and fails the build on `git diff` (.github/workflows/ci.yml).
