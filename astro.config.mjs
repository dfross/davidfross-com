import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'
import tailwind from '@astrojs/tailwind'
import icon from 'astro-icon'
import partytown from '@astrojs/partytown'
import playformCompress from '@playform/compress'
import playformInline from '@playform/inline'
import compressor from 'astro-compressor'

export default defineConfig({
	site: 'https://www.davidfross.com/',
	integrations: [tailwind(), icon(), partytown(), sitemap(), playformInline(), playformCompress(), compressor()],
})
