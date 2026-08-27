import { Link } from 'react-router-dom';
import { Rail } from '../components/Rail';
import { Button } from '../components/ui';

// Public landing (MISSION §15). Phase-2 version: the real one-sentence value prop, the
// signature Rail, and the primary CTA into the app. Full sections arrive in Phase 4.
export function Landing() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 bg-bg-base px-6 text-text-primary">
      <div>
        <p className="text-eyebrow uppercase text-series-mitigated">Quantum Reliability Platform</p>
        <h1 className="mt-2 text-display-l">Reliability intelligence for quantum workloads.</h1>
        <p className="mt-3 max-w-2xl text-body-m text-text-secondary">
          Analyze the circuit, evaluate the hardware, choose an error-management strategy, estimate
          the cost, and verify whether it actually helped.
        </p>
      </div>
      <Rail mode="marketing" states={{ circuit: 'complete', hardware: 'active' }} />
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/overview">
          <Button>Launch Reliability Lab</Button>
        </Link>
        <a
          href="#workflow"
          className="text-body-s text-text-secondary underline-offset-4 hover:text-text-primary hover:underline"
        >
          Explore the workflow
        </a>
      </div>
    </main>
  );
}
