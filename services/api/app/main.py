"""QRP backend — FastAPI modular monolith (MISSION §10).

Mounts the v1 REST surface (app/api/v1.py) over the real engines: the QEM catalog, the two-stage
optimizer + preflight, the Stim/PyMatching QEC simulator and the DemoProvider.
Product name/version are centralized here (MISSION §2).
"""
from fastapi import FastAPI

from app.api.v1 import router as v1_router

QRP_NAME = "Quantum Reliability Platform"
QRP_VERSION = "0.1.0"

app = FastAPI(title=QRP_NAME, version=QRP_VERSION)
app.include_router(v1_router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "qrp_version": QRP_VERSION}
