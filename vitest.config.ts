import { getViteConfig } from 'astro/config';

export default getViteConfig({
  test: {
    // Vitest configuration options
  },
});
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
  },
})
