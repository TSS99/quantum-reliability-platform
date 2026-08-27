import { createBrowserRouter, createHashRouter, type RouteObject } from 'react-router-dom';

// RECON-25: GitHub Pages is a static host with no server-side rewrite rule, so deep links
// under BrowserRouter 404 on refresh. HashRouter is therefore the default for the Pages
// deployment. BrowserRouter is kept behind VITE_ROUTER_MODE for a future real host, without
// forking the route table.
export type RouterMode = 'hash' | 'browser';

function resolveRouterMode(): RouterMode {
  const mode = import.meta.env.VITE_ROUTER_MODE;
  return mode === 'browser' ? 'browser' : 'hash';
}

export function createRouter(routes: RouteObject[], mode: RouterMode = resolveRouterMode()) {
  return mode === 'browser'
    ? createBrowserRouter(routes, { basename: import.meta.env.BASE_URL })
    : createHashRouter(routes);
}
