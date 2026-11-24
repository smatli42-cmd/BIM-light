import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

// Na GitHub Pages běží stránka v podsložce /BIM-light/; lokálně stejně (dev i preview).
export default defineConfig({
  base: '/BIM-light/',
  plugins: [preact()],
  server: { port: 5173, strictPort: true },
  preview: { port: 4317, strictPort: true },
});
