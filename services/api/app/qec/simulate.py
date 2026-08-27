"""The QEC simulation service: a thin wrapper over stim + pymatching (QEC_METHODS.md §3-§7).

Nothing here is hand-rolled — no stabilizer simulator, no syndrome circuit, no detector error model,
no matching graph, no MWPM (RECON-16). This module builds the stim circuit, decomposes its DEM,
samples, decodes with PyMatching, and hands the counts to `statistics.summarize`.

It deviates from QEC_V1_SIMULATION_PLAN.md §5.1 in one respect: sampling is driven directly rather
than through `sinter.collect`. sinter's sharding across workers makes bitwise reproduction
version- and worker-count-dependent (the plan's own §5.2 caveat); a single seeded
`CompiledDetectorSampler` drained in fixed-size batches is deterministic by construction and removes
a multiprocessing dependency on Windows. Early stopping on `max_errors` is kept.
"""
from __future__ import annotations

import time

import numpy as np
import pymatching
import stim

from app.qec import statistics
from app.qec.config import (
    THRESHOLD_SEMANTICS,
    SimulationConfig,
    physical_qubits,
    validate,
)
from app.qec.decoders import DECODERS, not_implemented_row

BATCH_SHOTS = 10_000


def build_circuit(config: SimulationConfig) -> stim.Circuit:
    """§3: the noise tier is expressed purely through generator kwargs; no circuit editing."""
    return stim.Circuit.generated(
        config.stim_generator(),
        rounds=config.resolved_rounds(),
        distance=config.distance,
        **config.noise_kwargs(),
    )


def build_dem(circuit: stim.Circuit) -> stim.DetectorErrorModel:
    """§4.2: `decompose_errors=True` is MANDATORY.

    Without it the DEM keeps hyperedges a matching decoder cannot represent, Y-type errors are
    silently mishandled, and the reported logical error rate is wrong. Asserted by a test so the
    flag cannot regress into a convention.
    """
    return circuit.detector_error_model(decompose_errors=True)


def build_matcher(dem: stim.DetectorErrorModel) -> pymatching.Matching:
    return pymatching.Matching.from_detector_error_model(dem)


def run_simulation(config: SimulationConfig) -> dict[str, object]:
    """Simulate one grid point. Returns a flat row; every metric is measured or null, never guessed."""
    validate(config)
    spec = DECODERS.get(config.decoder_id)
    if spec is None:
        from app.qec.errors import QecConfigError

        raise QecConfigError(
            f"unknown decoder {config.decoder_id!r}",
            field="decoder_id",
            allowed=sorted(DECODERS),
        )

    rounds = config.resolved_rounds()
    base = {
        "code": config.code,
        "distance": config.distance,
        "rounds": rounds,
        "noise_model": config.noise_model,
        "p": config.p,
        "physical_qubits": physical_qubits(config.code, config.distance),
        "threshold_semantics": THRESHOLD_SEMANTICS[config.code],
        "data_provenance": "simulated",
        "execution_mode": "local_simulation",
    }

    if spec["status"] != "REAL":
        row = not_implemented_row(config.decoder_id, **base)
        row["per_round_null_reason"] = None
        row["seed"] = None
        row["stim_version"] = stim.__version__
        row["pymatching_version"] = pymatching.__version__
        return row

    if config.code not in spec["codes"]:
        from app.qec.errors import QecConfigError

        raise QecConfigError(
            f"decoder {config.decoder_id!r} does not support code {config.code!r}",
            field="decoder_id",
            allowed=sorted(d for d, s in DECODERS.items() if config.code in s["codes"]),
        )

    circuit = build_circuit(config)
    dem = build_dem(circuit)
    matcher = build_matcher(dem)
    sampler = circuit.compile_detector_sampler(seed=config.seed)
    num_observables = circuit.num_observables

    shots = 0
    errors = 0
    detections = 0
    detector_slots = 0
    decode_seconds = 0.0

    while shots < config.max_shots and errors < config.max_errors:
        batch = min(BATCH_SHOTS, config.max_shots - shots)
        dets, obs = sampler.sample(batch, separate_observables=True)
        started = time.perf_counter()
        predictions = matcher.decode_batch(dets)
        decode_seconds += time.perf_counter() - started
        if predictions.shape[1] < num_observables:
            # A noiseless (or observable-free) DEM yields no fault ids; predict "no flip".
            predictions = np.pad(
                predictions, ((0, 0), (0, num_observables - predictions.shape[1]))
            )
        errors += int(np.count_nonzero(np.any(predictions != obs, axis=1)))
        detections += int(np.count_nonzero(dets))
        detector_slots += dets.size
        shots += batch

    row = dict(base)
    row.update(statistics.summarize(errors, shots, rounds))
    row["detection_event_rate"] = detections / detector_slots if detector_slots else 0.0
    row["decoder_id"] = config.decoder_id
    row["decoder_status"] = "REAL"
    row["not_implemented_reason"] = None
    row["decoder_seconds_per_shot"] = decode_seconds / shots
    row["seed"] = config.seed
    row["stim_version"] = stim.__version__
    row["pymatching_version"] = pymatching.__version__
    return row
