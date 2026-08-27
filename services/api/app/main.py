"""QRP backend — FastAPI modular monolith. Skeleton: /health only.

Domain models, QEM/QEC engines, optimizer and preflight are added in Phases 3+.
Product name/version are centralized here (MISSION §2).
"""
from fastapi import FastAPI

QRP_NAME = "Quantum Reliability Platform"
QRP_VERSION = "0.1.0"

app = FastAPI(title=QRP_NAME, version=QRP_VERSION)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "qrp_version": QRP_VERSION}
