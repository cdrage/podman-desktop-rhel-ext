import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { svelteTesting } from '@testing-library/svelte/vite';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  plugins: [svelte(), svelteTesting()],
  resolve: { alias: { '/@shared': fileURLToPath(new URL('../shared', import.meta.url)) } },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.spec.ts'],
    server: { deps: { inline: ['@podman-desktop/ui-svelte', 'svelte-fa'] } },
  },
});
