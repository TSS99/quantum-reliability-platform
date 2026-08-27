# Architecture Decision Record (ADR)

Append-only log. Each entry: date · decision · rationale · status. Michael owns Phase-0 entries;
the Architect owns architecture entries from Phase 1 onward.

---

## ADR-0001 — 2026-08-27 — Repository location & name
**Decision:** The product lives in its own git repo at `qrp/` (a subdirectory of the hive-containing
folder `D:\CDAC Projects\Error_mitegation_Correction_Platform`), separate from the hive machinery
(`hive/`, `roster.json`). Local folder is short (`qrp`) to stay clear of Windows MAX_PATH limits;
`core.longpaths` is enabled. The public GitHub repository name (which sets the Vite Pages base path)
is decided at release time, default `quantum-reliability-platform`.
**Rationale:** Hive logs/agents must not be versioned into the product repo. Isolated agent worktrees
branch off this repo. Short path avoids deep `node_modules` path-length failures on Windows.
**Status:** Accepted.

## ADR-0002 — 2026-08-27 — Model roster resolution
**Decision:** Use the model slugs proven available in the existing hive roster: `Opus 5`, `Sonnet 5`,
`Haiku 4.5`, `GPT-5.6 sol`, `GPT-5.6 terra` (and `Opus 4.8 [1M]` for large-context work). These map
1:1 onto the mission's requested models (Claude Opus 5 / Sonnet 5 / Haiku 4.5, GPT-5.6 Sol / Terra).
**Rationale:** These strings launched real agents in this environment already; no separate model-list
API is exposed.
**Status:** Accepted.

## ADR-0003 — 2026-08-27 — Skills strategy (plugins not installed)
**Decision:** Karpathy principles and the design/scientific mandates are baked directly into each
agent's dispatch and into `docs/MISSION.md` (§1, §35–42), independent of plugin availability.
`ui-ux-pro-max` is available as a local skill and UX/Frontend agents invoke it. Installing
`frontend-design` (anthropics/claude-code) and `superpowers` (obra/superpowers) plugins is a separate,
non-blocking track; if an install needs a human decision it is raised, not silently skipped.
**Rationale:** No plugins are installed in this environment; the mission explicitly says not to depend
solely on a plugin for the Karpathy rules.
**Status:** Accepted.

## ADR-0004 — 2026-08-27 — Fresh roster, not repurposed trading agents
**Decision:** Spawn a fresh, correctly-modeled QRP roster rather than re-task the 21 idle
trading-themed agents already on the floor.
**Rationale:** Those agents' identities/goals are algorithmic-trading specific and several run models
mismatched to QRP roles; re-tasking would be error-prone and confusing.
**Status:** Accepted.

## ADR-0005 — 2026-08-27 — Image generation fallback
**Decision:** No OpenAI/ChatGPT image-generation tool is confirmed connected. Per MISSION §11/§68, the
Visuals agent writes precise image briefs to `docs/image-prompts/` with clearly-labeled placeholders
and must NOT substitute Claude-generated raster imagery. Programmatic SVG (charts, diagrams, circuit
drawings, coupling maps) is preferred and unrestricted.
**Rationale:** Mission forbids Claude raster imagery and provides an explicit brief+placeholder
fallback. Functional SVG visualizations cover most real needs.
**Status:** Accepted.

## ADR-0006 — 2026-08-27 — Use canonical model IDs, not friendly names; auth is subscription (no API)
**Decision:** Spawn-requests for Claude agents must use canonical model IDs, not friendly display
names: `claude-opus-5` (was "Opus 5"), `claude-sonnet-5` (was "Sonnet 5"),
`claude-haiku-4-5-20251001` (was "Haiku 4.5"). Codex agents keep their provider slugs
(`GPT-5.6 sol` / `GPT-5.6 terra`).
**Rationale:** The friendly string "Opus 5" did not resolve at launch, so the Security worker (and the
other Claude workers) fell back to a default model — the reported "can't select Opus 5". Three Claude
workers then tripped the circuit breaker. The environment's canonical Opus 5 ID is `claude-opus-5`.
**Auth:** Verified `ANTHROPIC_API_KEY` is NOT set; Claude auth is `authMethod: claude.ai`,
`apiProvider: firstParty` (subscription login `tilock.2025@gmail.com`). Claude agents already run on the
user's direct subscription access, NOT metered API. Codex agents use the `codex` CLI login (ensure it is
the user's ChatGPT/subscription login, not an OpenAI API key).
**Apply:** corrected spawn-requests re-issued (`claude-opus-5`/`claude-sonnet-5`). Running wrong-model
workers must be stopped/restarted (operator) to respawn on the corrected model.
**Status:** Accepted.

## ADR-0007 — 2026-08-27 — Whole floor on Claude subscription (drop codex/OpenAI)
**Decision:** Per user direction, ALL agents run on the user's Claude subscription — no codex/OpenAI,
no metered API. The 6 roles originally allocated to GPT-5.6 (codex) are reassigned to Claude:
Architect → `claude-opus-5`, QEM Sci → `claude-opus-5`, Optimizer → `claude-sonnet-5`,
Backend → `claude-sonnet-5`, QA → `claude-sonnet-5`, Visuals → `claude-sonnet-5`. Tiering:
reasoning-critical (Architect, QEM/QEC Sci, UX Director, Security) = Opus 5; implementation
(Optimizer, Backend, Frontend, QA, Release, Visuals) = Sonnet 5; ad-hoc mechanical =
`claude-haiku-4-5-20251001`. Opus roles may escalate hard sub-problems via god.
**Rationale:** User has direct subscription access to the Claude models and wants zero API/OpenAI
usage. Supersedes the cross-provider diversity intent of MISSION §5/§6. Visuals stays bound by the
no-Claude-raster-imagery rule (briefs + programmatic SVG only).
**Status:** Accepted. Supersedes provider choices in MISSION §5/§6 and the per-agent prose in
AGENT_ROSTER.md (the allocation table is authoritative).

## ADR-0008 — 2026-08-27 — REVERT ADR-0007; keep original cross-provider plan
**Decision:** Revert the all-Claude conversion (ADR-0007). Restore the original MISSION §5–§6 model
allocation: Architect/QEM/Backend/QA/Visuals = `GPT-5.6 sol` (codex), Optimizer = `GPT-5.6 terra`
(codex); QEC/UX/Security = `claude-opus-5`, Frontend/Release = `claude-sonnet-5`.
**Rationale:** There was NO confirmed defect in the ChatGPT/codex models. codex is installed (0.146.0)
and logged in via `~/.codex/auth.json` with NO `OPENAI_API_KEY`, i.e. it runs on the user's ChatGPT
subscription — the "no metered API" requirement was already satisfied for codex. The only real bug was
the Claude friendly-name model id (fixed in ADR-0006). ADR-0007's swap to Claude was an over-correction
off a mis-scoped "yes"; the user wants the ChatGPT models kept.
**Open caveat:** codex model strings "GPT-5.6 sol/terra" are the environment's friendly names (the
trading roster used them and codex agents spawned with them). If a codex agent shows a model-resolution
failure like the Claude one did, god finds the exact codex slug then.
**Status:** Accepted. ADR-0007 superseded. ADR-0006 (canonical Claude IDs + subscription auth) STANDS.

## ADR-0009 — 2026-08-27 — Codex model slug is `gpt-5.6` (friendly "GPT-5.6 Sol/Terra" is invalid)
**Decision:** Codex agents use model `gpt-5.6`. The friendly names "GPT-5.6 sol/terra" do NOT resolve —
codex exited on launch, so every codex agent spawned and archived within ~2s with NO session, NO memory,
NO output (verified: only Claude workers ever appear in the session log). Tested `codex exec -m gpt-5.6`
and `-m gpt-5.5` directly — both return OK (exit 0). "sol/terra" are flavor labels with no distinct
model; `gpt-5.6` is the correct slug (config default is `gpt-5.5`, also valid).
**Applies to:** architect, qem-sci, optimizer, backend, qa, visuals (all codex). Same bug class as the
Claude friendly-name issue (ADR-0006).
**Status:** Accepted.

## ADR-0010 — 2026-08-27 — Codex non-functional here; all 6 codex roles → Claude (user-approved)
**Decision:** Move all 6 codex-plan roles to Claude: Architect → `claude-opus-5`, QEM Sci →
`claude-opus-5`, Optimizer → `claude-sonnet-5`, Backend → `claude-sonnet-5`, QA → `claude-sonnet-5`,
Visuals → `claude-sonnet-5` (Visuals keeps the no-Claude-raster rule: briefs + SVG only). Whole floor is
now Claude.
**Evidence (definitive):** codex workers spawn and self-archive within ~2–8s with NO session, empty
memory, empty outbox — across crowded AND empty floors, incl. a solo controlled test (worker-architect
alone → died). `codex exec -m gpt-5.6` works when invoked directly, so the model/login is fine; the
Munder Difflin app's codex worker integration does not establish sessions. Claude workers run normally —
`worker-security` and `worker-ux-director` delivered full Phase-1 reviews; `worker-qec-sci` ran once the
floor cleared.
**Decision authority:** user chose "Run them on Claude" via AskUserQuestion (deliberate, not an
ambiguous yes). Supersedes ADR-0008; re-affirms the substance of ADR-0007.
**Also:** the floor caps concurrent worker sessions low (~3) — spawn in small batches, not all at once.
**Status:** Accepted.

## ADR-0011 — 2026-08-27 — `Quantity` envelope wraps modelled numbers, not structural integers
**Decision:** RECON-3's `{value, unit, provenance, method_ref}` envelope applies to every **physical or
estimated** number crossing the API (error rates, times, money, expectation values, overheads). It does
**not** apply to **exact structural integers** read off the input with no modelling step: `qubit_count`,
`depth`, gate counts, `distance`, `rounds`, `shots`, `seed`, list lengths. Those stay plain `int`.
Rule of thumb: *if the number could have been different under a different model, it is a `Quantity`.*
**Rationale:** A literal reading of "every numeric quantity" would attach four fields to every integer —
`"depth": {"value": 12, "unit": "count", "provenance": "measured", "method_ref": "..."}` — tripling
payload size, and, worse, implying a provenance *decision* was made where none exists. Provenance is the
honesty mechanism (RECON-4 generates `DEMO_VS_REAL.md` from it); diluting it across trivially exact
integers weakens the signal it carries.
**Consequence:** the shared validator (invariants I-1..I-3) checks units only on `Quantity` fields;
structural integers get plain range validation (`>= 0`).
**Status:** Accepted (god confirmed at integration 2026-08-27).

## ADR-0012 — 2026-08-27 — `POST /api/v1/experiments` added to the §50 endpoint list
**Decision:** Add `POST /api/v1/experiments` (execute an `ExecutionPlan` → `ExperimentRun`, returning the
`receipt_id`). `execution_mode: "hardware"` returns `501` in V1.
**Rationale:** §50 lists `GET /experiments`, `GET /experiments/{id}` and `GET /receipts/{id}` but no way
to *create* a run, while Flow A step 8 requires one before a receipt can exist. The endpoint has a real
consumer (§50's own rule), and the alternative — a receipt endpoint that manufactures runs as a side
effect — would break §32 lineage and hide `execution_mode`.
**Status:** Accepted (god confirmed at integration 2026-08-27).
