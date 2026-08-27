import { RouterProvider, type RouteObject } from 'react-router-dom';
import { createRouter } from './createRouter';
import { Layout } from './Layout';
import { Landing } from '../pages/Landing';
import { Overview } from '../pages/Overview';
import { Placeholder } from '../pages/Placeholder';
import { ROUTES } from './nav';

// Landing "/" is public and outside the app shell. The 9-route IA (RECON-22) lives under the
// Layout; only Overview is implemented this phase — the rest render an honest Placeholder.
const appRoutes: RouteObject[] = ROUTES.map((r) => ({
  path: r.path,
  element: r.path === '/overview' ? <Overview /> : <Placeholder />,
}));

const routes: RouteObject[] = [
  { path: '/', element: <Landing /> },
  { element: <Layout />, children: appRoutes },
];

const router = createRouter(routes);

export function App() {
  return <RouterProvider router={router} />;
}
