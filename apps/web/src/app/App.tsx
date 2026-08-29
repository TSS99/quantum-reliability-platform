import { RouterProvider, type RouteObject } from 'react-router-dom';
import type { ComponentType } from 'react';
import { createRouter } from './createRouter';
import { Layout } from './Layout';
import { Landing } from '../pages/Landing';
import { Placeholder } from '../pages/Placeholder';
import { ROUTES } from './nav';

/**
 * Landing "/" is public and outside the app shell. The 9-route IA (RECON-22) lives under the
 * Layout; implemented routes render their page, the rest an honest Placeholder.
 *
 * The application pages are CODE-SPLIT. Landing is the first impression and most visitors never
 * navigate past it, so bundling nine workbench pages plus their charting into the initial download
 * made them pay for screens they never open. Landing itself stays eager — lazy-loading the entry
 * point would only add a round trip.
 */
const lazyPage = (name: string, load: () => Promise<Record<string, unknown>>): Pick<RouteObject, 'lazy'> => ({
  lazy: async () => ({ Component: (await load())[name] as ComponentType }),
});

const PAGES: Record<string, Pick<RouteObject, 'lazy'>> = {
  '/overview': lazyPage('Overview', () => import('../pages/Overview')),
  '/new-analysis': lazyPage('NewAnalysis', () => import('../pages/NewAnalysis')),
  '/workloads': lazyPage('Workloads', () => import('../pages/Workloads')),
  '/hardware': lazyPage('Hardware', () => import('../pages/Hardware')),
  '/strategies': lazyPage('Strategies', () => import('../pages/Strategies')),
  '/qec-lab': lazyPage('QecLab', () => import('../pages/QecLab')),
  '/experiments': lazyPage('Experiments', () => import('../pages/Experiments')),
  '/integrations': lazyPage('Integrations', () => import('../pages/Integrations')),
  '/settings': lazyPage('Settings', () => import('../pages/Settings')),
};

const appRoutes: RouteObject[] = ROUTES.map((r) => {
  const page = PAGES[r.path];
  return page ? { path: r.path, ...page } : { path: r.path, element: <Placeholder /> };
});

const routes: RouteObject[] = [
  { path: '/', element: <Landing /> },
  { element: <Layout />, children: appRoutes },
];

const router = createRouter(routes);

export function App() {
  return <RouterProvider router={router} />;
}
