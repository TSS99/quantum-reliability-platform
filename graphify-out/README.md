# Knowledge graph

A navigable map of this repository — **1242 nodes, 2276 edges, 100 communities** — built by
[graphify](https://github.com/safishamsi/graphify) from the code (AST) and the docs (semantic
extraction).

## Why it is committed

So a change can be scoped by **querying the graph instead of re-reading the codebase**. That is a
large token saving on every future task, and it makes the blast radius of a change explicit.

| File | What it is |
|---|---|
| `graph.json` | the graph itself — query this |
| `graph.html` | interactive visualisation, open in any browser |
| `GRAPH_REPORT.md` | audit report: god nodes, surprising connections, cohesion, provenance |

## Using it

```bash
graphify query "how does the optimizer decide a plan is infeasible?"
graphify path "CircuitProfile" "ReliabilityReceipt"
graphify explain "run_simulation"
graphify . --update      # re-extract only what changed
```

## Honesty

Every edge carries its provenance: `EXTRACTED` (explicit in source), `INFERRED` (model-reasoned,
with a confidence score) or `AMBIGUOUS`. Treat INFERRED edges as leads, not facts — the report lists
which ones carry the most weight and are worth verifying.

**Keep it fresh:** run `graphify . --update` after substantial changes, or the map drifts from the
territory.
