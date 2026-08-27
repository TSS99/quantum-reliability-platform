"""Phase-7 unified optimizer + preflight (PHASE1_RECONCILE.md RECON-19/20/21).

- `candidate.py`    — `OptimizerCandidate`, the shared signals Stage A/B and Preflight consume.
- `normalization.py` — fixed, documented normalization ranges (never per-batch min-max).
- `findings.py`     — `evaluate_findings`, the ONE Finding-computation function shared by Stage A and
  Preflight, so they can never diverge.
- `scoring.py`      — Stage B: `Score = w_e*E + w_c*C + w_t*T + w_q*Q + w_l*L` over feasible candidates.
- `pipeline.py`     — Stage A (hard-constraint pre-filter) + Stage B (scoring) orchestration.
- `preflight.py`    — RUN / RUN_WITH_WARNING / DO_NOT_RUN / INSUFFICIENT_DATA.
- `explanations.py` — deterministic template rendering — never LLM prose.
"""
