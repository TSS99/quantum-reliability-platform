import {
  LayoutDashboard, FlaskConical, Boxes, Cpu, SlidersHorizontal, Grid3x3,
  ScrollText, PlugZap, Settings, type LucideIcon,
} from 'lucide-react';

export interface NavRoute {
  path: string;
  label: string;
  group: string;
  Icon: LucideIcon;
  /** Implemented this phase vs a planned surface (RECON-22). Planned routes are shown
   *  visibly distinct and open an honest "arrives later" page — never faked. */
  implemented: boolean;
}

// The 9-route IA from UX_MAP.md (Decoder Lab is a panel inside QEC Lab, not a route;
// the landing page "/" is public and deliberately not a nav item).
export const ROUTES: NavRoute[] = [
  { path: '/overview',     label: 'Overview',     group: 'Plan',        Icon: LayoutDashboard,   implemented: true },
  { path: '/new-analysis', label: 'New Analysis', group: 'Plan',        Icon: FlaskConical,      implemented: true },
  { path: '/workloads',    label: 'Workloads',    group: 'Plan',        Icon: Boxes,             implemented: false },
  { path: '/hardware',     label: 'Hardware',     group: 'Hardware',    Icon: Cpu,               implemented: false },
  { path: '/strategies',   label: 'Strategies',   group: 'Reliability', Icon: SlidersHorizontal, implemented: false },
  { path: '/qec-lab',      label: 'QEC Lab',      group: 'Reliability', Icon: Grid3x3,           implemented: true },
  { path: '/experiments',  label: 'Experiments',  group: 'Evidence',    Icon: ScrollText,        implemented: false },
  { path: '/integrations', label: 'Integrations', group: 'System',      Icon: PlugZap,           implemented: false },
  { path: '/settings',     label: 'Settings',     group: 'System',      Icon: Settings,          implemented: false },
];

export const NAV_GROUPS = ['Plan', 'Hardware', 'Reliability', 'Evidence', 'System'] as const;
