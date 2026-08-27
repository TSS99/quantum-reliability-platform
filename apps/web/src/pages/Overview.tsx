import { Card, ExplainedScore, StatusBadge, SeriesTag } from '../components/ui';
import { Rail } from '../components/Rail';

// Phase-2 Overview: demonstrates the design system on real components. Every number here is
// an ILLUSTRATIVE placeholder (provenance = demo), not a measurement — Phase 4 wires the
// seeded demo data via ReliabilityDataSource. Nothing claims to be a hardware result.
export function Overview() {
  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="rail-h">
        <h2 id="rail-h" className="mb-3 text-eyebrow uppercase text-text-secondary">
          Reliability transformation
        </h2>
        <Card className="p-4">
          <Rail states={{ circuit: 'complete', hardware: 'complete', noise: 'active' }} />
        </Card>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <ExplainedScore
          label="Reliability Health (illustrative)"
          value={0.72}
          terms={[
            { label: 'Calibration validity', weight: 0.4, contribution: 0.34 },
            { label: 'Strategy fit', weight: 0.35, contribution: 0.26 },
            { label: 'Goal feasibility', weight: 0.25, contribution: 0.12 },
          ]}
          formula="w1·calibration + w2·strategy_fit + w3·feasibility"
        />
        <Card className="p-4">
          <h3 className="mb-3 text-eyebrow uppercase text-text-secondary">Status semantics</h3>
          <div className="flex flex-wrap gap-2">
            <StatusBadge state="healthy" />
            <StatusBadge state="warning" />
            <StatusBadge state="critical" />
            <StatusBadge state="uncertain" />
          </div>
          <h3 className="mb-2 mt-4 text-eyebrow uppercase text-text-secondary">
            Series (a different scale)
          </h3>
          <div className="flex flex-wrap gap-4">
            <SeriesTag series="raw" />
            <SeriesTag series="mitigated" />
            <SeriesTag series="logical" />
          </div>
        </Card>
      </div>

      <p className="text-body-s text-text-muted">
        All figures above are illustrative design-system placeholders, not measurements. Seeded demo
        data and live panels arrive in a later phase.
      </p>
    </div>
  );
}
