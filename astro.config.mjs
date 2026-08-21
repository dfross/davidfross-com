import { defineConfig, fontProviders } from 'astro/config'
import sitemap from '@astrojs/sitemap'
import icon from 'astro-icon'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
	site: 'https://www.davidfross.com/',

	prefetch: {
		prefetchAll: true,
	},

	integrations: [icon(), sitemap()],

	fonts: [
		{
			name: 'Geist',
			cssVariable: '--font-geist',
			weights: [200, 400, 700],
			styles: ['normal'],
			provider: fontProviders.google(),
		},
	],

	build: {
		inlineStylesheets: 'always',
	},

	vite: {
		plugins: [tailwindcss()],
	},
})
