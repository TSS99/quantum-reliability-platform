"""QRP backend — FastAPI modular monolith (MISSION §10).

Mounts the v1 REST surface (app/api/v1.py) over the real engines: the QEM catalog, the two-stage
optimizer + preflight, the Stim/PyMatching QEC simulator and the DemoProvider.
Product name/version are centralized here (MISSION §2).
"""
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import router as v1_router

QRP_NAME = "Quantum Reliability Platform"
QRP_VERSION = "0.1.0"

#: The static prototype is served from a different origin to this API, so the browser needs CORS.
#: An explicit allowlist, never "*": this API accepts a user's IBM token in a header, and a
#: wildcard would let any page on the internet ask a visitor's browser to send it here.
DEFAULT_ORIGINS = "https://tss99.github.io,http://localhost:5173,http://localhost:4173"


def allowed_origins() -> list[str]:
    raw = os.environ.get("QRP_ALLOWED_ORIGINS", DEFAULT_ORIGINS)
    return [o.strip() for o in raw.split(",") if o.strip()]


app = FastAPI(title=QRP_NAME, version=QRP_VERSION)
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins(),
    allow_credentials=False,  # the token is an explicit header, never an ambient cookie
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "X-QRP-IBM-Token"],
)
app.include_router(v1_router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "qrp_version": QRP_VERSION}
