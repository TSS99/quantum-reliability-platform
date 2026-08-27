import { RouterProvider, type RouteObject } from 'react-router-dom';
import { createRouter } from './createRouter';
import { Layout } from './Layout';
import { Landing } from '../pages/Landing';
import { Overview } from '../pages/Overview';
import { NewAnalysis } from '../pages/NewAnalysis';
import { QecLab } from '../pages/QecLab';
import { Placeholder } from '../pages/Placeholder';
import { ROUTES } from './nav';
import type { JSX } from 'react';

// Landing "/" is public and outside the app shell. The 9-route IA (RECON-22) lives under the
// Layout; implemented routes render their page, the rest an honest Placeholder.
const PAGES: Record<string, JSX.Element> = {
  '/overview': <Overview />,
  '/new-analysis': <NewAnalysis />,
  '/qec-lab': <QecLab />,
};
const appRoutes: RouteObject[] = ROUTES.map((r) => ({
  path: r.path,
  element: PAGES[r.path] ?? <Placeholder />,
}));

const routes: RouteObject[] = [
  { path: '/', element: <Landing /> },
  { element: <Layout />, children: appRoutes },
];

const router = createRouter(routes);

export function App() {
  return <RouterProvider router={router} />;
}
