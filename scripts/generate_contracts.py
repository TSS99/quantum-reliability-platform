#!/usr/bin/env python3
"""Codegen for packages/contracts (EMC-2 / ADR-0001 / RECON-1).

The backend Pydantic models in services/api are authoritative. This script:
  1. Imports the FastAPI app and dumps its OpenAPI schema to
     packages/contracts/openapi.json.
  2. Converts every schema under components.schemas into a TypeScript
     interface + a matching Zod schema, written to
     packages/contracts/src/generated.ts.

Run from the repo root: `python scripts/generate_contracts.py`.
CI (.github/workflows/ci.yml) re-runs this and fails the build on `git diff`,
so the committed output must never be hand-edited — change the Pydantic
models and regenerate instead.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
API_DIR = REPO_ROOT / "services" / "api"
CONTRACTS_DIR = REPO_ROOT / "packages" / "contracts"

sys.path.insert(0, str(API_DIR))


def load_openapi_schema() -> dict:
    from app.main import app  # noqa: E402  (path injected above)

    return app.openapi()


def _ref_name(ref: str) -> str:
    return ref.split("/")[-1]


def _refs_in(schema: dict) -> set[str]:
    out: set[str] = set()
    if "$ref" in schema:
        out.add(_ref_name(schema["$ref"]))
    for sub in schema.get("anyOf", []):
        out |= _refs_in(sub)
    if schema.get("type") == "array" and "items" in schema:
        out |= _refs_in(schema["items"])
    for sub in schema.get("properties", {}).values():
        out |= _refs_in(sub)
    return out


def _topo_sort(schemas: dict[str, dict]) -> list[str]:
    """Dependencies before dependents, so generated `const ...Schema = z.object(...)` never
    references a const declared later in the file."""
    visited: set[str] = set()
    order: list[str] = []

    def visit(name: str) -> None:
        if name in visited or name not in schemas:
            return
        visited.add(name)
        for dep in sorted(_refs_in(schemas[name])):
            visit(dep)
        order.append(name)

    for name in schemas:
        visit(name)
    return order


def ts_type(schema: dict) -> str:
    if "$ref" in schema:
        return _ref_name(schema["$ref"])
    if "anyOf" in schema:
        non_null = [s for s in schema["anyOf"] if s.get("type") != "null"]
        nullable = len(non_null) != len(schema["anyOf"])
        parts = list(dict.fromkeys(ts_type(s) for s in non_null))
        t = " | ".join(parts)
        return f"{t} | null" if nullable else t
    if "enum" in schema:
        return " | ".join(f"'{v}'" for v in schema["enum"])
    kind = schema.get("type")
    if kind == "string":
        return "string"
    if kind in ("number", "integer"):
        return "number"
    if kind == "boolean":
        return "boolean"
    if kind == "array":
        item = ts_type(schema["items"])
        return f"({item})[]" if "|" in item else f"{item}[]"
    if kind == "object":
        return "Record<string, unknown>"
    return "unknown"


def zod_type(schema: dict) -> str:
    if "$ref" in schema:
        return f"{_ref_name(schema['$ref'])}Schema"
    if "anyOf" in schema:
        non_null = [s for s in schema["anyOf"] if s.get("type") != "null"]
        nullable = len(non_null) != len(schema["anyOf"])
        base = zod_type(non_null[0]) if len(non_null) == 1 else (
            "z.union([" + ", ".join(zod_type(s) for s in non_null) + "])"
        )
        return f"{base}.nullable()" if nullable else base
    if "enum" in schema:
        values = ", ".join(f"'{v}'" for v in schema["enum"])
        return f"z.enum([{values}])"
    kind = schema.get("type")
    if kind == "string":
        return "z.string()"
    if kind == "integer":
        return "z.number().int()"
    if kind == "number":
        return "z.number()"
    if kind == "boolean":
        return "z.boolean()"
    if kind == "array":
        return f"z.array({zod_type(schema['items'])})"
    if kind == "object":
        return "z.record(z.unknown())"
    return "z.unknown()"


def render_interface(name: str, schema: dict) -> str:
    props = schema.get("properties", {})
    required = set(schema.get("required", []))
    if not props:
        return f"export type {name} = Record<string, unknown>;"
    lines = [f"export interface {name} {{"]
    for key, sub in props.items():
        opt = "" if key in required else "?"
        lines.append(f"  {key}{opt}: {ts_type(sub)};")
    lines.append("}")
    return "\n".join(lines)


def render_zod(name: str, schema: dict) -> str:
    props = schema.get("properties", {})
    required = set(schema.get("required", []))
    if not props:
        return (
            f"export const {name}Schema = z.record(z.unknown());\n"
            f"export type {name}Zod = z.infer<typeof {name}Schema>;"
        )
    lines = [f"export const {name}Schema = z.object({{"]
    for key, sub in props.items():
        zt = zod_type(sub)
        if key not in required:
            zt += ".optional()"
        lines.append(f"  {key}: {zt},")
    strict = ").strict()" if schema.get("additionalProperties") is False else ")"
    lines.append(f"}}{strict};")
    lines.append(f"export type {name}Zod = z.infer<typeof {name}Schema>;")
    return "\n".join(lines)


def generate_ts(openapi_schema: dict) -> str:
    schemas: dict[str, dict] = openapi_schema.get("components", {}).get("schemas", {})
    order = _topo_sort(schemas)

    header = (
        "// GENERATED FILE — do not edit by hand.\n"
        "// Run `python scripts/generate_contracts.py` from the repo root to regenerate.\n"
        "// Source of truth: services/api Pydantic models, via openapi.json.\n"
        "import { z } from 'zod';\n"
    )
    blocks = []
    for name in order:
        schema = schemas[name]
        blocks.append(render_interface(name, schema))
        blocks.append(render_zod(name, schema))
    return header + "\n\n" + "\n\n".join(blocks) + "\n"


def main() -> None:
    openapi_schema = load_openapi_schema()

    openapi_path = CONTRACTS_DIR / "openapi.json"
    openapi_path.write_text(json.dumps(openapi_schema, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    generated_ts = generate_ts(openapi_schema)
    src_dir = CONTRACTS_DIR / "src"
    src_dir.mkdir(parents=True, exist_ok=True)
    (src_dir / "generated.ts").write_text(generated_ts, encoding="utf-8")

    print(f"wrote {openapi_path}")
    print(f"wrote {src_dir / 'generated.ts'}")


if __name__ == "__main__":
    main()
