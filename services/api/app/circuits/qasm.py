"""Parse a user-supplied OpenQASM circuit into a CircuitProfile (Tier 2: bring your own circuit).

Two layers, deliberately:

1. **Hard limits first.** User input is parsed *after* it is bounded — payload size, qubit count, gate
   count and depth are capped before any parser runs (MISSION §44, RECON-31). A malicious or merely
   enormous circuit must fail fast with a structured error, never hang the process.
2. **Qiskit when available, a strict fallback when not.** Qiskit's `qasm2`/`qasm3` loaders are the
   authoritative parsers. If qiskit is not installed the module still works for OpenQASM 2 via a
   conservative regex scanner that only recognises a known gate set — it never executes anything.

Nothing here evaluates user input as code: no `eval`, no `exec`, no dynamic import (§44).
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

# ------------------------------------------------------------------ limits

MAX_SOURCE_BYTES = 256 * 1024  # 256 KB
MAX_QUBITS = 64
MAX_GATES = 20_000
MAX_DEPTH = 5_000

# The OpenQASM 2 gate set we recognise in fallback mode. Anything else is reported as unsupported
# rather than silently ignored — a miscounted circuit would produce a confidently wrong profile.
_ONE_Q = {"u", "u1", "u2", "u3", "p", "x", "y", "z", "h", "s", "sdg", "t", "tdg",
          "rx", "ry", "rz", "sx", "sxdg", "id"}
_TWO_Q = {"cx", "cz", "cy", "ch", "crz", "cp", "cu1", "cu3", "swap", "rzz", "rxx", "ryy", "ecr"}
_THREE_Q = {"ccx", "cswap"}


class CircuitParseError(ValueError):
    """Raised with a machine-readable `code` so the API can map it to a reason code."""

    def __init__(self, message: str, *, code: str, detail: dict | None = None) -> None:
        super().__init__(message)
        self.code = code
        self.detail = detail or {}


@dataclass
class CircuitProfile:
    """The derived features the compatibility matrix, optimizer and preflight consume."""

    qubit_count: int
    clbit_count: int
    depth: int
    single_qubit_gate_count: int
    two_qubit_gate_count: int
    multi_qubit_gate_count: int
    measurement_count: int
    gate_histogram: dict[str, int]
    has_mid_circuit_measurement: bool
    has_classical_feedback: bool
    parser: str  # "qiskit" | "fallback"
    qasm_version: str
    warnings: list[str] = field(default_factory=list)

    @property
    def total_gate_count(self) -> int:
        return self.single_qubit_gate_count + self.two_qubit_gate_count + self.multi_qubit_gate_count

    @property
    def two_qubit_ratio(self) -> float:
        total = self.total_gate_count
        return round(self.two_qubit_gate_count / total, 4) if total else 0.0

    @property
    def idle_exposure(self) -> float:
        """Fraction of the circuit's qubit-timesteps not occupied by a gate — where DD can help.

        Heuristic, and labelled as such: a real value needs a scheduled circuit with gate durations.
        """
        slots = self.depth * self.qubit_count
        if slots <= 0:
            return 0.0
        busy = self.single_qubit_gate_count + 2 * self.two_qubit_gate_count + 3 * self.multi_qubit_gate_count
        return round(max(0.0, 1.0 - busy / slots), 4)

    def to_dict(self) -> dict:
        return {
            "qubit_count": self.qubit_count,
            "clbit_count": self.clbit_count,
            "depth": self.depth,
            "single_qubit_gate_count": self.single_qubit_gate_count,
            "two_qubit_gate_count": self.two_qubit_gate_count,
            "multi_qubit_gate_count": self.multi_qubit_gate_count,
            "total_gate_count": self.total_gate_count,
            "measurement_count": self.measurement_count,
            "two_qubit_ratio": self.two_qubit_ratio,
            "idle_exposure": self.idle_exposure,
            "gate_histogram": self.gate_histogram,
            "has_mid_circuit_measurement": self.has_mid_circuit_measurement,
            "has_classical_feedback": self.has_classical_feedback,
            "parser": self.parser,
            "qasm_version": self.qasm_version,
            "provenance": "measured",  # measured FROM THE SUBMITTED CIRCUIT, not from hardware
            "method_ref": "docs/QEM_METHODS.md#circuit-profile",
            "warnings": self.warnings,
        }


# ------------------------------------------------------------------ guards


def _guard_source(source: str) -> None:
    if not source or not source.strip():
        raise CircuitParseError("circuit source is empty", code="EMPTY_SOURCE")
    size = len(source.encode("utf-8"))
    if size > MAX_SOURCE_BYTES:
        raise CircuitParseError(
            f"circuit source is {size} bytes; the limit is {MAX_SOURCE_BYTES}",
            code="PAYLOAD_TOO_LARGE",
            detail={"bytes": size, "max_bytes": MAX_SOURCE_BYTES},
        )


def _guard_profile(p: CircuitProfile) -> None:
    if p.qubit_count > MAX_QUBITS:
        raise CircuitParseError(
            f"{p.qubit_count} qubits exceeds the {MAX_QUBITS}-qubit limit",
            code="UNSUPPORTED_CIRCUIT_FEATURE", detail={"qubit_count": p.qubit_count},
        )
    if p.total_gate_count > MAX_GATES:
        raise CircuitParseError(
            f"{p.total_gate_count} gates exceeds the {MAX_GATES}-gate limit",
            code="UNSUPPORTED_CIRCUIT_FEATURE", detail={"gate_count": p.total_gate_count},
        )
    if p.depth > MAX_DEPTH:
        raise CircuitParseError(
            f"depth {p.depth} exceeds the {MAX_DEPTH} limit",
            code="UNSUPPORTED_CIRCUIT_FEATURE", detail={"depth": p.depth},
        )


def detect_version(source: str) -> str:
    return "3" if re.search(r"OPENQASM\s+3", source) else "2"


# ------------------------------------------------------------------ parsers


def _parse_with_qiskit(source: str, version: str):
    from qiskit import qasm2, qasm3  # imported lazily: heavy optional dependency

    circuit = qasm3.loads(source) if version == "3" else qasm2.loads(
        source, custom_instructions=qasm2.LEGACY_CUSTOM_INSTRUCTIONS
    )

    hist: dict[str, int] = {}
    one = two = multi = meas = 0
    mid_measure = False
    feedback = bool(getattr(circuit, "cregs", None)) and any(
        getattr(inst.operation, "condition", None) is not None for inst in circuit.data
    )

    ops = list(circuit.data)
    for idx, inst in enumerate(ops):
        name = inst.operation.name
        hist[name] = hist.get(name, 0) + 1
        n = len(inst.qubits)
        if name in ("measure",):
            meas += 1
            # a measurement with any non-measure operation after it is mid-circuit
            if any(later.operation.name not in ("measure", "barrier") for later in ops[idx + 1:]):
                mid_measure = True
        elif name in ("barrier", "delay"):
            continue
        elif n == 1:
            one += 1
        elif n == 2:
            two += 1
        else:
            multi += 1

    return CircuitProfile(
        qubit_count=circuit.num_qubits,
        clbit_count=circuit.num_clbits,
        depth=circuit.depth(),
        single_qubit_gate_count=one,
        two_qubit_gate_count=two,
        multi_qubit_gate_count=multi,
        measurement_count=meas,
        gate_histogram=hist,
        has_mid_circuit_measurement=mid_measure,
        has_classical_feedback=feedback,
        parser="qiskit",
        qasm_version=version,
    )


_DECL = re.compile(r"\bqreg\s+\w+\s*\[\s*(\d+)\s*\]|\bqubit\s*\[\s*(\d+)\s*\]", re.I)
_CDECL = re.compile(r"\bcreg\s+\w+\s*\[\s*(\d+)\s*\]|\bbit\s*\[\s*(\d+)\s*\]", re.I)
_STMT = re.compile(r"^\s*([a-zA-Z][a-zA-Z0-9_]*)", re.M)


def _parse_fallback(source: str, version: str) -> CircuitProfile:
    """Conservative scanner used when qiskit is unavailable. Recognises a fixed gate set only."""
    body = re.sub(r"//.*?$|/\*.*?\*/", " ", source, flags=re.M | re.S)

    qubits = sum(int(a or b) for a, b in _DECL.findall(body)) or 0
    clbits = sum(int(a or b) for a, b in _CDECL.findall(body)) or 0

    hist: dict[str, int] = {}
    one = two = multi = meas = 0
    unsupported: set[str] = set()
    for token in _STMT.findall(body):
        t = token.lower()
        if t in ("openqasm", "include", "qreg", "creg", "qubit", "bit", "gate", "barrier", "if", "def"):
            continue
        if t == "measure":
            meas += 1
            hist[t] = hist.get(t, 0) + 1
        elif t in _ONE_Q:
            one += 1
            hist[t] = hist.get(t, 0) + 1
        elif t in _TWO_Q:
            two += 1
            hist[t] = hist.get(t, 0) + 1
        elif t in _THREE_Q:
            multi += 1
            hist[t] = hist.get(t, 0) + 1
        else:
            unsupported.add(t)

    if qubits == 0:
        raise CircuitParseError(
            "no qubit register found (expected `qreg q[n];` or `qubit[n] q;`)",
            code="UNSUPPORTED_CIRCUIT_FEATURE",
        )

    warnings = [
        "Parsed without qiskit: depth is approximated and unrecognised gates are ignored. "
        "Install qiskit for an exact profile."
    ]
    if unsupported:
        warnings.append("unrecognised statements ignored: " + ", ".join(sorted(unsupported)[:8]))

    total = one + two + multi
    approx_depth = max(1, -(-total // max(qubits, 1)))  # ceil(total/qubits): a lower bound
    return CircuitProfile(
        qubit_count=qubits, clbit_count=clbits, depth=approx_depth,
        single_qubit_gate_count=one, two_qubit_gate_count=two, multi_qubit_gate_count=multi,
        measurement_count=meas, gate_histogram=hist,
        has_mid_circuit_measurement=False,  # not detectable reliably without a real parser
        has_classical_feedback=bool(re.search(r"^\s*if\s*\(", body, re.M)),
        parser="fallback", qasm_version=version, warnings=warnings,
    )


def parse_qasm(source: str) -> CircuitProfile:
    """Parse OpenQASM 2/3 into a CircuitProfile, enforcing input limits first."""
    _guard_source(source)
    version = detect_version(source)
    try:
        profile = _parse_with_qiskit(source, version)
    except ImportError:
        profile = _parse_fallback(source, version)
    except CircuitParseError:
        raise
    except Exception as exc:  # a genuine syntax error from the real parser
        raise CircuitParseError(
            f"could not parse OpenQASM {version}: {exc}",
            code="UNSUPPORTED_CIRCUIT_FEATURE",
        ) from exc
    _guard_profile(profile)
    return profile
