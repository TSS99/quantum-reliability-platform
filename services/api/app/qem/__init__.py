"""QEM engine — pure functions over the frozen scientific model. No HTTP, no I/O beyond the matrix.

The compatibility rules live in `docs/data/qem_compatibility.json` (loaded by `matrix`); the
numeric model lives in `model`; `catalog` turns the two into a candidate set.
"""
from app.qem.catalog import (
    Candidate,
    Strategy,
    evaluate_all,
    evaluate_strategy,
    generate,
    recommendable,
    strategies,
)
from app.qem.matrix import (
    Evaluation,
    Verdict,
    build_context,
    combination,
    evaluate,
    load_matrix,
)
from app.qem.model import (
    ErrorBudget,
    ReliabilityEstimate,
    estimate,
    pec_gamma,
    pec_gamma_squared,
)

__all__ = [
    "Candidate",
    "ErrorBudget",
    "Evaluation",
    "ReliabilityEstimate",
    "Strategy",
    "Verdict",
    "build_context",
    "combination",
    "estimate",
    "evaluate",
    "evaluate_all",
    "evaluate_strategy",
    "generate",
    "load_matrix",
    "pec_gamma",
    "pec_gamma_squared",
    "recommendable",
    "strategies",
]
