# SECURITY — Quantum Reliability Platform (QRP)

**What this document is.** The security posture of QRP: what we defend, what we deliberately do *not*
defend, and the concrete controls that make each claim checkable. It is the security owner's contract
with the other owners — every claim below either names a control that runs in CI, or is marked as a
gap with an owner.

| For | Read |
|---|---|
| Frozen cross-owner decisions (RECON-1..32) | `PHASE1_RECONCILE.md` |
| Error envelope, HTTP codes, reason codes | `API_CONTRACT.md` |
| Deployment topology, seams | `ARCHITECTURE.md` |
| The mandate this doc implements | `MISSION.md` §44, §47, §48, §71 |

Where this document and `PHASE1_RECONCILE.md` disagree, RECON wins.

---

## 1. What QRP is, from a security point of view

QRP ships as **a static single-page app on GitHub Pages** plus **a FastAPI service that is not
publicly deployed in V1**. The public artefact is therefore a bag of HTML/JS/CSS served from a CDN.

That shapes everything:

- There is **no server** behind the public site. No database, no session store, no origin we control.
- There is **no user account**, no login, no upload that persists anywhere.
- Everything the user pastes into the deployed app is processed **in their own browser** and is gone
  on reload.
- The only assets worth stealing are **provider credentials** — and by construction none of them ever
  reach the browser.

The two things that can actually go wrong are: **(a) a secret gets baked into the published bundle**,
and **(b) hostile text pasted as a circuit does something worse than fail to parse**. §2 and §4 are
about those. Everything else is proportionate.

## 2. Secret safety (RECON-29)

**Claim: the published bundle contains zero secrets.**

Vite inlines every `import.meta.env.VITE_*` value into the built JavaScript as a literal string. A
`VITE_` variable is not configuration — it is *published content*. Code review cannot prove the
absence of a secret in a bundle; only reading the built bundle can. So the claim rests on three
layers, not one.

### Layer 1 — allowlist at the source

`.env.example` is the allowlist. Exactly three `VITE_*` variables exist and each is public by nature:

| Variable | Why it is safe to publish |
|---|---|
| `VITE_APP_NAME` | A display string. |
| `VITE_BASE_PATH` | The Pages repo path; already visible in every URL. |
| `VITE_DEMO_MODE` | A boolean feature flag. |

Adding a fourth `VITE_*` variable is a **security review**, not a config change. The reviewer's only
question is: *am I willing to print this value on the home page?* If the answer is no, it does not
belong in the frontend at all — it belongs behind the API.

### Layer 2 — name regex in CI

CI fails the build on any variable matching `VITE_.*(KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL)`. This
catches the honest mistake (`VITE_IBM_API_TOKEN=…` in a local `.env` that gets committed) and costs
nothing. It catches naming, not content — which is why it is not the last layer.

### Layer 3 — post-build scan of `dist/` (the load-bearing one)

**The only real proof is a scan of `apps/web/dist/` after `npm run build`, gating the Pages deploy.**
The scan greps the built output for high-entropy strings and known provider-credential shapes (the
same rules as `.gitleaks.toml`, §6). A hit fails the deploy job.

> **STATUS: GAP (SEC-P1-04, owner: release).** `.github/workflows/pages.yml` builds and uploads
> `apps/web/dist` with no scan step between them. Until that step exists, layers 1 and 2 are the only
> enforcement and the "zero secrets in the bundle" claim is asserted, not proven. The step belongs in
> the `build` job, after `npm --prefix apps/web run build` and before `upload-pages-artifact`.

### Provider adapters are backend-only

Real QPU execution goes through provider adapters in `services/api/**` (`MISSION.md` §13). Those hold
credentials; they are never imported from the frontend. The seam is enforced mechanically by an ESLint
`no-restricted-imports` rule forbidding `apps/web/**` from importing `services/api/**`. The
`DemoProvider` — static fixtures, no network, no credentials — is the only browser-reachable adapter.

> **STATUS: unverified (SEC-P2-06, owner: frontend).** Confirm the `no-restricted-imports` rule is
> present in `eslint.config.js` and that it errors, rather than warns.

### Git hygiene

- `.gitignore` ignores `.env`, `.env.*` (with `!.env.example`), `*.pem`, `*.key`, `secrets.*`. Verified.
- `gitleaks` runs on every push and PR (`ci.yml`, `security` job), configured by `.gitleaks.toml`.
- The repo is **public from day one** (RECON, Security Q1), so GitHub **push protection** is available
  and should be enabled in repo settings. There is no pre-public history to scrub.
- **If a credential is ever committed: rotate it first, scrub second.** A rewritten history does not
  un-leak a value that was on a public remote. Treat rotation as the fix and history rewriting as
  cleanup.

## 3. Pages threat model (RECON-30)

### What is in scope

| Threat | Control |
|---|---|
| Secret exfiltrated from the bundle | §2 — nothing sensitive is in it |
| XSS via pasted circuit text rendered back to the user | React escapes by default; `dangerouslySetInnerHTML` and `innerHTML` are **banned** repo-wide |
| Injected or third-party script running in the page | Meta CSP, below; no CDN script tags, no analytics |
| Clickjacking of a page with no privileged action | `frame-ancestors 'none'` — cheap, so we take it |
| Malicious circuit input | §4 |

### Content Security Policy

GitHub Pages cannot set HTTP response headers, so the CSP ships as a `<meta http-equiv>` in
`index.html`. That is weaker than a header (`frame-ancestors` is header-only in practice, and the
meta tag applies only from the point it is parsed) but it is what the platform allows, and it was
approved as RECON-30:

```
default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'
```

`style-src 'unsafe-inline'` is **accepted** — Tailwind's runtime style injection and inline SVG chart
styling need it, and inline CSS is not an execution primitive. `script-src 'unsafe-inline'` and
`'unsafe-eval'` are **never** accepted. A charting or animation library that requires either is
grounds for rejecting the library, not for loosening the policy.

> **STATUS: GAP (SEC-P1-05, owner: frontend).** The meta CSP must exist in `apps/web/index.html` and
> survive the production build. Verify by grepping the built `dist/index.html`, not the source.

### What is explicitly out of scope, and why

QRP has **no authentication, no authorization, no sessions, no cookies, no CSRF surface, no rate
limiting, no PII, no GDPR obligations, and no analytics or telemetry of any kind** (RECON, Security
Q2 — none, deliberately, so the "no sensitive data leaves the browser" claim of §48 stays true).

Refusing to build that machinery is a decision, not an omission. Building login ceremony for a static
demo with nothing to protect would add attack surface, add dependencies, and make the security story
*worse*. If a reviewer asks "where is your auth?", the answer is that there is nothing to
authenticate, and the list above is the proof.

## 4. Circuit input safety (RECON-31)

Pasted or uploaded OpenQASM/circuit data is **the only genuine untrusted-input surface in the
product**. It is handled under a single rule: **it is text, it is never code.**

| Rule | Detail |
|---|---|
| Treated as text | Content-sniffed as text; never executed, never `import`ed |
| Size cap | ~256 KB → `413` with the §43 error envelope |
| Structural caps | Max qubits / gates / depth → `422` |
| Parse timeout | Parse runs under a timeout, in a Web Worker where the UI would otherwise stall → `422` |
| Rejection is a first-class state | Structured §43 error naming what failed and what stays safe — never a bare "Something went wrong" |

**Banned outright, frontend and backend:** `eval`, `new Function`, `setTimeout`/`setInterval` with a
string body, dynamic `import()` of a user-derived path, `exec`/`eval`/`compile` in Python,
`pickle`/`marshal` deserialization of anything user-supplied, `subprocess` with user-derived
arguments, and `yaml.load` without `SafeLoader`.

**Validation is doubled, not shared.** Zod at the frontend boundary is *user experience* — it gives a
fast, specific error. Pydantic in `services/api` is *enforcement*. The frontend's validation is never
the enforcement point, because the frontend is attacker-controlled: anyone can POST to the API
directly. Every cap in the table above must be re-checked server-side with the same numbers.

Rejected input is never echoed unescaped into an error message, a log line, or a filename.

## 5. Dependencies and CI (RECON-32)

Current posture in `.github/workflows/`:

| Control | State |
|---|---|
| `npm ci` from a committed lockfile | present — `ci.yml` |
| `npm audit --audit-level=high` | present — `ci.yml` `security` job |
| `pip-audit` | advisory only — ends in `\|\| true`, so it cannot fail the build |
| `gitleaks` on push and PR | present — `ci.yml` `security` job, configured by `.gitleaks.toml` |
| `permissions: contents: read` at workflow level | present in both workflows; elevated only in the Pages `deploy` job (`pages: write`, `id-token: write`) — correct |
| No `pull_request_target` | verified absent — this is the trigger that runs fork code with repo secrets, and it must stay absent |
| Actions pinned to commit SHAs | missing — pinned to floating tags (`@v4`, `@v2`); `ci.yml` carries a `TODO(security, Phase 9)` |
| Dependabot weekly | missing — no `.github/dependabot.yml` |

Three open items, each a filed finding (§8):

- **SEC-P1-01 — SHA-pin third-party Actions** (owner: release). `@v4` is a mutable tag: whoever
  controls the action can repoint it. `actions/*` are first-party and lower risk; `gitleaks-action@v2`
  is third-party and should be pinned first. SHA-pinning also turns Dependabot's action updates into
  reviewable diffs.
- **SEC-P2-02 — enable Dependabot weekly** (owner: release) for `npm`, `pip`, and `github-actions`.
- **SEC-P2-03 — decide `pip-audit`'s `|| true`** (owner: backend). Advisory is a defensible starting
  position while the Python dependency set is still moving (stim/pymatching/sinter, RECON-16), but it
  should be a recorded decision with a date to remove it, not an accident.

**On adding a dependency:** prefer the standard library; prefer something already in the tree; check
that it is maintained and that its own dependency tree is not absurd. A charting library that pulls
forty transitive packages into a page whose CSP forbids inline script is a bad trade.

## 6. `.gitleaks.toml`

The repo ships `.gitleaks.toml` at the root, picked up automatically by `gitleaks-action`. It extends
the default ruleset (AWS, GitHub, generic high-entropy assignments, private keys) and adds:

- `qrp-vite-secret-var` — a `VITE_*` variable whose name contains `KEY`/`TOKEN`/`SECRET`/`PASSWORD`/
  `CREDENTIAL`. This is layer 2 of §2, enforced by the same tool that scans history.
- `qrp-ibm-quantum-token` — the 64-hex-character IBM Quantum / Qiskit Runtime API token shape.
- `qrp-ionq-api-key` and `qrp-quantinuum-credential` — the other provider families of §13.
- `qrp-generic-provider-secret` — a quoted secret assigned to a provider-named variable, for the
  shapes the specific rules miss.

The allowlist is deliberately narrow: `.env.example`, `package-lock.json`, `.gitleaks.toml` and
`docs/SECURITY.md` (the last two contain the regexes themselves), plus obvious placeholder values.
**Do not add blanket path allowlists.** An allowlisted directory is a directory where a real secret
can hide, and fixture directories are exactly where one eventually will.

Run it locally before pushing anything that touched config or env:

```bash
gitleaks detect --config .gitleaks.toml --redact --verbose
```

## 7. Finding process

I file findings; owners fix them; I re-verify. **I do not rewrite other owners' code.** A finding that
arrives as a patch invites an argument about the patch instead of the problem.

Every finding is filed with **id, severity, owner, file/line, repro, and the control that closes it** —
a finding without a checkable control is an opinion.

| Severity | Meaning | Response |
|---|---|---|
| **P0** | A secret is exposed, or user input can cause execution. Ship-blocking. | Stop. Rotate first if a credential is involved, then fix, then re-verify. Never merged around. |
| **P1** | A stated security claim is unproven, or a promised control is missing. | Fixed before the phase it belongs to closes. Blocks the Pages deploy if it touches the bundle. |
| **P2** | Hardening that reduces future risk but closes no current hole. | Scheduled; may be deferred with a recorded decision and a date. |

Ids are `SEC-P{severity}-{nn}`. Open findings live in §8 of this document, and each one is also
mirrored as a `STATUS:` line under the claim it undercuts — so closing a finding means editing the
claim it sat under, not just ticking a list.

**Deep audit is Phase 9** (`MISSION.md` §60). The rules in this document bind from day one; the
line-by-line audit of the finished code comes at the end. Nothing here waits for Phase 9 — a secret
committed in Phase 3 is leaked in Phase 3.

## 8. Open findings

| Id | Sev | Owner | Summary | Closes when |
|---|---|---|---|---|
| SEC-P1-01 | P1 | release | Actions pinned to floating tags, not SHAs | `ci.yml` + `pages.yml` use `uses: org/repo@<sha>` |
| SEC-P1-04 | P1 | release | No post-build `dist/` secret scan gating the Pages deploy | Scan step exists in `pages.yml` `build` job and fails on a hit |
| SEC-P1-05 | P1 | frontend | Meta CSP not verified present in the built `index.html` | Grep of `dist/index.html` shows the RECON-30 policy |
| SEC-P2-02 | P2 | release | No `.github/dependabot.yml` | Weekly npm + pip + github-actions updates configured |
| SEC-P2-03 | P2 | backend | `pip-audit` is advisory (`\|\| true`) | Either the guard is removed, or the exception is a dated decision in `DECISIONS.md` |
| SEC-P2-06 | P2 | frontend | ESLint `no-restricted-imports` seam not verified as an error | Rule present in `eslint.config.js`, failing rather than warning |

No P0 findings are open. The `VITE_*` allowlist, `.gitignore` secret patterns, workflow `permissions`
scoping, and the absence of `pull_request_target` were each checked directly against the repo at the
time of writing.
