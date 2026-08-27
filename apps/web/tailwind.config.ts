import type { Config } from 'tailwindcss';
import { colors, spacing, borderRadius, fontSize, fontFamily } from './src/styles/tailwind-tokens';

// Colors/spacing/radius/fonts are GENERATED from docs/data/design_tokens.json
// (see src/styles/tailwind-tokens.ts). They resolve to CSS vars, so a [data-theme]
// switch on <html> retints the whole app with no rebuild.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors,
      spacing,
      borderRadius,
      fontSize,
      fontFamily,
    },
  },
  plugins: [],
} satisfies Config;
