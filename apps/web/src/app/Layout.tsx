import { NavLink, Outlet } from 'react-router-dom';
import { Sun, Moon, Waves } from 'lucide-react';
import { ROUTES, NAV_GROUPS } from './nav';
import { useTheme } from './useTheme';
import { dataSource } from '../services/ReliabilityDataSource';

export function Layout() {
  const { theme, toggle } = useTheme();
  return (
    <div className="min-h-screen bg-bg-base text-text-primary md:grid md:grid-cols-[240px_1fr]">
      <aside className="border-border-hairline bg-bg-sunken md:min-h-screen md:border-r">
        <div className="flex items-center justify-between border-b border-border-hairline px-4 py-3">
          <NavLink to="/" className="flex items-center gap-2">
            <Waves size={18} className="text-series-mitigated" aria-hidden />
            <span className="text-heading-m font-semibold">QRP</span>
          </NavLink>
          {dataSource.isDemo && (
            <span className="rounded-chip border border-border-hairline px-1.5 py-0.5 text-caption text-text-muted">
              Demo Data
            </span>
          )}
        </div>
        <nav aria-label="Primary" className="px-2 py-3">
          {NAV_GROUPS.map((group) => (
            <div key={group} className="mb-3">
              <div className="px-2 py-1 text-eyebrow uppercase text-text-muted">{group}</div>
              <ul>
                {ROUTES.filter((r) => r.group === group).map((r) => {
                  const { Icon } = r;
                  return (
                    <li key={r.path}>
                      <NavLink
                        to={r.path}
                        className={({ isActive }) =>
                          `flex items-center gap-2 rounded-control px-2 py-1.5 text-body-s ${
                            isActive
                              ? 'bg-row-selected text-text-primary'
                              : 'text-text-secondary hover:bg-row-hover hover:text-text-primary'
                          }`
                        }
                      >
                        <Icon size={16} aria-hidden />
                        <span>{r.label}</span>
                        {!r.implemented && (
                          <span className="ml-auto text-caption text-text-muted">planned</span>
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

      <div className="flex min-w-0 flex-col">
        <header className="flex items-center justify-between border-b border-border-hairline px-4 py-3 md:px-6">
          <h1 className="text-heading-m">Reliability Lab</h1>
          <button
            type="button"
            onClick={toggle}
            className="inline-flex items-center gap-1.5 rounded-control border border-border-control px-2 py-1 text-body-s text-text-secondary hover:bg-row-hover hover:text-text-primary"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          >
            {theme === 'dark' ? <Sun size={15} aria-hidden /> : <Moon size={15} aria-hidden />}
            <span className="capitalize">{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>
        </header>
        <main className="min-w-0 flex-1 px-4 py-6 md:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
