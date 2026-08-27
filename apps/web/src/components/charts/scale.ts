// Small scale + formatting helpers for the SVG charts (no external chart lib).
export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function linScale(d0: number, d1: number, r0: number, r1: number) {
  const m = (r1 - r0) / (d1 - d0 || 1);
  return (v: number) => r0 + (v - d0) * m;
}

/** log10 scale that tolerates zero/negatives by clamping to `floor`. */
export function logScale(d0: number, d1: number, r0: number, r1: number, floor = 1e-6) {
  const l0 = Math.log10(Math.max(d0, floor));
  const l1 = Math.log10(Math.max(d1, floor));
  const m = (r1 - r0) / (l1 - l0 || 1);
  return (v: number) => r0 + (Math.log10(Math.max(v, floor)) - l0) * m;
}

export const decades = (min: number, max: number, floor = 1e-6) => {
  const lo = Math.floor(Math.log10(Math.max(min, floor)));
  const hi = Math.ceil(Math.log10(Math.max(max, floor)));
  const out: number[] = [];
  for (let e = lo; e <= hi; e++) out.push(10 ** e);
  return out;
};

export const fmtSci = (v: number) => {
  if (v === 0) return '0';
  const e = Math.floor(Math.log10(Math.abs(v)));
  if (e >= -1 && e <= 3) return v.toLocaleString(undefined, { maximumSignificantDigits: 3 });
  return v.toExponential(1).replace('e', '×10^').replace('+', '');
};

export const money = (v: number) => '$' + v.toLocaleString(undefined, { maximumFractionDigits: v < 10 ? 2 : 0 });
