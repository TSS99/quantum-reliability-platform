"""Candidate generation: what the MISSION section 18 step-5 generator may and may not offer."""
from __future__ import annotations

from app.qem.catalog import evaluate_all, generate, recommendable, strategies
from tests.qem.conftest import context


def offered_ids(ctx):
    return [c.strategy.id for c in generate(ctx)]


def test_raw_is_always_a_candidate():
    """Invariant 7: every mitigated estimate needs an honest baseline to be compared against."""
    for ctx in (
        context(),
        context({"task_type": "sampling_distribution"}),
        context({"idle_exposure": 0.0}),
        context(backend_overrides={"provides_readout_calibration": False}),
    ):
        assert "raw" in offered_ids(ctx)


def test_healthy_context_offers_the_full_ladder(healthy_context):
    ids = offered_ids(healthy_context)
    assert ids == [
        "raw",
        "readout",
        "dd_readout",
        "zne",
        "zne_readout",
        "dd_zne_readout",
        "pec_estimate",
    ]


def test_generation_order_is_the_matrix_order(healthy_context):
    assert [c.strategy.id for c in evaluate_all(healthy_context)] == [s.id for s in strategies()]


def test_sampling_workloads_lose_every_zne_candidate():
    """Invariant 12."""
    ids = offered_ids(context({"task_type": "sampling_distribution"}))
    assert not any("zne" in i for i in ids)
    assert "readout" in ids


def test_dynamic_circuits_lose_every_zne_candidate():
    """Invariant 12."""
    ids = offered_ids(context({"has_dynamic_circuit": True}))
    assert not any("zne" in i for i in ids)


def test_dd_with_no_idle_exposure_is_absent_not_zero_benefit():
    """Invariant 9: do not offer a technique whose modelled benefit is zero."""
    ids = offered_ids(context({"idle_exposure": 0.0}))
    assert "dd_readout" not in ids
    assert "dd_zne_readout" not in ids
    assert "zne" in ids


def test_no_twirling_only_candidate_is_ever_generated(healthy_context):
    """Invariant 10: twirling is a modifier; MISSION section 18's Twirling+Readout is not built."""
    ids = [s.id for s in strategies()]
    assert "twirling_readout" not in ids
    assert not any(s.techniques == ("pauli_twirling",) for s in strategies())
    for candidate in generate(healthy_context):
        assert "pauli_twirling" not in candidate.strategy.techniques


def test_twirling_rides_along_as_a_modifier_on_zne(healthy_context):
    zne = next(c for c in generate(healthy_context) if c.strategy.id == "zne")
    assert zne.applied_modifiers == ("pauli_twirling",)


def test_pec_is_offered_as_an_estimate_but_is_never_recommendable(healthy_context):
    candidates = generate(healthy_context)
    pec = next(c for c in candidates if c.strategy.id == "pec_estimate")
    assert pec.strategy.executable is False
    assert pec.strategy.provenance == "planning_estimate"
    assert pec not in recommendable(candidates)


def test_pec_disappears_without_a_gate_error_model():
    ids = offered_ids(context(backend_overrides={"provides_gate_error_model": False}))
    assert "pec_estimate" not in ids


def test_an_incompatible_technique_never_reaches_a_candidate():
    """Invariant 8 / RECON-19: not generated means it can never be recommended."""
    ctx = context(backend_overrides={"provides_readout_calibration": False})
    for candidate in generate(ctx):
        assert "readout_mitigation" not in candidate.strategy.techniques


def test_dd_plus_zne_candidate_carries_the_reinsertion_precondition(healthy_context):
    candidate = next(c for c in generate(healthy_context) if c.strategy.id == "dd_zne_readout")
    assert candidate.verdict == "conditional"
    assert any("after folding" in r or "AFTER" in r for r in candidate.requires)


def test_rejected_candidates_explain_themselves():
    """The section 22 Explorer needs the reason, not just the absence."""
    rejected = [c for c in evaluate_all(context({"task_type": "sampling_distribution"})) if not c.offered]
    assert rejected
    for candidate in rejected:
        assert candidate.blockers
        assert all(b.reason_code for b in candidate.blockers)
