import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  base: './',
  plugins: [tailwindcss(), svelte()],
  resolve: { alias: { '/@shared': fileURLToPath(new URL('../shared', import.meta.url)) } },
  build: { outDir: '../../media', assetsDir: '', emptyOutDir: true },
});
