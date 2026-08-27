"""QEC simulation configuration and its validation (QEC_METHODS.md §1-§3, §8.8).

Pure data + rules. Imports neither stim nor pymatching, so config rejection is testable without the
simulation toolchain installed.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from app.qec.errors import QecConfigError

Code = Literal["repetition", "rotated_surface"]
NoiseModel = Literal["code_capacity", "phenomenological", "circuit_level"]

CODES: tuple[str, ...] = ("repetition", "rotated_surface")
NOISE_MODELS: tuple[str, ...] = ("code_capacity", "phenomenological", "circuit_level")
V1_DISTANCES: tuple[int, ...] = (3, 5, 7)

_STIM_GENERATOR = {
    "repetition": "repetition_code:memory",
    "rotated_surface": "surface_code:rotated_memory_z",
}

# QEC_METHODS.md §3: one scalar knob `p` drives all three tiers via the stim generator kwargs.
# Order: (before_round_data_depolarization, before_measure_flip, after_reset_flip, after_clifford_depol)
_NOISE_KNOBS = {
    "code_capacity": (True, False, False, False),
    "phenomenological": (True, True, False, False),
    "circuit_level": (True, True, True, True),
}

THRESHOLD_SEMANTICS = {
    "repetition": "pseudo_threshold_bitflip_only",
    "rotated_surface": "true_threshold",
}


def default_rounds(code: str, noise_model: str, distance: int) -> int:
    """§1/§3: rounds = 1 for code-capacity (a documented rounds=1 proxy), otherwise rounds = d."""
    del code  # rounds depend only on the tier and the distance in V1
    return 1 if noise_model == "code_capacity" else distance


def physical_qubits(code: str, distance: int) -> int:
    """§2.3 memory-patch count for ONE logical qubit. Not a full-stack resource estimate."""
    return 2 * distance - 1 if code == "repetition" else 2 * distance * distance - 1


@dataclass(frozen=True)
class SimulationConfig:
    code: Code
    distance: int
    noise_model: NoiseModel
    p: float
    decoder_id: str = "mwpm_pymatching"
    rounds: int | None = None
    max_shots: int = 100_000
    max_errors: int = 1_000
    seed: int = 0

    def resolved_rounds(self) -> int:
        return self.rounds if self.rounds is not None else default_rounds(
            self.code, self.noise_model, self.distance
        )

    def stim_generator(self) -> str:
        return _STIM_GENERATOR[self.code]

    def noise_kwargs(self) -> dict[str, float]:
        data, measure, reset, clifford = _NOISE_KNOBS[self.noise_model]
        return {
            "before_round_data_depolarization": self.p if data else 0.0,
            "before_measure_flip_probability": self.p if measure else 0.0,
            "after_reset_flip_probability": self.p if reset else 0.0,
            "after_clifford_depolarization": self.p if clifford else 0.0,
        }


def validate(config: SimulationConfig) -> SimulationConfig:
    """§8.8: impossible configs are rejected with a structured reason code, never simulated."""
    if config.code not in CODES:
        raise QecConfigError(f"unknown code {config.code!r}", field="code", allowed=list(CODES))
    if config.noise_model not in NOISE_MODELS:
        raise QecConfigError(
            f"unknown noise model {config.noise_model!r}",
            field="noise_model",
            allowed=list(NOISE_MODELS),
        )
    if config.distance < 3 or config.distance % 2 == 0:
        raise QecConfigError(
            f"distance must be odd and >= 3, got {config.distance}",
            field="distance",
            allowed=list(V1_DISTANCES),
        )
    if not (0.0 <= config.p <= 1.0):
        raise QecConfigError(f"p must be in [0, 1], got {config.p}", field="p", allowed="[0, 1]")
    if config.resolved_rounds() < 1:
        raise QecConfigError(
            f"rounds must be >= 1, got {config.resolved_rounds()}", field="rounds", allowed=">= 1"
        )
    if config.max_shots < 1:
        raise QecConfigError(
            f"max_shots must be >= 1, got {config.max_shots}", field="max_shots", allowed=">= 1"
        )
    return config
