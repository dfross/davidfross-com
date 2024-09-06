import { defineConfig } from 'astro/config'
import tailwind from '@astrojs/tailwind'

import icon from 'astro-icon'

import partytown from '@astrojs/partytown';

// https://astro.build/config
export default defineConfig({
    integrations: [tailwind(), icon(), partytown()]
})