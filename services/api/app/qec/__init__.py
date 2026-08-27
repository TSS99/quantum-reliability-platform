"""QEC simulation module (docs/QEC_METHODS.md, docs/QEC_V1_SIMULATION_PLAN.md).

Only the dependency-free surface is re-exported here. `app.qec.simulate` imports stim and pymatching
at module level and is imported explicitly by callers, so configuration validation and the §6
statistics stay testable without the simulation toolchain installed.
"""
from app.qec.config import SimulationConfig, physical_qubits, validate
from app.qec.decoders import DECODERS, REAL_DECODERS, not_implemented_row
from app.qec.errors import QecConfigError
from app.qec.statistics import per_round_rate, summarize, wilson_interval

__all__ = [
    "DECODERS",
    "REAL_DECODERS",
    "QecConfigError",
    "SimulationConfig",
    "not_implemented_row",
    "per_round_rate",
    "physical_qubits",
    "summarize",
    "validate",
    "wilson_interval",
]
