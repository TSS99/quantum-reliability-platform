import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Activity, Gauge, ShieldCheck, Layers, Sparkles } from 'lucide-react';
import { Rail } from '../components/Rail';
import { HeroScene } from '../components/HeroScene';
import { Reveal, CountUp, useTilt } from '../components/motion';
import { WORKLOADS, CIRCUIT_PROFILES, BACKENDS, CALIBRATIONS } from '../services/demoFixtures';
import { DEFAULT_GOAL, optimize } from '../services/demoEngine';
import { fmtSci, money } from '../components/charts/scale';

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

// The app runs on HashRouter, so a plain href="#workflow" would overwrite the router hash
// ("#/" -> "#workflow") and route to nothing — the 404 users hit. Scroll the section into view
// instead and leave the route untouched.
function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
}

const scrollToWorkflow = () => scrollToSection('workflow');

/** In-page nav. A button, not an anchor, because no href can be written here that the router
 *  would not consume — see the note above. */
function SectionLink({ id, children }: { id: string; children: ReactNode }) {
  return (
    <button type="button" onClick={() => scrollToSection(id)} className="hover:text-text-primary">
      {children}
    </button>
  );
}

/** The hero's right-hand side: an actual optimizer run, not an illustration. */
function HeroAnalysis() {
  const w = WORKLOADS[0]!;
  const res = optimize(CIRCUIT_PROFILES[w.workload_id]!, BACKENDS, CALIBRATIONS, DEFAULT_GOAL);
  const bestPerStrategy = new Map<string, (typeof res.plans)[number]>();
  for (const p of res.plans) {
    if (p.feasibility !== 'feasible') continue;
    const prev = bestPerStrategy.get(p.strategy.strategy_id);
    if (!prev || p.rmse.value < prev.rmse.value) bestPerStrategy.set(p.strategy.strategy_id, p);
  }
  const ranked = [...bestPerStrategy.values()].sort((a, b) => a.rmse.value - b.rmse.value).slice(0, 4);
  const best = res.plans.find((p) => p.plan_id === res.recommended_plan_id) ?? null;

  return (
    <div className="rounded-card p-5 qo-glass qo-lit">
      <div className="flex items-baseline justify-between">
        <span className="text-eyebrow uppercase text-text-secondary">Live analysis</span>
        <span className="text-caption text-text-muted">{w.display_name}</span>
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2 border-b border-border-hairline pb-3 text-caption">
        <div><dt className="text-text-muted">target error</dt><dd className="metric text-text-primary">{fmtSci(DEFAULT_GOAL.target_error)}</dd></div>
        <div><dt className="text-text-muted">max cost</dt><dd className="metric text-text-primary">{money(DEFAULT_GOAL.max_cost_usd)}</dd></div>
        <div><dt className="text-text-muted">max time</dt><dd className="metric text-text-primary">{DEFAULT_GOAL.max_runtime_seconds}s</dd></div>
      </dl>

      <table className="mt-3 w-full text-body-s">
        <thead>
          <tr className="text-caption text-text-muted">
            <th className="pb-1 text-left font-medium">Strategy</th>
            <th className="pb-1 text-right font-medium">Error</th>
            <th className="pb-1 text-right font-medium">Cost</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map((p) => {
            const rec = p.plan_id === best?.plan_id;
            return (
              <tr key={p.plan_id} className={rec ? 'text-series-mitigated' : 'text-text-secondary'}>
                <td className="py-1 pr-2">
                  <div className="truncate">{p.strategy.display_name}</div>
                  <div className="text-caption text-text-muted">{p.backend_id}</div>
                </td>
                <td className="metric py-1 text-right">{fmtSci(p.rmse.value)}</td>
                <td className="metric py-1 text-right">{money(p.estimated_cost_usd.value)}{rec ? ' ✓' : ''}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {best && (
        <div className="mt-3 rounded-control border border-border-hairline bg-bg-base p-2.5">
          <div className="text-eyebrow uppercase text-text-secondary">Verdict</div>
          <div className="mt-0.5 text-body-s text-text-primary">
            Run with <span className="text-series-mitigated">{best.strategy.display_name}</span>
          </div>
          <div className="text-caption text-text-muted">
            on {best.backend_id} · computed in your browser from seeded data
          </div>
        </div>
      )}
    </div>
  );
}

export function Landing() {
  return (
    <div className="marketing relative min-h-screen overflow-x-hidden bg-bg-base text-text-primary">
      {/* Hero plate. The scene is drawn, not photographed — see HeroScene for why. A photograph can
          still be layered over it by pointing --hero-image at a file; unset, only the scene shows.
          Scrims below keep body copy at full contrast whichever is in play. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[min(92vh,860px)]" aria-hidden>
        <div className="absolute inset-0"><HeroScene /></div>
        <div
          className="absolute inset-0 bg-cover bg-right bg-no-repeat"
          style={{ backgroundImage: 'var(--hero-image)' }}
        />
        {/* left-to-right scrim: text side stays legible, hardware side stays visible */}
        <div className="absolute inset-0 bg-gradient-to-r from-bg-base via-bg-base/80 to-bg-base/10" />
        {/* bottom fade into the page */}
        <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-b from-transparent to-bg-base" />
      </div>

      <div className="qo-field" aria-hidden />
      <div className="qo-stars" aria-hidden />
      <div className="qo-orbit" style={{ right: -190, top: 80, width: 700, height: 700 }} aria-hidden>
        <span className="qo-orbit-body" />
      </div>
      <div className="qo-orbit qo-orbit-slow" style={{ right: -80, top: 200, width: 460, height: 460 }} aria-hidden>
        <span className="qo-orbit-body" />
      </div>

      <header className="relative z-20 border-b border-border-hairline/60">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4" aria-label="Site">
          <span className="font-display text-[1.35rem]">QRP</span>
          <div className="hidden items-center gap-6 text-body-s text-text-secondary md:flex">
            <SectionLink id="workflow">Workflow</SectionLink>
            <SectionLink id="capabilities">Capabilities</SectionLink>
            <SectionLink id="continuum">QEM → QEC</SectionLink>
            <a
              href="https://github.com/TSS99/quantum-reliability-platform/blob/main/docs/DEMO_VS_REAL.md"
              target="_blank" rel="noreferrer" className="hover:text-text-primary"
            >
              Real vs modelled
            </a>
            <a href="https://github.com/TSS99/quantum-reliability-platform" target="_blank" rel="noreferrer" className="hover:text-text-primary">GitHub</a>
          </div>
          <Link to="/overview" className="rounded-chip bg-action-bg px-4 py-1.5 text-body-s font-medium text-action-fg">
            Launch Lab
          </Link>
        </nav>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-6 py-16 md:py-20">
        {/* ---------------------------------------------------------- hero */}
        <section className="grid items-start gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
          <div className="hx-border mb-6 inline-flex items-center gap-2 rounded-chip border border-border-hairline px-3 py-1.5 text-caption text-text-secondary qo-glass">
            <span className="qo-pulse inline-block h-1.5 w-1.5 rounded-full bg-series-mitigated" />
            Interactive prototype · seeded demo data
          </div>

          {/* The gradient line is NOT split into per-character spans: background-clip:text cannot
              clip onto inline-block children, which renders them invisible. It gets its own
              block-level reveal instead. */}
          <h1 className="max-w-4xl font-display text-display-l font-normal leading-[1.0] md:text-[5.2rem]">
            Reliability intelligence for{' '}
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
                className="hx-mag hx-shine hx-border group inline-flex items-center gap-2 rounded-chip bg-action-bg px-7 py-3.5 text-body-s font-semibold text-action-fg"
              >
                Launch Reliability Lab
                <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
              </Link>
              <button
                type="button"
                onClick={scrollToWorkflow}
                className="hx-mag inline-flex items-center gap-2 rounded-chip border border-border-control px-7 py-3.5 text-body-s text-text-secondary hover:text-text-primary"
              >
                <Sparkles size={15} aria-hidden /> Explore the workflow
              </button>
            </div>
          </Reveal>

          </div>

          <Reveal as="scale" delay={300}>
            <HeroAnalysis />
          </Reveal>
        </section>

        {/* live stat strip */}
        <section>
          <Reveal delay={700}>
            <dl className="mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-card border border-border-hairline bg-border-hairline sm:grid-cols-4">
              {[
                { k: 'Reliability strategies', v: 7, s: '' },
                { k: 'Hardware profiles', v: 3, s: '' },
                { k: 'QEC simulations', v: 216, s: '' },
                { k: 'Evidence lineage stages', v: 5, s: '' },
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
        <section id="capabilities" className="mt-24 scroll-mt-20">
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
        <section id="workflow" className="mt-24 scroll-mt-20">
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
        <section id="continuum" className="mt-24 scroll-mt-20">
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
            <h2 className="font-display text-display-m font-normal">See it decide</h2>
            <p className="mx-auto mt-3 max-w-xl text-body-s text-text-secondary">
              Pick a workload, set a reliability goal, and watch the optimizer rule strategies in — or out.
            </p>
            <Link
              to="/new-analysis"
              className="hx-mag hx-border mt-7 inline-flex items-center gap-2 rounded-chip bg-action-bg px-7 py-3.5 text-body-s font-semibold text-action-fg"
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
