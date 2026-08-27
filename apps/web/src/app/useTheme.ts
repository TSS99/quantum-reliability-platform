import { useCallback, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';
const KEY = 'qrp-theme';

function read(): Theme {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'dark' || v === 'light') return v;
  } catch {
    /* private mode / blocked storage — fall through to default */
  }
  return 'dark'; // dark-first (RECON-27)
}

/** Applies [data-theme] to <html> and remembers the choice per-viewer. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(read);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);
  const toggle = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), []);
  return { theme, toggle };
}
