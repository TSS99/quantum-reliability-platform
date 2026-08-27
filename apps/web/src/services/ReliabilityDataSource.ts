// The FE/BE seam (RECON / MISSION §49). Components depend on this interface, never on a
// concrete data origin. DemoReliabilityDataSource (static/seeded) powers the GitHub Pages
// build; ApiReliabilityDataSource (Phase 3+) will call the FastAPI backend with an
// identical, snake_case, byte-compatible contract — so the swap needs no UI changes.

export type ExecutionMode = 'demo_replay' | 'local_simulation' | 'hardware';

export interface ReliabilityDataSource {
  /** True for the static demo provider; the UI surfaces a "Demo Data" badge when set. */
  readonly isDemo: boolean;
  /** Recent experiment runs for the Overview dashboard. Shapes land with the backend
   *  contract in Phase 4 — typed as unknown here to avoid inventing fields early. */
  listRecentRuns(): Promise<unknown[]>;
}

/** Phase-2 stub: declares the seam and the demo flag; real seeded data arrives in Phase 4
 *  from demo-data/ (§33 deterministic fixtures). It returns nothing rather than faking rows. */
export class DemoReliabilityDataSource implements ReliabilityDataSource {
  readonly isDemo = true;
  async listRecentRuns(): Promise<unknown[]> {
    return [];
  }
}

export const dataSource: ReliabilityDataSource = new DemoReliabilityDataSource();
