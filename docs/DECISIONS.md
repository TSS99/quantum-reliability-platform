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
