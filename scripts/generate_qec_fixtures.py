"""Generate the committed QEC fixture grid (docs/QEC_V1_SIMULATION_PLAN.md).

GitHub Pages cannot run stim, so the deployed prototype replays a seeded grid produced here by the
SAME service the local `POST /api/v1/qec/simulate` uses (`services/api/app/qec`). This script owns no
simulation logic of its own - if it did, the demo could disagree with the backend and the demo would
be a lie by construction.

    python scripts/generate_qec_fixtures.py [--max-shots N] [--max-errors N] [--master-seed N]

Writes demo-data/qec/{threshold_grid,decoder_comparison,manifest}.json and fails if the total exceeds
the 200 KB budget (RECON-15).
"""
from __future__ import annotations

import argparse
import hashlib
import json
import platform
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "services" / "api"))

import numpy as np  # noqa: E402
import pymatching  # noqa: E402
import stim  # noqa: E402

from app.qec.config import SimulationConfig, physical_qubits  # noqa: E402
from app.qec.decoders import DECODERS, not_implemented_row  # noqa: E402
from app.qec.simulate import run_simulation  # noqa: E402

OUT_DIR = REPO_ROOT / "demo-data" / "qec"
SIZE_BUDGET_BYTES = 200 * 1024
SCHEMA_VERSION = "qec-fixture/1"
QRP_VERSION = "0.1.0"

CODES = ("repetition", "rotated_surface")
DISTANCES = (3, 5, 7)
# Plan section 3.1: each tier brackets the d=3/5/7 crossing so the chart shows the crossing itself.
P_RANGES = {
    "code_capacity": (0.01, 0.20),
    "phenomenological": (0.003, 0.06),
    "circuit_level": (0.0005, 0.01),
}
POINTS_PER_TIER = 12

# One key set for every row in every file, so a consumer never has to branch on presence.
ROW_FIELDS = (
    "code", "distance", "rounds", "noise_model", "p",
    "shots", "logical_errors",
    "logical_error_rate", "ler_ci_low", "ler_ci_high",
    "logical_error_rate_per_round", "lerpr_ci_low", "lerpr_ci_high",
    "per_round_null_reason", "detection_event_rate",
    "decoder_id", "decoder_status", "not_implemented_reason", "decoder_seconds_per_shot",
    "physical_qubits", "insufficient_statistics", "threshold_semantics", "seed",
)

UNITS = {
    "p": "probability_0_1",
    "logical_error_rate": "probability_0_1",
    "logical_error_rate_per_round": "probability_0_1",
    "detection_event_rate": "probability_0_1",
    "decoder_seconds_per_shot": "seconds",
    "physical_qubits": "count",
    "shots": "count",
    "logical_errors": "count",
}


def sig(value: float, digits: int = 4) -> float:
    return float(f"{value:.{digits}g}")


def p_grid(noise_model: str) -> list[float]:
    lo, hi = P_RANGES[noise_model]
    return [sig(v) for v in np.geomspace(lo, hi, POINTS_PER_TIER)]


def normalise(row: dict) -> dict:
    """Project onto ROW_FIELDS and round floats - the fixture is a chart source, not raw data."""
    out = {}
    for field in ROW_FIELDS:
        value = row.get(field)
        out[field] = sig(value, 6) if isinstance(value, float) else value
    return out


def tasks() -> list[tuple[str, SimulationConfig]]:
    """The frozen enumeration. Index in this list IS the per-task seed offset (plan section 4)."""
    out: list[tuple[str, SimulationConfig]] = []
    for code in CODES:
        for distance in DISTANCES:
            for noise_model in P_RANGES:
                for p in p_grid(noise_model):
                    out.append(("threshold_grid", SimulationConfig(
                        code=code, distance=distance, noise_model=noise_model, p=p,
                    )))
    for distance in DISTANCES:
        for p in p_grid("circuit_level"):
            out.append(("decoder_comparison", SimulationConfig(
                code="repetition", distance=distance, noise_model="circuit_level", p=p,
            )))
    return out


def declared_rows() -> list[dict]:
    """Every NOT_IMPLEMENTED decoder appears once, with null metrics and a reason."""
    return [
        normalise(not_implemented_row(
            decoder_id,
            code="repetition", noise_model="circuit_level",
            threshold_semantics="pseudo_threshold_bitflip_only",
        ))
        for decoder_id, spec in DECODERS.items()
        if spec["status"] != "REAL"
    ]


def write_file(path: Path, rows: list[dict], manifest_ref: str) -> dict:
    payload = {
        "schema_version": SCHEMA_VERSION,
        "qrp_version": QRP_VERSION,
        "data_provenance": "simulated",
        "execution_mode": "demo_replay",
        "units": UNITS,
        "manifest_ref": manifest_ref,
        "rows": rows,
    }
    text = json.dumps(payload, separators=(",", ":"))
    path.write_text(text, encoding="utf-8")
    return {
        "row_count": len(rows),
        "bytes": len(text.encode("utf-8")),
        "sha256": hashlib.sha256(text.encode("utf-8")).hexdigest(),
    }


def git_sha() -> str | None:
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "HEAD"], cwd=REPO_ROOT, text=True
        ).strip()
    except Exception:
        return None


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate the QEC demo fixture grid.")
    parser.add_argument("--max-shots", type=int, default=100_000)
    parser.add_argument("--max-errors", type=int, default=1_000)
    parser.add_argument("--master-seed", type=int, default=20260827)
    args = parser.parse_args()

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    plan = tasks()
    buckets: dict[str, list[dict]] = {"threshold_grid": [], "decoder_comparison": []}
    started = time.perf_counter()

    for index, (bucket, base) in enumerate(plan):
        config = SimulationConfig(
            code=base.code, distance=base.distance, noise_model=base.noise_model, p=base.p,
            decoder_id="mwpm_pymatching",
            max_shots=args.max_shots, max_errors=args.max_errors,
            seed=args.master_seed + index,
        )
        buckets[bucket].append(normalise(run_simulation(config)))
        elapsed = time.perf_counter() - started
        print(
            f"[{index + 1}/{len(plan)}] {config.code} d={config.distance} "
            f"{config.noise_model} p={config.p} ({elapsed:.0f}s)",
            file=sys.stderr, flush=True,
        )

    buckets["decoder_comparison"].extend(declared_rows())

    manifest_ref = "demo-data/qec/manifest.json"
    files = {
        name: write_file(OUT_DIR / f"{name}.json", rows, manifest_ref)
        for name, rows in buckets.items()
    }

    manifest = {
        "schema_version": SCHEMA_VERSION,
        "qrp_version": QRP_VERSION,
        "generated_at_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "generator_script": "scripts/generate_qec_fixtures.py",
        "generator_git_sha": git_sha(),
        "method_ref": "docs/QEC_METHODS.md",
        "plan_ref": "docs/QEC_V1_SIMULATION_PLAN.md",
        "python_version": platform.python_version(),
        "platform": platform.platform(),
        "stim_version": stim.__version__,
        "pymatching_version": pymatching.__version__,
        "numpy_version": np.__version__,
        "master_seed": args.master_seed,
        "seed_rule": (
            "seed = master_seed + index, where index is the position of "
            "(bucket, code, distance, noise_model, p) in task_enumeration"
        ),
        "task_enumeration": [
            {"index": i, "bucket": b, "code": c.code, "distance": c.distance,
             "noise_model": c.noise_model, "p": c.p}
            for i, (b, c) in enumerate(plan)
        ],
        "shot_budget": {"max_shots": args.max_shots, "max_errors": args.max_errors},
        "axes": {
            "codes": list(CODES),
            "distances": list(DISTANCES),
            "noise_models": list(P_RANGES),
            "p_grids": {tier: p_grid(tier) for tier in P_RANGES},
            "decoders": {d: spec["status"] for d, spec in DECODERS.items()},
        },
        "physical_qubits": {
            code: {str(d): physical_qubits(code, d) for d in DISTANCES} for code in CODES
        },
        "files": files,
    }
    manifest_text = json.dumps(manifest, separators=(",", ":"))
    (OUT_DIR / "manifest.json").write_text(manifest_text, encoding="utf-8")

    total = sum(f["bytes"] for f in files.values()) + len(manifest_text.encode("utf-8"))
    print(f"Total {total} bytes across {len(files) + 1} files", file=sys.stderr)
    if total > SIZE_BUDGET_BYTES:
        print(
            f"FAIL: {total} bytes exceeds the {SIZE_BUDGET_BYTES}-byte budget (RECON-15). "
            "Drop an axis; do not drop the check.",
            file=sys.stderr,
        )
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
