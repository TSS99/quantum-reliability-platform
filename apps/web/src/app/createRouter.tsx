import {
  createBrowserRouter,
  createHashRouter,
  isRouteErrorResponse,
  useNavigate,
  useRouteError,
  type RouteObject,
} from 'react-router-dom';

// RECON-25: GitHub Pages is a static host with no server-side rewrite rule, so deep links
// under BrowserRouter 404 on refresh. HashRouter is therefore the default for the Pages
// deployment. BrowserRouter is kept behind VITE_ROUTER_MODE for a future real host, without
// forking the route table.
export type RouterMode = 'hash' | 'browser';

function resolveRouterMode(): RouterMode {
  const mode = import.meta.env.VITE_ROUTER_MODE;
  return mode === 'browser' ? 'browser' : 'hash';
}

// EMC-3: with no errorElement anywhere, a throw in any page white-screens the whole app. This
// fallback is attached to every top-level route below — the public landing route and the Layout
// route every workbench page renders under — so an error from any of them is caught here instead.
function RouteErrorFallback() {
  const error = useRouteError();
  const navigate = useNavigate();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Something went wrong.';

  return (
    <div role="alert" className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="font-display text-display-m font-normal text-text-primary">Something went wrong</h1>
      <p className="max-w-md text-body-s text-text-muted">{message}</p>
      <div className="flex gap-2">
        <button
          onClick={() => window.location.reload()}
          className="rounded-control border border-border-control px-3 py-2 text-body-s text-text-secondary hover:bg-row-hover"
        >
          Retry
        </button>
        <button
          onClick={() => navigate('/')}
          className="rounded-control border border-border-control px-3 py-2 text-body-s text-text-secondary hover:bg-row-hover"
        >
          Go home
        </button>
      </div>
    </div>
  );
}

function withErrorBoundary(routes: RouteObject[]): RouteObject[] {
  return routes.map((route) => ({ errorElement: <RouteErrorFallback />, ...route }));
}

export function createRouter(routes: RouteObject[], mode: RouterMode = resolveRouterMode()) {
  const rooted = withErrorBoundary(routes);
  return mode === 'browser'
    ? createBrowserRouter(rooted, { basename: import.meta.env.BASE_URL })
    : createHashRouter(rooted);
}
