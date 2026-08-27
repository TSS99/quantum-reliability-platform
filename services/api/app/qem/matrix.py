"""Loader + evaluator for the QEM compatibility matrix.

`docs/data/qem_compatibility.json` is the SINGLE source of technique compatibility rules
(QEM_METHODS.md section 5, RECON-13). This module loads and interprets it. It never re-encodes a
rule in Python: adding or changing a rule means editing the JSON, not this file.
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any, Literal

# repo root: app/qem/matrix.py -> qem -> app -> api -> services -> <root>
MATRIX_PATH = Path(__file__).resolve().parents[4] / "docs" / "data" / "qem_compatibility.json"

Verdict = Literal["compatible", "conditional", "incompatible"]

_MISSING = object()


@dataclass(frozen=True)
class Evaluation:
    """The verdict for one technique against one (circuit, backend, params) context."""

    technique: str
    verdict: Verdict
    reason_code: str | None = None
    detail_code: str | None = None
    requires: str | None = None
    message: str | None = None
    missing_fields: tuple[str, ...] = ()


@lru_cache(maxsize=4)
def load_matrix(path: str | None = None) -> dict[str, Any]:
    return json.loads(Path(path or MATRIX_PATH).read_text(encoding="utf-8"))


def technique(technique_id: str, matrix: dict[str, Any] | None = None) -> dict[str, Any]:
    for entry in (matrix or load_matrix())["techniques"]:
        if entry["id"] == technique_id:
            return entry
    raise KeyError(f"unknown technique: {technique_id}")


# --- condition grammar (matrix.evaluation.condition_grammar) ---------------------------------

_FIELD = re.compile(r"[A-Za-z_][A-Za-z_0-9]*(?:\.[A-Za-z_][A-Za-z_0-9]*)+")
_ARITHMETIC = re.compile(r"[0-9\s.,+\-*/()\[\]eE_]*")


def _apply(op: str, left: Any, right: Any) -> bool:
    if op == "eq":
        return left == right
    if op == "ne":
        return left != right
    if op == "in":
        return left in right
    if op == "gt":
        return left > right
    if op == "gte":
        return left >= right
    if op == "lt":
        return left < right
    if op == "lte":
        return left <= right
    raise ValueError(f"unsupported op: {op}")


def _expression(text: str, context: dict[str, Any], missing: set[str]) -> Any:
    """Evaluate a `value_is_expression` right-hand side: field refs, arithmetic, max/min."""
    rendered = text
    for name in sorted(set(_FIELD.findall(text)), key=len, reverse=True):
        value = context.get(name, _MISSING)
        if value is _MISSING or value is None:
            missing.add(name)
            return _MISSING
        rendered = rendered.replace(name, repr(value))
    if not _ARITHMETIC.fullmatch(re.sub(r"\b(?:max|min)\b", "", rendered)):
        raise ValueError(f"unsupported expression: {text}")
    return eval(rendered, {"__builtins__": {}, "max": max, "min": min}, {})  # noqa: S307


def _leaf(cond: dict[str, Any], context: dict[str, Any], missing: set[str]) -> bool:
    left = context.get(cond["field"], _MISSING)
    if left is _MISSING:
        missing.add(cond["field"])
        return False
    right = cond["value"]
    if cond.get("value_is_expression"):
        right = _expression(right, context, missing)
        if right is _MISSING:
            return False
    if left is None and right is not None:
        # A declared-but-unknown input is never coerced to 0 (MISSION section 20).
        missing.add(cond["field"])
        return False
    return _apply(cond["op"], left, right)


def _matches(cond: dict[str, Any], context: dict[str, Any], missing: set[str]) -> bool:
    if "all" in cond:
        return all([_matches(c, context, missing) for c in cond["all"]])
    if "any" in cond:
        return any([_matches(c, context, missing) for c in cond["any"]])
    return _leaf(cond, context, missing)


def evaluate(
    technique_id: str, context: dict[str, Any], matrix: dict[str, Any] | None = None
) -> Evaluation:
    """First matching rule wins; otherwise the technique's `default_verdict`.

    A rule that matched is decisive. If no rule matched but a referenced field was absent or
    unknown, the answer is INSUFFICIENT_CALIBRATION_DATA rather than the default verdict — the
    matrix's own grammar says a missing field raises that at preflight.
    """
    entry = technique(technique_id, matrix)
    missing: set[str] = set()
    for rule in entry.get("rules", []):
        if _matches(rule["when"], context, missing):
            return Evaluation(
                technique=technique_id,
                verdict=rule["verdict"],
                reason_code=rule.get("reason_code"),
                detail_code=rule.get("detail_code"),
                requires=rule.get("requires"),
                message=rule.get("message"),
                missing_fields=tuple(sorted(missing)),
            )
    if missing:
        return Evaluation(
            technique=technique_id,
            verdict="incompatible",
            reason_code="INSUFFICIENT_CALIBRATION_DATA",
            detail_code="MISSING_INPUT_FIELD",
            message="Required inputs are not available: " + ", ".join(sorted(missing)) + ".",
            missing_fields=tuple(sorted(missing)),
        )
    return Evaluation(technique=technique_id, verdict=entry["default_verdict"])


def combination(
    technique_ids: list[str] | tuple[str, ...], matrix: dict[str, Any] | None = None
) -> Evaluation | None:
    """The `combinations[]` entry for this exact technique set, or None if unconstrained."""
    wanted = set(technique_ids)
    for entry in (matrix or load_matrix())["combinations"]:
        listed = set(entry["techniques"])
        if "*" in listed:
            if (listed - {"*"}) <= wanted and len(wanted) > 1:
                return _combination_evaluation(entry)
            continue
        if listed == wanted:
            return _combination_evaluation(entry)
    return None


def _combination_evaluation(entry: dict[str, Any]) -> Evaluation:
    return Evaluation(
        technique="+".join(entry["techniques"]),
        verdict=entry["verdict"],
        reason_code=entry.get("reason_code"),
        detail_code=entry.get("detail_code"),
        requires=entry.get("requires"),
        message=entry.get("note"),
    )


# --- context building -------------------------------------------------------------------------


def parameter_defaults(matrix: dict[str, Any] | None = None) -> dict[str, Any]:
    """`params.<technique>.<name>` defaults, read off the matrix so they live in one place."""
    defaults: dict[str, Any] = {}
    for entry in (matrix or load_matrix())["techniques"]:
        for name, spec in entry.get("parameters", {}).items():
            if "default" in spec:
                defaults["params." + entry["id"] + "." + name] = spec["default"]
    return defaults


def build_context(
    circuit: dict[str, Any],
    backend: dict[str, Any],
    params: dict[str, Any] | None = None,
    request: dict[str, Any] | None = None,
    derived: dict[str, Any] | None = None,
    matrix: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Flatten inputs into the dotted namespaces the matrix rules reference.

    `circuit` / `backend` keys are bare (`num_qubits`); `params` keys are `<technique>.<name>`.
    `derived.scaled_duration_us` is computed here; `derived.pec_gamma_squared` must be supplied by
    the caller (see `model.pec_gamma_squared`) because it needs the calibration gate errors.
    """
    context: dict[str, Any] = parameter_defaults(matrix)
    context.update({"params." + k: v for k, v in (params or {}).items()})
    context.update({"circuit." + k: v for k, v in circuit.items()})
    context.update({"backend." + k: v for k, v in backend.items()})
    context.update({"request." + k: v for k, v in (request or {}).items()})

    duration = context.get("circuit.estimated_duration_us")
    scale_factors = context.get("params.zne.scale_factors")
    if duration is not None and scale_factors:
        context["derived.scaled_duration_us"] = duration * max(scale_factors)
    context.update({"derived." + k: v for k, v in (derived or {}).items()})
    return context
