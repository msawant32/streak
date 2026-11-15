import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Relative base so the same build works in the browser and inside the Android WebView.
  base: './',
  plugins: [react(), tailwindcss()],
  server: { port: 5173, strictPort: false },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
