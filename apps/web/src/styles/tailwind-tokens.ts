// GENERATED from docs/data/design_tokens.json — do not edit by hand.
// Colors resolve to CSS vars (tokens.css), so a [data-theme] switch retints everything.
export const colors = {
  "bg-sunken": "var(--color-bg-sunken)",
  "bg-base": "var(--color-bg-base)",
  "bg-surface": "var(--color-bg-surface)",
  "bg-raised": "var(--color-bg-raised)",
  "bg-overlay": "var(--color-bg-overlay)",
  "border-hairline": "var(--color-border-hairline)",
  "border-control": "var(--color-border-control)",
  "border-strong": "var(--color-border-strong)",
  "text-primary": "var(--color-text-primary)",
  "text-secondary": "var(--color-text-secondary)",
  "text-muted": "var(--color-text-muted)",
  "text-inverse": "var(--color-text-inverse)",
  "action-bg": "var(--color-action-bg)",
  "action-fg": "var(--color-action-fg)",
  "action-hover": "var(--color-action-hover)",
  "action-active": "var(--color-action-active)",
  "action-disabled-bg": "var(--color-action-disabled-bg)",
  "action-disabled-fg": "var(--color-action-disabled-fg)",
  "focus-inner": "var(--color-focus-inner)",
  "focus-outer": "var(--color-focus-outer)",
  "row-hover": "var(--color-row-hover)",
  "row-selected": "var(--color-row-selected)",
  "row-selected-bar": "var(--color-row-selected-bar)",
  "state-healthy": "var(--color-state-healthy)",
  "state-warning": "var(--color-state-warning)",
  "state-critical": "var(--color-state-critical)",
  "state-uncertain": "var(--color-state-uncertain)",
  "series-raw": "var(--color-series-raw)",
  "series-mitigated": "var(--color-series-mitigated)",
  "series-logical": "var(--color-series-logical)",
  "state-healthy-bg": "var(--color-state-healthy-bg)",
  "state-warning-bg": "var(--color-state-warning-bg)",
  "state-critical-bg": "var(--color-state-critical-bg)",
  "state-uncertain-bg": "var(--color-state-uncertain-bg)",
  "rail-trace": "var(--color-rail-trace)",
  "rail-trace-raw": "var(--color-rail-trace-raw)",
  "rail-graticule": "var(--color-rail-graticule)",
  "rail-plate": "var(--color-rail-plate)"
} as const;

export const spacing = {
  "0": "var(--space-0)",
  "0.5": "var(--space-0_5)",
  "1": "var(--space-1)",
  "1.5": "var(--space-1_5)",
  "2": "var(--space-2)",
  "3": "var(--space-3)",
  "4": "var(--space-4)",
  "5": "var(--space-5)",
  "6": "var(--space-6)",
  "8": "var(--space-8)",
  "10": "var(--space-10)",
  "12": "var(--space-12)",
  "16": "var(--space-16)",
  "24": "var(--space-24)"
} as const;

export const borderRadius = {
  "none": "var(--radius-none)",
  "control": "var(--radius-control)",
  "card": "var(--radius-card)",
  "modal": "var(--radius-modal)",
  "chip": "var(--radius-chip)"
} as const;

export const fontSize = {
  "display-l": [
    "2rem",
    {
      "lineHeight": "1.15",
      "letterSpacing": "-0.02em",
      "fontWeight": "600"
    }
  ],
  "display-m": [
    "1.5rem",
    {
      "lineHeight": "1.20",
      "letterSpacing": "-0.015em",
      "fontWeight": "600"
    }
  ],
  "heading-l": [
    "1.25rem",
    {
      "lineHeight": "1.30",
      "letterSpacing": "-0.01em",
      "fontWeight": "600"
    }
  ],
  "heading-m": [
    "1rem",
    {
      "lineHeight": "1.40",
      "letterSpacing": "0",
      "fontWeight": "600"
    }
  ],
  "eyebrow": [
    "0.8125rem",
    {
      "lineHeight": "1.40",
      "letterSpacing": "0.08em",
      "fontWeight": "600"
    }
  ],
  "body-m": [
    "1rem",
    {
      "lineHeight": "1.50",
      "letterSpacing": "0",
      "fontWeight": "400"
    }
  ],
  "body-s": [
    "0.875rem",
    {
      "lineHeight": "1.45",
      "letterSpacing": "0",
      "fontWeight": "400"
    }
  ],
  "caption": [
    "0.75rem",
    {
      "lineHeight": "1.40",
      "letterSpacing": "0.01em",
      "fontWeight": "400"
    }
  ],
  "metric-xl": [
    "2rem",
    {
      "lineHeight": "1.10",
      "letterSpacing": "-0.01em",
      "fontWeight": "500"
    }
  ],
  "metric-l": [
    "1.5rem",
    {
      "lineHeight": "1.15",
      "letterSpacing": "-0.01em",
      "fontWeight": "500"
    }
  ],
  "metric-m": [
    "1.125rem",
    {
      "lineHeight": "1.25",
      "letterSpacing": "0",
      "fontWeight": "500"
    }
  ],
  "metric-s": [
    "0.875rem",
    {
      "lineHeight": "1.30",
      "letterSpacing": "0",
      "fontWeight": "400"
    }
  ],
  "code": [
    "0.8125rem",
    {
      "lineHeight": "1.60",
      "letterSpacing": "0",
      "fontWeight": "400"
    }
  ]
} as const;

export const fontFamily = {
  display: ['var(--font-display)'],
  body: ['var(--font-body)'],
  mono: ['var(--font-mono)'],
} as const;
