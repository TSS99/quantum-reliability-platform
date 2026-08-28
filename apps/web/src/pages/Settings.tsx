import { Sun, Moon, Database } from 'lucide-react';
import { Card } from '../components/ui';
import { useTheme } from '../app/useTheme';

export function Settings() {
  const { theme, toggle } = useTheme();
  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-eyebrow uppercase text-series-mitigated">Settings</p>
        <h2 className="font-display text-display-m font-normal">Preferences</h2>
      </header>

      <Card className="divide-y divide-border-hairline p-0">
        <div className="flex items-center justify-between p-4">
          <div>
            <div className="text-body-s font-medium text-text-primary">Theme</div>
            <div className="text-caption text-text-muted">Dark-first; both themes are hand-authored and contrast-checked.</div>
          </div>
          <button onClick={toggle} className="inline-flex items-center gap-1.5 rounded-control border border-border-control px-3 py-1.5 text-body-s text-text-secondary hover:bg-row-hover">
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />} {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
        </div>

        <div className="flex items-center justify-between p-4">
          <div>
            <div className="text-body-s font-medium text-text-primary">Motion</div>
            <div className="text-caption text-text-muted">Animations follow your system “reduce motion” setting automatically.</div>
          </div>
          <span className="rounded-chip border border-border-hairline px-2 py-0.5 text-caption text-text-muted">system</span>
        </div>

        <div className="flex items-center justify-between p-4">
          <div>
            <div className="flex items-center gap-1.5 text-body-s font-medium text-text-primary"><Database size={14} className="text-series-mitigated" /> Data source</div>
            <div className="text-caption text-text-muted">This prototype computes everything from seeded demo data in your browser. No account, no secrets, no server calls.</div>
          </div>
          <span className="rounded-chip border border-border-hairline px-2 py-0.5 text-caption text-text-muted">Demo Data</span>
        </div>
      </Card>
    </div>
  );
}
