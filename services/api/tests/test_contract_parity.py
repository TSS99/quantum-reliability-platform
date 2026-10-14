"""FE/BE contract parity (EMC-2): the frontend's hand-kept TaskSpec literals must match the
backend's. This is the test that CI-side codegen should eventually make redundant; until the
frontend consumes generated types, this is what catches a repeat of the divergence this card
was opened for (see hive/tasks.json EMC-2).
"""
import re
from pathlib import Path

from app.schemas.goal import TaskMetric, TaskType

CONTRACTS_TS = Path(__file__).resolve().parents[3] / "apps" / "web" / "src" / "services" / "contracts.ts"


def _literal_union(text: str, pattern: str) -> set[str]:
    match = re.search(pattern, text)
    assert match, f"pattern not found in contracts.ts: {pattern}"
    return set(re.findall(r"'([^']+)'", match.group(0)))


def test_frontend_task_type_matches_backend():
    text = CONTRACTS_TS.read_text(encoding="utf-8")
    fe_task_type = _literal_union(text, r"export type TaskType = [^;]+;")
    assert fe_task_type == set(TaskType.__args__)


def test_frontend_task_metric_matches_backend():
    text = CONTRACTS_TS.read_text(encoding="utf-8")
    fe_metric = _literal_union(text, r"metric: '[^;]+';")
    assert fe_metric == set(TaskMetric.__args__)
