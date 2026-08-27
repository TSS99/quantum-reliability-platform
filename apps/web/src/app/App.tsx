import { RouterProvider, type RouteObject } from 'react-router-dom';
import { createRouter } from './createRouter';
import { Home } from '../pages/Home';

// RECON-22: nav renders only implemented routes; this is the trivial hello route the rest
// of the 9-route IA (UX_MAP.md) grows from — Frontend owns adding the remaining routes.
const routes: RouteObject[] = [{ path: '/', element: <Home /> }];

const router = createRouter(routes);

export function App() {
  return <RouterProvider router={router} />;
}
