import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'
import icon from 'astro-icon'
import partytown from '@astrojs/partytown'
import playformCompress from '@playform/compress'
import playformInline from '@playform/inline'
import compressor from 'astro-compressor'

import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://www.davidfross.com/',

  prefetch: {
      prefetchAll: true,
	},

  integrations: [icon(), partytown(), sitemap(), playformInline(), playformCompress(), compressor()],

  vite: {
    plugins: [tailwindcss()],
  },
})