// Access to the committed QEC fixture grid (RECON-15).
//
// The grid is REAL simulated output — Stim + PyMatching, 216 rows, seeded — produced by
// scripts/generate_qec_fixtures.py and committed under demo-data/qec/. It is loaded here as raw
// text and parsed once, for two reasons: components must reach fixtures through the data-source
// seam rather than importing a 127 KB JSON module (§49), and a `?raw` import keeps TypeScript
// from inferring a structural type for several thousand literal fields on every typecheck.
//
// RECON-15 is absolute: a selection that is not on the grid is reported as off-grid with its
// nearest neighbour named. Nothing is ever interpolated.

import gridRaw from '../../../../demo-data/qec/threshold_grid.json?raw';
import manifestRaw from '../../../../demo-data/qec/manifest.json?raw';
import type { QecCode, QecNoiseModel, ThresholdGridFile, ThresholdGridRow } from './contracts';

export interface QecManifest {
  schema_version: string;
  generated_at_utc: string;
  generator_script: string;
  generator_git_sha: string;
  method_ref: string;
  stim_version: string;
  pymatching_version: string;
  master_seed: number;
  task_count: number;
  shot_budget: { max_shots: number; max_errors: number };
  axes: {
    codes: QecCode[];
    distances: number[];
    noise_models: QecNoiseModel[];
    p_grids: Record<QecNoiseModel, number[]>;
    decoders: Record<string, string>;
  };
  physical_qubits: Record<QecCode, Record<string, number>>;
}

let gridCache: ThresholdGridFile | null = null;
let manifestCache: QecManifest | null = null;

export function thresholdGrid(): ThresholdGridFile {
  gridCache ??= JSON.parse(gridRaw) as ThresholdGridFile;
  return gridCache;
}

export function qecManifest(): QecManifest {
  manifestCache ??= JSON.parse(manifestRaw) as QecManifest;
  return manifestCache;
}

export interface CurveSelection {
  code: QecCode;
  noise_model: QecNoiseModel;
  distances: number[];
}

export interface ThresholdCurve {
  distance: number;
  physical_qubits: number;
  rows: ThresholdGridRow[];
}

/** One curve per requested distance, sorted by physical error rate. Distances with no rows on
 *  the grid come back with an empty `rows` array rather than being silently dropped. */
export function thresholdCurves(sel: CurveSelection): ThresholdCurve[] {
  const { rows } = thresholdGrid();
  const qubits = qecManifest().physical_qubits[sel.code] ?? {};
  return sel.distances.map((distance) => ({
    distance,
    physical_qubits: qubits[String(distance)] ?? 0,
    rows: rows
      .filter((r) => r.code === sel.code && r.noise_model === sel.noise_model && r.distance === distance)
      .sort((a, b) => a.p - b.p),
  }));
}

export type GridStatus = 'on_grid' | 'off_grid';

export interface GridLookup {
  grid_status: GridStatus;
  row: ThresholdGridRow | null;
  /** Named when the request is off-grid, so the UI can say WHICH point it would have to use. */
  nearest_p: number | null;
}

/** RECON-15: exact match or nothing. `nearest_p` is offered as a suggestion the user can act
 *  on, never substituted into the answer. */
export function lookupPoint(
  code: QecCode,
  noise_model: QecNoiseModel,
  distance: number,
  p: number,
): GridLookup {
  const candidates = thresholdGrid().rows.filter(
    (r) => r.code === code && r.noise_model === noise_model && r.distance === distance,
  );
  const exact = candidates.find((r) => Math.abs(r.p - p) < 1e-12);
  if (exact) return { grid_status: 'on_grid', row: exact, nearest_p: exact.p };

  let nearest: number | null = null;
  let bestGap = Infinity;
  for (const r of candidates) {
    const gap = Math.abs(Math.log10(r.p) - Math.log10(p));
    if (gap < bestGap) {
      bestGap = gap;
      nearest = r.p;
    }
  }
  return { grid_status: 'off_grid', row: null, nearest_p: nearest };
}

/** RECON-18: the repetition code has no true threshold — only a bit-flip pseudo-threshold. The
 *  UI must never print a single threshold number from three distances, so this returns the
 *  semantics label rather than a value. */
export function thresholdSemantics(code: QecCode): { has_threshold: boolean; label: string } {
  return code === 'repetition'
    ? {
        has_threshold: false,
        label:
          'Pseudo-threshold, bit-flip only. The repetition code protects against one error type, so the crossing point below is not a fault-tolerance threshold.',
      }
    : {
        has_threshold: true,
        label:
          'Threshold behaviour: below the crossing, a larger code distance gives a lower logical error rate. Read the crossing region, not a single number.',
      };
}

export function physicalQubitsFor(code: QecCode, distance: number): number {
  return qecManifest().physical_qubits[code]?.[String(distance)] ?? 0;
}
