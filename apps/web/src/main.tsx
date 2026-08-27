import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './styles/index.css';

// Dark-first, applied BEFORE first paint and on every route (the landing page sits outside the
// app shell, so it cannot rely on the shell's theme hook). An explicit stored choice always wins;
// otherwise we commit to dark rather than inheriting the OS preference — the instrument is
// authored dark, and light is the deliberate opt-in.
(() => {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem('qrp-theme');
  } catch {
    /* private mode / blocked storage */
  }
  document.documentElement.setAttribute('data-theme', stored === 'light' ? 'light' : 'dark');
})();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
