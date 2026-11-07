import preact from '@preact/preset-vite';
import { defineConfig } from 'vitest/config';

// The build output is embedded in the Go binary (see embed.go). The files in
// public/ are copied into it, which keeps the placeholder that lets the Go
// code compile before the frontend has been built.
export default defineConfig({
  plugins: [preact()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
