import '@testing-library/jest-dom/vitest';

// jsdom has no IntersectionObserver; the motion hooks degrade gracefully without it, but stub it
// so component tests exercise the same code path the browser takes.
class IO {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
  root = null;
  rootMargin = '';
  thresholds = [];
}
globalThis.IntersectionObserver = IO;
