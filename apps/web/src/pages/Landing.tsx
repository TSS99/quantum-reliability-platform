import { Link } from 'react-router-dom';
import { ArrowRight, Activity, Gauge, ShieldCheck, Layers } from 'lucide-react';
import { Rail } from '../components/Rail';

const CAPABILITIES = [
  { Icon: Gauge, title: 'Preflight intelligence', body: 'Decide whether a workload should run at all — before it burns QPU time.' },
  { Icon: Activity, title: 'Reliability optimizer', body: 'Compare every strategy on expected error, cost and runtime. Pick the frontier.' },
  { Icon: Layers, title: 'QEM + QEC planning', body: 'One control plane across mitigation, detection and correction.' },
  { Icon: ShieldCheck, title: 'Verified evidence', body: 'Every run keeps a receipt: what was claimed, and what actually held.' },
];

const STEPS = ['Submit workload', 'Analyze circuit', 'Profile hardware', 'Generate strategies', 'Compare cost & error', 'Execute or reject', 'Verify', 'Receipt'];

export function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-bg-base text-text-primary">
      <div className="qo-field" aria-hidden />

      <main className="relative z-10 mx-auto max-w-6xl px-6 py-20 md:py-28">
        {/* ---------------------------------------------------------- hero */}
        <section className="qo-rise" style={{ ['--i' as string]: 0 }}>
          <div className="mb-5 inline-flex items-center gap-2 rounded-chip border border-border-hairline px-3 py-1 text-caption text-text-secondary qo-glass">
            <span className="qo-pulse inline-block h-1.5 w-1.5 rounded-full bg-series-mitigated" />
            Interactive prototype · seeded demo data
          </div>

          <h1 className="max-w-4xl text-display-l leading-[1.05] md:text-[3.5rem]">
            Reliability intelligence for{' '}
            <span className="bg-gradient-to-r from-series-mitigated to-series-logical bg-clip-text text-transparent qo-text-glow">
              quantum workloads
            </span>
          </h1>

          <p className="mt-5 max-w-2xl text-body-m text-text-secondary md:text-[1.0625rem]">
            Analyze the circuit, evaluate the hardware, choose an error-management strategy,
            estimate the cost — and verify whether it actually helped. One control plane spanning
            error mitigation, detection and correction.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/overview"
              className="group inline-flex items-center gap-2 rounded-control bg-action-bg px-5 py-2.5 text-body-s font-medium text-action-fg transition-transform duration-200 hover:-translate-y-0.5"
            >
              Launch Reliability Lab
              <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
            </Link>
            <a
              href="#workflow"
              className="rounded-control border border-border-control px-5 py-2.5 text-body-s text-text-secondary transition-colors hover:bg-row-hover hover:text-text-primary"
            >
              Explore the workflow
            </a>
          </div>
        </section>

        {/* ------------------------------------------------- signature rail */}
        <section className="qo-rise relative mt-16 overflow-hidden rounded-card p-5 qo-glass qo-lit qo-sweep" style={{ ['--i' as string]: 1 }}>
          <div className="mb-4 flex items-center justify-between">
            <span className="text-eyebrow uppercase text-text-secondary">Reliability transformation</span>
            <span className="text-caption text-text-muted">circuit → verified result</span>
          </div>
          <Rail mode="marketing" states={{ circuit: 'complete', hardware: 'complete', noise: 'active' }} />
        </section>

        {/* -------------------------------------------------- capabilities */}
        <section className="mt-20">
          <h2 className="text-eyebrow uppercase text-text-secondary">Four core capabilities</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {CAPABILITIES.map((c, i) => (
              <div
                key={c.title}
                className="qo-rise qo-hover rounded-card p-5 qo-glass"
                style={{ ['--i' as string]: i + 2 }}
              >
                <c.Icon size={18} className="text-series-mitigated" aria-hidden />
                <h3 className="mt-3 text-heading-m">{c.title}</h3>
                <p className="mt-1 text-body-s text-text-secondary">{c.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------ workflow */}
        <section id="workflow" className="mt-20 scroll-mt-8">
          <h2 className="text-eyebrow uppercase text-text-secondary">How it works</h2>
          <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li
                key={s}
                className="qo-rise flex items-center gap-3 rounded-control border border-border-hairline px-3 py-2.5"
                style={{ ['--i' as string]: i + 2 }}
              >
                <span className="metric text-metric-s text-series-mitigated">{String(i + 1).padStart(2, '0')}</span>
                <span className="text-body-s text-text-secondary">{s}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* ----------------------------------------------------- continuum */}
        <section className="mt-20">
          <h2 className="text-eyebrow uppercase text-text-secondary">The QEM → QEC continuum</h2>
          <div className="mt-4 overflow-x-auto">
            <div className="flex min-w-max items-center gap-3">
              {['Suppression', 'Mitigation', 'Detection', 'Correction', 'Fault tolerance'].map((s, i, arr) => (
                <div key={s} className="flex items-center gap-3">
                  <span className="rounded-chip border border-border-hairline px-3 py-1.5 text-body-s text-text-primary qo-glass">{s}</span>
                  {i < arr.length - 1 && <span className="text-text-muted" aria-hidden>→</span>}
                </div>
              ))}
            </div>
          </div>
          <p className="mt-3 max-w-2xl text-body-s text-text-muted">
            Mitigation does not disappear when correction arrives. The platform is designed across the
            transition, not on one side of it.
          </p>
        </section>

        {/* ----------------------------------------------------- final cta */}
        <section className="mt-20 rounded-card p-8 text-center qo-glass qo-lit">
          <h2 className="text-display-m">See it decide</h2>
          <p className="mx-auto mt-2 max-w-xl text-body-s text-text-secondary">
            Pick a workload, set a reliability goal, and watch the optimizer rule strategies in — or out.
          </p>
          <Link
            to="/new-analysis"
            className="mt-6 inline-flex items-center gap-2 rounded-control bg-action-bg px-5 py-2.5 text-body-s font-medium text-action-fg transition-transform duration-200 hover:-translate-y-0.5"
          >
            Run an analysis <ArrowRight size={16} aria-hidden />
          </Link>
        </section>

        <footer className="mt-16 text-center text-caption text-text-muted">
          All figures are illustrative, computed in-browser from seeded demo data — never hardware measurements.
        </footer>
      </main>
    </div>
  );
}
