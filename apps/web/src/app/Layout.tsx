import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Sun, Moon, Waves, Menu, X } from 'lucide-react';
import { ROUTES, NAV_GROUPS } from './nav';
import { useTheme } from './useTheme';
import { dataSource } from '../services/ReliabilityDataSource';

export function Layout() {
  const { theme, toggle } = useTheme();
  const { pathname } = useLocation();
  const current = ROUTES.find((r) => r.path === pathname);

  // Below `md` the sidebar becomes a drawer. Above it, `open` is inert — the sidebar is always
  // laid out by the grid, so the same markup serves both without duplicating the nav.
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Navigating is the drawer's natural dismissal; leaving it open over the new page is a bug.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    // The drawer covers the page on small screens; the page behind it must not scroll under it.
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <div className="relative min-h-screen bg-bg-base text-text-primary">
      <div className="qo-field" aria-hidden />
      <div className="qo-stars" aria-hidden />

      <div className="relative z-10 md:grid md:grid-cols-[248px_1fr]">
        {/* ------------------------------------------------------- sidebar */}
        {/* Scrim only exists while the drawer is open, and only below md. */}
        {open && (
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 bg-bg-base/70 backdrop-blur-sm md:hidden"
          />
        )}

        <aside
          id="primary-nav"
          className={
            'border-border-hairline bg-bg-sunken/45 backdrop-blur-2xl md:min-h-screen md:border-r ' +
            'max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-40 max-md:w-[268px] max-md:overflow-y-auto ' +
            'max-md:border-r max-md:transition-transform max-md:duration-200 ' +
            (open ? 'max-md:translate-x-0' : 'max-md:invisible max-md:-translate-x-full')
          }
        >
          <div className="flex items-center justify-between border-b border-border-hairline px-4 py-3.5">
            <NavLink to="/" className="group flex items-center gap-2">
              <span className="relative flex h-7 w-7 items-center justify-center rounded-control border border-border-hairline qo-glass">
                <Waves size={15} className="text-series-mitigated" aria-hidden />
              </span>
              <span className="text-heading-m font-semibold tracking-tight">QRP</span>
            </NavLink>
            {dataSource.isDemo && (
              <span className="inline-flex items-center gap-1.5 rounded-chip border border-border-hairline px-2 py-0.5 text-caption text-text-muted">
                <span className="qo-pulse inline-block h-1 w-1 rounded-full bg-series-mitigated" />
                Demo
              </span>
            )}
            <button
              ref={closeRef}
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close navigation"
              className="rounded-control border border-border-control p-1.5 text-text-secondary hover:bg-row-hover md:hidden"
            >
              <X size={15} aria-hidden />
            </button>
          </div>

          <nav aria-label="Primary" className="px-2.5 py-3">
            {NAV_GROUPS.map((group, gi) => (
              <div key={group} className="mb-3 qo-rise" style={{ ['--i' as string]: gi }}>
                <div data-nav-group={group} className="px-2 py-1 text-eyebrow uppercase text-text-muted">
                  {group}
                </div>
                <ul>
                  {ROUTES.filter((r) => r.group === group).map((r) => {
                    const { Icon } = r;
                    return (
                      <li key={r.path}>
                        <NavLink
                          to={r.path}
                          className={({ isActive }) =>
                            'group relative flex items-center gap-2.5 rounded-control px-2.5 py-2 text-body-s transition-all duration-200 ' +
                            (isActive
                              ? 'bg-row-selected text-text-primary'
                              : 'text-text-secondary hover:bg-row-hover hover:text-text-primary')
                          }
                        >
                          {({ isActive }) => (
                            <>
                              {isActive && (
                                <span
                                  className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-series-mitigated"
                                  style={{ boxShadow: '0 0 12px 1px rgb(var(--glow-cyan) / 0.8)' }}
                                  aria-hidden
                                />
                              )}
                              <Icon
                                size={15}
                                aria-hidden
                                className={isActive ? 'text-series-mitigated' : 'transition-colors group-hover:text-text-primary'}
                              />
                              <span>{r.label}</span>
                            </>
                          )}
                        </NavLink>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        {/* --------------------------------------------------------- main */}
        <div className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border-hairline bg-bg-base/70 px-4 py-3 backdrop-blur-xl md:px-7">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label="Open navigation"
                aria-expanded={open}
                aria-controls="primary-nav"
                className="rounded-control border border-border-control p-1.5 text-text-secondary transition-colors hover:bg-row-hover hover:text-text-primary md:hidden"
              >
                <Menu size={16} aria-hidden />
              </button>
              <h1 className="font-display text-[1.55rem] font-normal leading-none">{current?.label ?? 'Reliability Lab'}</h1>
              <span className="hidden text-caption text-text-muted sm:inline">{current?.group}</span>
            </div>
            <button
              type="button"
              onClick={toggle}
              className="inline-flex items-center gap-1.5 rounded-control border border-border-control px-2.5 py-1.5 text-body-s text-text-secondary transition-colors hover:bg-row-hover hover:text-text-primary"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            >
              {theme === 'dark' ? <Sun size={15} aria-hidden /> : <Moon size={15} aria-hidden />}
              <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>
          </header>

          <main key={pathname} className="qo-rise min-w-0 flex-1 px-4 py-7 md:px-7">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
