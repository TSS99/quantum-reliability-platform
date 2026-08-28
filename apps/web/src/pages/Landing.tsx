import { Link } from 'react-router-dom';
import { ArrowRight, Activity, Gauge, ShieldCheck, Layers, Sparkles } from 'lucide-react';
import { Rail } from '../components/Rail';
import { Reveal, KineticText, CountUp, useTilt } from '../components/motion';

const CAPABILITIES = [
  { Icon: Gauge, title: 'Preflight intelligence', body: 'Decide whether a workload should run at all — before it burns QPU time.' },
  { Icon: Activity, title: 'Reliability optimizer', body: 'Compare every strategy on expected error, cost and runtime. Pick the frontier.' },
  { Icon: Layers, title: 'QEM + QEC planning', body: 'One control plane across mitigation, detection and correction.' },
  { Icon: ShieldCheck, title: 'Verified evidence', body: 'Every run keeps a receipt: what was claimed, and what actually held.' },
];

const STEPS = ['Submit workload', 'Analyze circuit', 'Profile hardware', 'Generate strategies', 'Compare cost & error', 'Execute or reject', 'Verify', 'Receipt'];
const CONTINUUM = ['Suppression', 'Mitigation', 'Detection', 'Correction', 'Fault tolerance'];

function TiltCard({ Icon, title, body }: (typeof CAPABILITIES)[number]) {
  const ref = useTilt<HTMLDivElement>(7);
  return (
    <div ref={ref} className="hx-tilt hx-spot hx-border hx-shine rounded-card p-6 qo-glass">
      <div className="hx-tilt-inner">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-control border border-border-hairline bg-bg-raised/60">
          <Icon size={18} className="text-series-mitigated" aria-hidden />
        </span>
        <h3 className="mt-4 text-heading-m">{title}</h3>
        <p className="mt-1.5 text-body-s text-text-secondary">{body}</p>
      </div>
    </div>
  );
}

export function Landing() {
  return (
    <div className="hx-grain relative min-h-screen overflow-x-hidden bg-bg-base text-text-primary">
      <div className="qo-field" aria-hidden />

      <main className="relative z-10 mx-auto max-w-6xl px-6 py-20 md:py-28">
        {/* ---------------------------------------------------------- hero */}
        <section>
          <div className="hx-border mb-6 inline-flex items-center gap-2 rounded-chip border border-border-hairline px-3 py-1.5 text-caption text-text-secondary qo-glass">
            <span className="qo-pulse inline-block h-1.5 w-1.5 rounded-full bg-series-mitigated" />
            Interactive prototype · seeded demo data
          </div>

          {/* The gradient line is NOT split into per-character spans: background-clip:text cannot
              clip onto inline-block children, which renders them invisible. It gets its own
              block-level reveal instead. */}
          <h1 className="max-w-4xl text-display-l leading-[1.04] md:text-[4rem]">
            <KineticText text="Reliability intelligence for" />{' '}
            <span className="hx-gradline hx-breathe bg-gradient-to-r from-series-mitigated via-series-mitigated to-series-logical bg-clip-text text-transparent">
              quantum workloads
            </span>
          </h1>

          <Reveal delay={420}>
            <p className="mt-6 max-w-2xl text-body-m text-text-secondary md:text-[1.0625rem]">
              Analyze the circuit, evaluate the hardware, choose an error-management strategy,
              estimate the cost — and verify whether it actually helped. One control plane spanning
              error mitigation, detection and correction.
            </p>
          </Reveal>

          <Reveal delay={560}>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                to="/overview"
                className="hx-mag hx-shine hx-border group inline-flex items-center gap-2 rounded-control bg-action-bg px-6 py-3 text-body-s font-semibold text-action-fg"
              >
                Launch Reliability Lab
                <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
              </Link>
              <a
                href="#workflow"
                className="hx-mag inline-flex items-center gap-2 rounded-control border border-border-control px-6 py-3 text-body-s text-text-secondary hover:text-text-primary"
              >
                <Sparkles size={15} aria-hidden /> Explore the workflow
              </a>
            </div>
          </Reveal>

          {/* live stat strip */}
          <Reveal delay={700}>
            <dl className="mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-card border border-border-hairline bg-border-hairline sm:grid-cols-4">
              {[
                { k: 'Strategies compared', v: 7, s: '' },
                { k: 'Demo backends', v: 3, s: '' },
                { k: 'QEC grid points', v: 216, s: '' },
                { k: 'Automated tests', v: 151, s: '' },
              ].map((m) => (
                <div key={m.k} className="bg-bg-surface/80 px-4 py-5 backdrop-blur-sm">
                  <dd className="metric text-metric-l text-text-primary qo-text-glow">
                    <CountUp to={m.v} suffix={m.s} />
                  </dd>
                  <dt className="mt-0.5 text-caption text-text-muted">{m.k}</dt>
                </div>
              ))}
            </dl>
          </Reveal>
        </section>

        {/* ------------------------------------------------- signature rail */}
        <Reveal as="scale" className="mt-24">
          <section className="hx-border hx-scan relative overflow-hidden rounded-card p-6 qo-glass" style={{ ['--scan-h' as string]: '220px' }}>
            <div className="mb-5 flex items-center justify-between">
              <span className="text-eyebrow uppercase text-text-secondary">Reliability transformation</span>
              <span className="text-caption text-text-muted">circuit → verified result</span>
            </div>
            <Rail mode="marketing" states={{ circuit: 'complete', hardware: 'complete', noise: 'active' }} />
            <div className="hx-beam mt-5 h-px w-full bg-border-hairline" aria-hidden />
          </section>
        </Reveal>

        {/* -------------------------------------------------- capabilities */}
        <section className="mt-24">
          <Reveal>
            <h2 className="text-eyebrow uppercase text-text-secondary">Four core capabilities</h2>
          </Reveal>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {CAPABILITIES.map((c, i) => (
              <Reveal key={c.title} as={i % 2 === 0 ? 'left' : 'right'} delay={i * 90}>
                <TiltCard {...c} />
              </Reveal>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------ workflow */}
        <section id="workflow" className="mt-24 scroll-mt-10">
          <Reveal>
            <h2 className="text-eyebrow uppercase text-text-secondary">How it works</h2>
          </Reveal>
          <ol className="mt-5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <Reveal key={s} delay={i * 70}>
                <li className="hx-spot hx-shine group flex items-center gap-3 rounded-control border border-border-hairline px-3.5 py-3 transition-colors hover:border-border-control">
                  <span className="metric text-metric-s text-series-mitigated transition-transform duration-300 group-hover:scale-110">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="text-body-s text-text-secondary">{s}</span>
                </li>
              </Reveal>
            ))}
          </ol>
        </section>

        {/* ----------------------------------------------------- continuum */}
        <section className="mt-24">
          <Reveal>
            <h2 className="text-eyebrow uppercase text-text-secondary">The QEM → QEC continuum</h2>
          </Reveal>
          <Reveal delay={120}>
            <div className="mt-5 overflow-x-auto pb-2">
              <div className="flex min-w-max items-center gap-3">
                {CONTINUUM.map((s, i, arr) => (
                  <div key={s} className="flex items-center gap-3">
                    <span className="hx-border hx-shine rounded-chip border border-border-hairline px-4 py-2 text-body-s text-text-primary qo-glass">
                      {s}
                    </span>
                    {i < arr.length - 1 && (
                      <span className="hx-beam h-px w-10 bg-border-hairline" aria-hidden />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
          <Reveal delay={200}>
            <p className="mt-4 max-w-2xl text-body-s text-text-muted">
              Mitigation does not disappear when correction arrives. The platform is designed across the
              transition, not on one side of it.
            </p>
          </Reveal>
        </section>

        {/* ----------------------------------------------------- final cta */}
        <Reveal as="scale" className="mt-24">
          <section className="hx-border hx-shine relative overflow-hidden rounded-card p-10 text-center qo-glass">
            <h2 className="text-display-m">See it decide</h2>
            <p className="mx-auto mt-3 max-w-xl text-body-s text-text-secondary">
              Pick a workload, set a reliability goal, and watch the optimizer rule strategies in — or out.
            </p>
            <Link
              to="/new-analysis"
              className="hx-mag hx-border mt-7 inline-flex items-center gap-2 rounded-control bg-action-bg px-6 py-3 text-body-s font-semibold text-action-fg"
            >
              Run an analysis <ArrowRight size={16} aria-hidden />
            </Link>
          </section>
        </Reveal>

        <footer className="mt-16 text-center text-caption text-text-muted">
          All figures are illustrative, computed in-browser from seeded demo data — never hardware measurements.
        </footer>
      </main>
    </div>
  );
}
