/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// RECON-25/§48: base is parameterized so a GitHub Pages deploy at
// username.github.io/<repo>/ works without a code change — set VITE_BASE_PATH in CI.
export default defineConfig(() => ({
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    css: true,
  },
}));
