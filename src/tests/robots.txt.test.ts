import { describe, it, expect } from 'vitest'
import type { APIContext } from 'astro'
import { GET } from '../pages/robots.txt.ts'

describe('robots.txt APIRoute Endpoint', () => {
	it('returns a correct robots.txt response based on site config', async () => {
		// Mock Astro APIContext containing a dummy site URL
		const mockContext = {
			site: new URL('https://example.com'),
		} as APIContext

		// Call the GET function with the mock context
		const response = await GET(mockContext) as Response

		// Await the returned Response text content
		const text = await response.text()

		// Assert that the response contains expected robots.txt strings
		expect(text).toContain('User-agent: *')
		expect(text).toContain('Allow: /')
		expect(text).toContain('# AI and LLM usage notes are published at /llms.txt')

		// Assert the correct sitemap URL constructed from the mock site
		expect(text).toContain('Sitemap: https://example.com/sitemap-index.xml')

		// Check basic Response properties if needed
		expect(response.status).toBe(200)
	})
})
