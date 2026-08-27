# Design System — QRP

**Owner:** UX Director · **Phase:** 2 · **Status:** authored, awaiting integration
**Governs:** MISSION §35–42, §69–71 · RECON-22 / 23 / 24 / 27 · `UX_MAP.md`
**Machine-readable companion:** [`docs/data/design_tokens.json`](data/design_tokens.json) — the
concrete values. This document is the *reasoning*; the JSON is the *contract*. Where the two appear to
disagree, the JSON wins and this document is wrong.

**Scope boundary.** This is a design specification plus token values. It contains no React, no Tailwind
config and no component source. Frontend wires `design_tokens.json` into Tailwind in Phase-2
implementation; nothing here prescribes *how*.

---

## 1. Two directions, a critique, and the selection (§35)

Two compact directions were developed against the same brief: scientific instrumentation, quantum
control, oscilloscope precision, hardware topology, signal/noise — and against §36's prohibitions
(no generic purple/blue AI gradients, no imitation of existing dashboards, no "ten gradients and call
it design").

### 1.1 Direction A — **Signal Bench**

The product is a bench instrument. Near-black plate, a faint graticule where data lives, hairline
rules instead of boxes, and one governing idea: **hue is reserved for meaning**. Buttons, tabs and
links carry *no* hue at all — they are expressed by luminance, weight and border, exactly as the
neutral keys on a physical instrument do, while hue is spent entirely on the seven semantic states
and the data series. The Rail is a live signal trace running the width of the product: it enters
noisy at the left and settles flat at the right.

- **Type:** Space Grotesk (mechanical display) / Inter (dense body) / JetBrains Mono (metrics).
- **Boldness budget:** spent wholly on the Rail's trace. Everything else is quiet.
- **Risk:** near-monochrome chrome can read as unfinished if the Rail is weak or absent.

### 1.2 Direction B — **Lattice Plate**

The product is a fabrication floorplan. Graphite substrate, structural 1–2px borders everywhere,
content organised as *stations* on a die layout, and a syndrome-lattice motif carried through
backgrounds, empty states and the Rail. Hue is used freely — each stage owns a hue, panels are
tinted, the lattice glows.

- **Type:** IBM Plex Sans + IBM Plex Mono superfamily throughout.
- **Boldness budget:** distributed — the lattice motif appears on every surface.
- **Risk:** a hue per stage burns the hue budget that the seven semantic states need.

### 1.3 Self-critique

**Against A.** Its austerity is a real hazard: a product whose chrome carries no colour can look
under-designed on the routes that have no Rail (Integrations, Settings, Workloads). It also asks a lot
of one component — if the Rail underdelivers, nothing else rescues the page. And a hueless primary
button is unusual enough that it must be unmistakably *shaped* like a button or it will not be found.

**Against B.** It fails the brief in a way that is not recoverable by tuning. Six stage hues plus four
status hues plus three series hues is thirteen hues in one product; under red-green deficiency several
collapse together, and RECON-27 exists precisely because seven already exceeds hue capacity. The
lattice motif on every surface is decoration competing with data — §36 rejects exactly this. Its
structural borders are genuinely better than A's hairlines for dense tables, and its stage-as-station
metaphor is a better fit for `blocked` than a trace is.

**Against both.** Neither direction initially had an answer for `uncertain`. It is not a colour
problem: "the instrument has no reading" is the absence of a signal, and painting it a colour asserts
a measurement that does not exist.

### 1.4 Selection

**Direction A — Signal Bench — is selected**, with three amendments taken from B and one from the
critique:

1. **Structural borders for dense data.** Tables, the hardware comparison and the Rail's nodes use
   `border.control` (a real 3:1 stroke), not decorative hairlines. Hairlines are for separators only.
2. **`blocked` is a station, not a break in the trace.** A blocked stage renders as a double-stroked
   node with a slashed glyph and its reason code as text — B's station reading, which survives
   grayscale and reduced motion where a "broken trace" would not.
3. **The lattice motif is kept but rationed** to exactly two places: the QEC Lab empty state and the
   `logical` series marker. It never appears as ambient background.
4. **`uncertain` is encoded by absence, not colour**: a neutral hue plus a mandatory 45° hatch fill.
   The hatch, not the hue, is what identifies it.

**What "boldness is spent on the Rail" means concretely (§38):** the Rail is the only element allowed
full-bleed width, the only element with a bespoke SVG rendering, and the only element with a motion
duration above 320ms. No other component may claim any of those three.

---

## 2. Colour (§36, RECON-27)

Dark-first, light at parity. **Both themes are authored, not derived** — the light palette is not the
dark palette inverted, and neither is allowed to ship with worse contrast than the other.

### 2.1 The governing rule

> **Hue carries meaning. Interaction carries none.**

Primary actions are a high-contrast *neutral* (near-white on dark, near-black on light). Secondary
actions are transparent with a `border.control` stroke. This is not minimalism for its own sake — it
is what makes seven semantic states affordable. Every hue in the product is claimed by a state or a
series, so a coloured button would be a false status signal.

The single exception is the Rail trace, which uses the `mitigated` hue deliberately, because that is
literally what the trace depicts.

### 2.2 The seven states — and the fact that they are two scales

The seven states in §36 are not one scale. Treating them as one is the root cause of most legends
that fail:

| Scale | States | What it answers |
|---|---|---|
| **status** | `healthy` · `warning` · `critical` · `uncertain` | "Is this reading acceptable?" |
| **series** | `raw` · `mitigated` · `logical` | "Which signal is this?" |

**A legend may never mix the two scales.** A chart's series legend contains raw/mitigated/logical; a
status legend contains healthy/warning/critical/uncertain. This separation is what makes the hue
budget fit, and it is enforceable in review.

### 2.3 Non-colour encoding (RECON-27, mandatory)

Every state ships with **four** channels. Colour is the last of them, never the only one.

| State | Scale | Icon | Shape | Fill | Label | Chart dash | Marker |
|---|---|---|---|---|---|---|---|
| healthy | status | `circle-check` | circle | solid | "Healthy" | — | — |
| warning | status | `triangle-alert` | triangle | solid | "Warning" | — | — |
| critical | status | `octagon-x` | octagon | solid | "Critical" | — | — |
| uncertain | status | `help-circle-dashed` | dashed circle | **hatch-45** | "Uncertain" | — | — |
| raw | series | `wave-raw` | outline circle | none | "Raw" | `6 3` | circle |
| mitigated | series | `wave-damped` | square | solid | "Mitigated" | — | square |
| logical | series | `lattice-cell` | diamond | solid | "Logical" | `10 4 2 4` | diamond |

Shapes are drawn from the four Gestalt-distinct primitives (circle / triangle / octagon / square) plus
diamond, so they remain separable at 12px and in grayscale.

**Because shape is a semantic channel, container radius is never semantic.** A pill badge and a
rectangular badge must not mean different things. All chips share one radius (`radius.chip`).

### 2.4 Contrast — verified, not asserted

Targets, applied to both themes:

| What | Target | Source |
|---|---|---|
| All text, including `text.muted` and every state used as text | **4.5:1** | WCAG AA |
| Control borders, focus rings, chart axes | **3:1** | WCAG AA non-text |
| Any two series that can appear in the same chart | **1.4:1** luminance separation | grayscale/print legibility |

Every value in `design_tokens.json` was checked against these targets during authoring, and five
initial values failed and were replaced (`series.mitigated` and `series.logical` in both themes,
`border.control` and the chart axis in light). The check is arithmetic and must be re-run in CI (§47)
whenever a token changes.

**One deliberate exemption:** the chart graticule (`chart.grid`, ≈1.15:1) is below threshold on
purpose. It is decorative structure carrying no information — the axis line and tick labels carry it,
and those meet 3:1. Raising the graticule to 3:1 would produce a cage that competes with the data.
This exemption is recorded here so a future audit does not "fix" it.

**A note on the 1.4:1 series rule.** The instinct is 2:1, and 2:1 is unreachable: three series must
each clear 4.5:1 against the background, which confines them to a luminance band too narrow to also
hold two 2:1 gaps — in light theme especially. Rather than quietly ship a rule nothing satisfies, the
rule is 1.4:1 *and* dash + marker are the primary channel, with hue as redundant reinforcement.

### 2.5 Focus

A **double ring** — 2px inner in the surface colour, 2px outer in the inverse — is used in both
themes, on every interactive element, with no `outline: none` anywhere. Because one of the two rings
always contrasts with whatever is behind it, the ring cannot disappear on a coloured chip, an image,
a chart, or a Rail node. It is theme-agnostic by construction.

---

## 3. Typography (§37)

Three families, three jobs.

| Role | Family | Job |
|---|---|---|
| Display | **Space Grotesk** | Headings and the landing voice. Mechanical, wide-aperture, not a neutral grotesque. |
| Body | **Inter** | Dense UI prose, labels, table text. Chosen to be invisible. |
| Technical | **JetBrains Mono** | Metrics and identifiers. Tall x-height, unambiguous `0/O` and `1/l/I` — which is the whole reason to use mono at all. |

Body type is deliberately a workhorse. §36 prohibits generic *palettes and gradients*; character in a
data product belongs in the display face and the mono, not in the face that renders a thousand table
cells. `IBM Plex Sans` is the sanctioned substitute if a less ubiquitous body face is later wanted —
it is already the fallback in the stack.

### 3.1 The mono rule (§37: "careful monospace for metrics, not everywhere")

Mono is permitted **only** for:

- numeric metrics and deltas;
- identifiers — `backend_id`, `circuit_fingerprint`, `calibration_snapshot_id`, run ids;
- code and OpenQASM;
- chart axis tick values.

Mono is **forbidden** for headings, button text, form labels, nav items, prose, and empty-state copy.
A monospaced heading is the single fastest way to make a scientific product look like a terminal
pastiche.

Every metric, every numeric table column and every axis tick sets `font-variant-numeric: tabular-nums`,
so digits never reflow between renders — the reason mono is here in the first place.

### 3.2 Scale

Two parallel ramps — a text ramp and a metric ramp — so a metric can be visually dominant without
implying a heading level. Base body is 16px/1.5; the smallest permitted text is 12px (`caption`),
never for body copy. Values in `design_tokens.json → typography.scale`.

---

## 4. Spacing, grid, elevation, borders

**Spacing.** 4px base on a dense-dashboard ramp (`0.5 → 24`, i.e. 2px → 96px). Steps are named
numerically rather than by t-shirt size so overall density can be retuned in one place without a
rename cascade.

**Grid.** 4 / 8 / 12 / 12 columns at 375 / 768 / 1024 / 1440. Gutters 16 / 20 / 24 / 24. Content
column maxes at 1280px inside a 1440px viewport; **only the Rail may bleed past it.**

**Elevation.** Dark themes cannot use drop shadows against near-black — the shadow is invisible and
the card floats on nothing. Elevation is therefore defined as a **triple resolved per theme**:
(surface, border, shadow). On dark, levels 1–2 are surface-luminance steps plus a hairline and *no*
shadow; only level 3 (modals) adds one. On light, levels 1–3 are shadows on a white surface. Four
levels total; there is no level 4.

**Borders.** `hairline` (1px, decorative separators, contrast-exempt), `control` (1px at 3:1, every
input, table structure and Rail node), `emphasis` (2px, active state), `double` (3px, reserved for
`blocked`). A component may not invent a fifth.

---

## 5. The Reliability Transformation Rail (§38, RECON-23) — visual spec

One component, two modes, six stages, four states. The stage↔step↔`ExecutionPlan` mapping and its four
invariants are frozen in `UX_MAP.md §4.2` and are **not** restated here — this section is the visual
and motion design that sits on top of that contract.

### 5.1 The idea

The Rail is a **signal trace crossing a graticule**. A baseline runs the full width of the plate; six
stage nodes sit on it; and the segment *between* nodes is a live trace whose **amplitude encodes the
residual error still present at that point in the pipeline**.

```
   Circuit      Hardware       Noise       Strategy     Execution   Verification
     ┌─┐  ∿∿∿∿∿   ┌─┐  ∿∿∿∿∿∿∿  ┌─┐ ∿∿∿∿∿∿∿ ┌─┐  ∿∿∿∿   ┌─┐  ∿∿    ┌─┐
  ───┤ ├──/\/\/\──┤ ├─/\/\/\/\──┤ ├/\/\/\/\─┤ ├──/\/\───┤ ├──/\────┤ ├────
     └─┘          └─┘           └─┘         └─┘         └─┘        └─┘
      amplitude grows as noise is characterised ──►──  collapses as it is mitigated
```

Amplitude is bound to `clamp(1 - ExecutionPlan.reliability_estimate, 0, 1) × 14px`. It is **data, not
decoration** — which is what keeps the signature element on the right side of §71. A stage with no
bound object renders a flat segment, never an invented waveform (`UX_MAP.md §4.2` invariant 3).

The trace is drawn in the `mitigated` hue, over the pre-Strategy segments in the `raw` hue, so the
recolouring at the Strategy node is itself the story.

### 5.2 Stage nodes

A 28px **square** (24px at ≤375px, 26px at 768–1023px) with a `control` border and a 16px line glyph.
Squares, not circles: a circle is the default rail dot in every product that has one, and the square
plate reads as a station on an instrument.

| Stage | Glyph |
|---|---|
| `circuit` | three-wire ladder with a gate box |
| `hardware` | coupling lattice fragment |
| `noise` | band-limited waveform |
| `strategy` | branch with one path selected |
| `execution` | step marker in brackets |
| `verification` | sealed receipt with a tick |

**State encoding — four channels, never colour alone:**

| State | Border | Interior | Glyph | Label | Extra |
|---|---|---|---|---|---|
| `pending` | hairline | none | 40% opacity | 400 | — |
| `active` | control | `bg.raised` | full | 600 | 2px inset bar on the node's bottom edge |
| `complete` | control | `bg.raised` | full | 500 | solid 2px rule under the node |
| `blocked` | **double** | `state.critical.bg` | replaced by slashed square | 600 | reason code (RECON-21) rendered as text beside the label |

Every node carries a **permanent visible text label** beneath it — not a tooltip. The Rail must be
fully readable in a screenshot, in grayscale, and by someone who never hovers.

### 5.3 The two modes (RECON-23)

Identical geometry, labels and stage states in both. The marketing rail is the same component with a
static fixture, never a second illustration.

| | `mode="marketing"` | `mode="app"` |
|---|---|---|
| Placement | Full-bleed band on a `rail.plate` surface, landing + "How it works" | Sticky at the top of the New Analysis shell |
| Height | 160px (≥1024) / 120px (768–1023) / stacked (<768) | 96px / 72px / stacked |
| Reveal | One stage per 480ms on scroll-into-view, **once**, never loops | Driven by step progression |
| Trace | Draws left→right via `stroke-dashoffset` as each stage reveals | Re-draws only the segment whose bound value changed |
| Interaction | A stage scrolls to its explanation | A stage navigates to its step, if reached |

### 5.4 Motion (§40)

| Transition | Duration | Easing |
|---|---|---|
| Stage `pending → active → complete` | 480ms | `standard` |
| Trace segment redraw (`stroke-dashoffset`) | 480ms | `trace` |
| Series morph — raw distribution reshaping toward mitigated | 640ms | `trace` |
| Everything else in the product | 120–320ms | `standard` / `exit` |

The Rail is the **only** element permitted to exceed 320ms. There is no ambient motion, no idle
pulse, no looping trace. Motion runs when state changes and then stops.

**`prefers-reduced-motion: reduce`.** The Rail becomes a **static stepper carrying identical
semantics** — same six stages, same four states, same labels, same bound values, same amplitude
rendered as a static waveform, transitions applied instantly. It is not "the animation, disabled":
nothing in this product may be conveyed by motion alone, so there is nothing to lose. A single
opacity crossfade of ≤120ms is the one permitted exception, product-wide.

### 5.5 Constraint band (`ReliabilityGoal`)

A 32px strip carrying the goal as chips — target error, confidence, max cost, max runtime, priority
preset. Values in mono, labels in body. Below the Rail at ≥768px; above the vertical stepper below
that. While step `goal` is active the band is in edit state and the Rail holds its last completed
stage — the band is a *bound on* the pipeline, not a position in it (`UX_MAP.md §4.3`).

A chip the candidate plan violates gains: `critical` border, `hatch-45` background, and the matching
reason code from the shared RECON-21 enum as text. Three channels, no colour dependence.

### 5.6 Accessibility

`<ol>` of stages; each reached stage is a `<button>`, unreached stages are `aria-disabled`;
`aria-current="step"` on the active stage. Roving tabindex — Left/Right (Up/Down when stacked) moves
between stages, Enter activates a reached one. The waveform SVG is `aria-hidden`; the amplitude it
depicts is also rendered as text in the stage's label region, because a decorative-hidden graphic must
never be the only carrier of a value. Step advancement and verdict changes announce through a polite
live region.

---

## 6. Charts — six archetypes, capped (§39)

Six, and adding a seventh is a design decision requiring sign-off. "Prefer real functional
visualisations" is a licence for these six, not for an open-ended chart library.

| # | Archetype | Shape | Encodes |
|---|---|---|---|
| 1 | **Reliability curve** | multi-series line | estimated error vs circuit depth / shots — raw vs mitigated vs logical |
| 2 | **Pareto front** | scatter + hull | candidate strategies across cost vs residual error |
| 3 | **Coupling map** | node-link over device topology | per-qubit and per-edge error rates |
| 4 | **Error heatmap** | matrix | qubit × gate (or × time) error rate |
| 5 | **Calibration timeline** | stepped line + staleness band | drift over time, with the staleness threshold drawn |
| 6 | **Threshold plot** | log–log line per code distance | physical vs logical error rate |

### 6.1 Encoding rules (all mandatory)

- **`summary` is a required prop** (RECON-27). A chart that cannot be given a text alternative cannot
  be constructed. This is a type-level requirement, not a lint rule.
- **"View as table"** on every chart, over the same data.
- **Axis units and scale are labelled on the chart** — notably `log–log` on the threshold plot — not
  only in surrounding prose.
- **Series identity is dash + marker first**, hue second. See §2.3.
- **Max 4 series**, then small multiples. No exceptions.
- **No dual y-axis, ever.** Two scales in one frame is a false comparison.
- **No pie or donut anywhere.** Composition renders as a labelled stacked bar.
- **Direct series labels** at the line's end when ≤3 series; a legend only above that.
- **Tooltips are keyboard reachable** and never the sole carrier of a value.
- Heatmap cells ≥24px carry their numeric value as text.
- **Sequential ramp** = monotonic luminance (CI-verified), single hue family, for unsigned magnitude.
- **Diverging ramp** = signed deltas only, anchored at zero, with the zero tick always drawn.
- **Categorical palette** = non-semantic grouping only (e.g. several backends), capped at 6, and it may
  never reuse a status or series hue.

### 6.2 Simulated data must look simulated (§34, §71)

Any series derived from simulation rather than hardware carries a persistent `Simulated` marker in the
chart's header and in its `summary` string. It is never inferable from colour, and it is never only in
surrounding prose. This applies to every one of the six archetypes.

---

## 7. Motion rules (§40)

| Token | Value | Use |
|---|---|---|
| `fast` | 120ms | hover, focus, chip toggle |
| `base` | 200ms | disclosure, tab change, row expand |
| `slow` | 320ms | route transition, drawer, modal |
| `rail.stage` | 480ms | Rail only |
| `rail.series_morph` | 640ms | Rail only |

Easing: `standard` `cubic-bezier(0.2,0,0,1)` for entering, `exit` `cubic-bezier(0.4,0,1,1)` for
leaving (exits are faster than entrances).

**Forbidden:** overshoot / `back.out` easing anywhere in data UI — the bounce reads as sloppy on
informational surfaces; ambient or idle looping motion; animating `width`/`height`/`top`/`left`
(transform and opacity only); and any state conveyed by motion alone.

**`prefers-reduced-motion: reduce`** sets every duration to 0 except one permitted opacity crossfade
of ≤120ms. This is a global rule, not a per-component opt-in, and QA checks it per route.

---

## 8. Responsive behaviour (§41)

| | 375 | 768 | 1024 | 1440 |
|---|---|---|---|---|
| Grid | 4 col | 8 col | 12 col | 12 col (1280 content max) |
| Nav | disclosure drawer | drawer | persistent sidebar | persistent sidebar |
| Rail | vertical stepper | horizontal, 72px | horizontal, 96px | horizontal, 96px, may bleed full-width |
| Constraint band | above the stepper | below the Rail | below the Rail | below the Rail |
| Tables | definition-list cards | full table | full table | full table |
| Charts | single column, ≥240px tall | 2-up where paired | 2-up | 3-up permitted |
| Metric tiles | 1-up | 2-up | 4-up | 4-up |

Nav group **order is invariant across breakpoints** — a drawer reorders nothing.

### 8.1 Tables below 768px (RECON-27, §41)

Blanket `overflow-x` is forbidden. Each row becomes a card:

- the row's identifying column becomes the card heading;
- remaining columns become `<dt>`/`<dd>` pairs inside a `<dl>`;
- status cells keep icon + label + colour intact — the degradation must not drop a channel;
- column order is preserved as reading order.

**One exception, and only one:** genuinely matrix-shaped data — the hardware comparison at step
`hardware` — keeps a horizontal scroll region *with* a sticky first column and a visible scroll-shadow
affordance. Any further exception requires sign-off.

---

## 9. Acceptance criteria (§42 — criteria, not polish)

QA fails a screen that misses any of these. They are testable, and most are automatable in CI (§47).

1. Text contrast ≥4.5:1; control borders, focus rings and chart axes ≥3:1 — **in both themes**.
2. Every status is carried by icon **and** text **and** colour. Removing colour loses no information —
   verifiable by rendering the route in grayscale.
3. Every interactive element shows the double focus ring; no `outline: none` in the codebase.
4. Full keyboard operation, including the Rail (arrow keys between stages, Enter to activate).
5. Every chart has a non-empty `summary` and a working "view as table" toggle.
6. One `<h1>` per route with a correct heading hierarchy beneath it.
7. `prefers-reduced-motion: reduce` removes all motion; the Rail still communicates all six stages and
   their states.
8. No table below 768px uses horizontal scroll except the sanctioned hardware comparison.
9. Every simulated series is labelled as simulated in the chart header *and* in its `summary`.
10. No composite number renders outside `ExplainedScore` (RECON-24, `UX_MAP.md §5`).
11. Mono appears only where §3.1 permits it.
12. All four §43 states — loading / success / empty / error — exist for every async surface, with error
    text saying what failed, what stays safe, and what to do next.

---

## 10. Open dependencies

| Needs | From | Why |
|---|---|---|
| Icon library decision (Lucide assumed) | Frontend | §2.3 names glyphs; six Rail glyphs and `wave-raw` / `wave-damped` / `lattice-cell` are **custom** and must be drawn regardless |
| Shared reason-code enum module (RECON-21) | Architect + Optimizer | §5.5 renders violated chips from it; no second copy in the UI |
| `ScoreBreakdown` / `ScoreWeights` final shape | Architect | `ExplainedScore` styling binds to it (`UX_MAP.md §5.1`) |
| Contrast + ramp-monotonicity check in CI | Frontend / CI owner | §2.4 is only a guarantee if it is enforced on every token change |
| Google Fonts self-hosting decision | Frontend | Pages deploy + RECON-30 CSP; three variable faces must be self-hosted or the CSP must permit the font origin |

**Not in scope here (Frontend, Phase-2 implementation):** Tailwind config, CSS variable emission,
component source, the chart wrapper implementation, and the Rail's SVG code.
