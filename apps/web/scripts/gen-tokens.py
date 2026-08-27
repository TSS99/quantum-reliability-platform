import json, os

ROOT = r"D:\CDAC Projects\Error_mitegation_Correction_Platform\qrp"
tok = json.load(open(os.path.join(ROOT, "docs/data/design_tokens.json"), encoding="utf-8"))

def cssvar(name):  # bg.base -> --color-bg-base
    return "--color-" + name.replace(".", "-")

def emit_colors(theme):
    lines = []
    for k, v in tok["color"][theme].items():
        lines.append(f"  {cssvar(k)}: {v};")
    return "\n".join(lines)

spacing = "\n".join(f"  --space-{k.replace('.','_')}: {v};" for k, v in tok["spacing"].items())
radius = "\n".join(f"  --radius-{k}: {v};" for k, v in tok["radius"].items())
motion = "\n".join(f"  --dur-{k.replace('.','-')}: {v};" for k, v in tok["motion"]["duration"].items())
fam = tok["typography"]["family"]

out = f"""/* GENERATED from docs/data/design_tokens.json — do not edit by hand.
   Regenerate via scripts/gen-tokens (design tokens are the source of truth). */

/* Dark-first: :root carries the dark palette (RECON-27). */
:root {{
{emit_colors('dark')}

  --font-display: {fam['display']};
  --font-body: {fam['body']};
  --font-mono: {fam['mono']};

{spacing}
{radius}
{motion}

  --focus-ring: {tok['focus']['style']};
}}

/* Light at parity — both themes are authored, neither derived. */
:root[data-theme="light"] {{
{emit_colors('light')}
}}

@media (prefers-color-scheme: light) {{
  :root:not([data-theme="dark"]) {{
{emit_colors('light')}
  }}
}}
"""

dest = os.path.join(ROOT, "apps/web/src/styles/tokens.css")
open(dest, "w", encoding="utf-8", newline="\n").write(out)
print("wrote", dest, "-", len(out), "bytes")

# --- Tailwind token map (colors reference the CSS vars so theme switching is free) ---
# Flat, unambiguous keys (dotted -> hyphen) so e.g. state.healthy and state.healthy.bg
# coexist. Tailwind classes read bg-bg-surface / text-text-primary / text-state-critical.
import json as _json
colors = {k.replace(".", "-"): f"var({cssvar(k)})" for k in tok["color"]["dark"].keys()}
spacing_map = {k: f"var(--space-{k.replace('.','_')})" for k in tok["spacing"]}
radius_map = {k: f"var(--radius-{k})" for k in tok["radius"]}

font_size = {}
for k, s in tok["typography"]["scale"].items():
    opts = {"lineHeight": s["line"], "letterSpacing": s.get("tracking", "0"),
            "fontWeight": str(s["weight"])}
    font_size[k.replace(".", "-")] = [s["size"], opts]

ts = (
    "// GENERATED from docs/data/design_tokens.json — do not edit by hand.\n"
    "// Colors resolve to CSS vars (tokens.css), so a [data-theme] switch retints everything.\n"
    "export const colors = " + _json.dumps(colors, indent=2) + " as const;\n\n"
    "export const spacing = " + _json.dumps(spacing_map, indent=2) + " as const;\n\n"
    "export const borderRadius = " + _json.dumps(radius_map, indent=2) + " as const;\n\n"
    "export const fontSize = " + _json.dumps(font_size, indent=2) + " as const;\n\n"
    "export const fontFamily = {\n"
    "  display: ['var(--font-display)'],\n"
    "  body: ['var(--font-body)'],\n"
    "  mono: ['var(--font-mono)'],\n"
    "} as const;\n"
)
tsdest = os.path.join(ROOT, "apps/web/src/styles/tailwind-tokens.ts")
open(tsdest, "w", encoding="utf-8", newline="\n").write(ts)
print("wrote", tsdest, "-", len(ts), "bytes")
