import { Link } from 'react-router-dom';
import { ArrowRight, TrendingDown } from 'lucide-react';
import { Card } from './ui';
import { fmtSci } from './charts/scale';

export interface QecEscalationProps {
  /** Best expected error any physical-level strategy achieved, within the constraints. */
  bestRmse: number;
  targetError: number;
  /** Physical error rate assumed for the chosen hardware — carried into QEC planning. */
  physicalErrorRate: number;
  backendId: string;
}

/**
 * The QEM ceiling.
 *
 * This is the moment the product exists for: mitigation has a floor, and past it the honest answer
 * is not "try harder", it is "you need error correction". Rather than leaving QEC as a separate lab
 * the user has to rediscover, this states the ceiling in the workflow and hands the context over.
 */
export function QecEscalation({ bestRmse, targetError, physicalErrorRate, backendId }: QecEscalationProps) {
  const shortfall = bestRmse / targetError;
  return (
    <Card className="border-series-logical/30 p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-control border border-series-logical/40 bg-bg-raised">
          <TrendingDown size={16} className="text-series-logical" aria-hidden />
        </span>
        <div className="min-w-0">
          <h3 className="text-heading-m text-series-logical">QEM ceiling reached</h3>
          <p className="mt-1 text-body-s text-text-secondary">
            No physical-level strategy is predicted to reach{' '}
            <span className="metric text-text-primary">{fmtSci(targetError)}</span> on{' '}
            <span className="metric text-text-primary">{backendId}</span> within your constraints. The
            best available is <span className="metric text-text-primary">{fmtSci(bestRmse)}</span> —{' '}
            <span className="metric text-state-warning">{shortfall.toFixed(1)}×</span> above target.
          </p>
          <p className="mt-2 text-body-s text-text-secondary">
            Mitigation reduces bias; it does not create logical qubits. Below this floor the remaining
            route is error <em>correction</em> — encoding into a distance-d code and paying in physical
            qubits and syndrome rounds instead of shots.
          </p>

          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-control border border-border-hairline bg-bg-base p-2.5 text-caption sm:grid-cols-4">
            <div>
              <dt className="text-text-muted">carried target</dt>
              <dd className="metric text-text-primary">{fmtSci(targetError)}</dd>
            </div>
            <div>
              <dt className="text-text-muted">QEM floor</dt>
              <dd className="metric text-text-primary">{fmtSci(bestRmse)}</dd>
            </div>
            <div>
              <dt className="text-text-muted">physical error</dt>
              <dd className="metric text-text-primary">{fmtSci(physicalErrorRate)}</dd>
            </div>
            <div>
              <dt className="text-text-muted">regime</dt>
              <dd className="metric text-series-logical">QEC</dd>
            </div>
          </dl>

          <Link
            to={`/qec-lab?target=${encodeURIComponent(targetError)}&p=${encodeURIComponent(physicalErrorRate)}&from=analysis`}
            className="mt-3 inline-flex items-center gap-2 rounded-control border border-series-logical/50 px-3.5 py-2 text-body-s text-series-logical transition-colors hover:bg-row-hover"
          >
            Explore QEC requirements
            <ArrowRight size={15} aria-hidden />
          </Link>
          <p className="mt-1.5 text-caption text-text-muted">
            Carries the workload target and physical error assumption into QEC planning.
          </p>
        </div>
      </div>
    </Card>
  );
}
