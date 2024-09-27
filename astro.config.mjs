import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'
import tailwind from '@astrojs/tailwind'
import icon from 'astro-icon'
import partytown from '@astrojs/partytown'
import compressor from 'astro-compressor'
import playformCompress from '@playform/compress'
import playformInline from '@playform/inline'
// https://astro.build/config
export default defineConfig({
	site: 'https://www.davidfross.com/',
	integrations: [tailwind(), icon(), partytown(), sitemap(), playformCompress(), playformInline(), compressor()],
})
