/**
 * The hero scene.
 *
 * Drawn rather than photographed, deliberately. The composition it replaces — a cryostat lit from
 * the right, instrument overlays reading across the dark — is the right image for this product, but
 * the half that carries the meaning is the overlay: a noisy trace resolving into a clean signal is
 * literally what mitigation does, and the lattice is a coupling map. Those are ours, so they are
 * generated here from the same functions the product reasons about instead of being illustrated.
 *
 * The cryostat is kept as a silhouette — stage plates and rods, gold rim-lit, half out of frame —
 * because it is set dressing, and a suggestion of it costs nothing and never looks like bad CGI.
 *
 * Everything is deterministic: a seeded PRNG, evaluated once at module load. The scene is identical
 * on every render and every machine, so it can be diffed and screenshot-tested like any other output.
 */

/** Deterministic LCG — no Math.random, so the "noise" is fixed and reviewable. */
function prng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 0x100000000) * 2 - 1;
}

/** A drawn edge, resolved to coordinates so nothing has to index back into the node array. */
interface Seg {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const W = 1600;
const H = 900;

/**
 * The thesis curve: a sine buried in noise on the left, emerging clean on the right.
 * amplitude(x) = e^(-k·x) — the same exponential shape a bias-suppressed estimator traces as
 * more structure is applied. Left edge is raw hardware; right edge is what you asked for.
 */
function signalPath(seed: number, yMid: number, amp: number, noiseGain: number) {
  const rand = prng(seed);
  const pts: string[] = [];
  for (let i = 0; i <= 420; i++) {
    const t = i / 420;
    const x = t * 700;
    const clean = Math.sin(t * 26) * amp;
    const noise = rand() * noiseGain * Math.exp(-4.2 * t);
    const y = yMid + clean + noise;
    pts.push(`${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return pts.join('');
}

/** A coupling lattice — the same object the hardware pages render, at poster scale. */
const LATTICE = (() => {
  const nodes: { x: number; y: number; hot: 0 | 1 | 2 }[] = [];
  const edges: Seg[] = [];
  const cols = 7;
  const rows = 5;
  const rand = prng(4471);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = rand();
      nodes.push({
        x: 1318 + c * 40,
        y: 636 + r * 38,
        hot: v > 0.72 ? 1 : v < -0.82 ? 2 : 0,
      });
    }
  }
  const link = (i: number, j: number) => {
    const a = nodes[i];
    const b = nodes[j];
    if (a && b) edges.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
  };
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      if (c < cols - 1) link(i, i + 1);
      if (r < rows - 1) link(i, i + cols);
    }
  }
  return { nodes, edges };
})();

const NOISY = signalPath(1337, 118, 15, 44);

export function HeroScene() {
  return (
    <svg
      className="h-full w-full"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      focusable="false"
    >
      <defs>
        {/* Gold rim-light — the cryostat is lit from behind and to the right. */}
        <radialGradient id="hs-rim" cx="76%" cy="34%" r="52%">
          <stop offset="0%" stopColor="#d9a441" stopOpacity="0.30" />
          <stop offset="45%" stopColor="#8a6320" stopOpacity="0.13" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hs-gold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#6b4d18" stopOpacity="0.30" />
          <stop offset="38%" stopColor="#e6bc63" stopOpacity="0.78" />
          <stop offset="62%" stopColor="#f3d79b" stopOpacity="0.92" />
          <stop offset="100%" stopColor="#5c4114" stopOpacity="0.34" />
        </linearGradient>
        {/* The trace fades in from the left: raw at the edge, resolved by mid-frame. */}
        <linearGradient id="hs-trace" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgb(var(--glow-cyan))" stopOpacity="0.10" />
          <stop offset="26%" stopColor="rgb(var(--glow-cyan))" stopOpacity="0.62" />
          <stop offset="100%" stopColor="rgb(var(--glow-cyan))" stopOpacity="0.95" />
        </linearGradient>
        <filter id="hs-bloom" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="7" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect width={W} height={H} fill="url(#hs-rim)" />

      <g opacity="0.62">

      {/* --------------------------------------------------- cryostat silhouette */}
      {/* Four stage plates falling away into the frame, rods between them. Suggestion only. */}
      <g opacity="0.5">
        {[0, 1, 2, 3].map((i) => {
          const cy = 120 + i * 205;
          const rx = 250 - i * 22;
          return (
            <g key={i}>
              {Array.from({ length: 11 }, (_, k) => {
                const x = 1530 - rx + (k * (rx * 2)) / 10;
                return (
                  <line
                    key={k}
                    x1={x}
                    y1={cy}
                    x2={x + 5}
                    y2={cy + 190}
                    stroke="url(#hs-gold)"
                    strokeWidth="2.5"
                    opacity="0.42"
                  />
                );
              })}
              <ellipse
                cx={1530}
                cy={cy}
                rx={rx}
                ry={rx * 0.13}
                fill="none"
                stroke="url(#hs-gold)"
                strokeWidth="5"
              />
            </g>
          );
        })}
      </g>

      {/* ------------------------------------------------------------ instrument */}
      {/* graticule */}
      <g stroke="rgb(var(--glow-cyan))" strokeOpacity="0.07" strokeWidth="1">
        {Array.from({ length: 12 }, (_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 80} x2={W} y2={i * 80} />
        ))}
        {Array.from({ length: 14 }, (_, i) => (
          <line key={`v${i}`} x1={i * 120} y1="0" x2={i * 120} y2={H} />
        ))}
      </g>

      {/* the thesis: noise resolving into signal */}
      <g transform="translate(-40 0)" filter="url(#hs-bloom)">
        <path d={NOISY} fill="none" stroke="url(#hs-trace)" strokeWidth="2.1" strokeLinejoin="round" />
      </g>

      {/* coupling lattice */}
      <g opacity="0.55">
        {LATTICE.edges.map((e, i) => (
          <line
            key={i}
            x1={e.x1}
            y1={e.y1}
            x2={e.x2}
            y2={e.y2}
            stroke="rgb(var(--glow-cyan))"
            strokeOpacity="0.22"
            strokeWidth="1.2"
          />
        ))}
        {LATTICE.nodes.map((n, i) => (
          <circle
            key={i}
            cx={n.x}
            cy={n.y}
            r="3.6"
            fill={
              n.hot === 1
                ? 'rgb(var(--glow-cyan))'
                : n.hot === 2
                  ? 'rgb(var(--glow-violet))'
                  : 'rgb(var(--glow-cyan))'
            }
            fillOpacity={n.hot ? 0.95 : 0.34}
          />
        ))}
      </g>
      </g>
    </svg>
  );
}
