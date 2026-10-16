import { describe, it, expect } from 'vitest'
import type { APIContext } from 'astro'
import { GET } from '../pages/llms.txt.ts'

describe('llms.txt APIRoute Endpoint', () => {
	it('returns a correct llms.txt response', async () => {
		const mockContext = {} as APIContext

		const response = (await GET(mockContext)) as Response

		const text = await response.text()

		expect(response.headers.get('Content-Type')).toContain('text/plain')
		expect(text).toContain('# LLMs.txt for DavidFross.com')
		expect(text).toContain('## About')
		expect(text).toContain('## Permissions')
		expect(text).toContain('davidmfross@gmail.com')
		expect(text).toContain('## Last Updated')

		// Date is generated at build time in YYYY-MM-DD format
		expect(text).toMatch(/## Last Updated\n\d{4}-\d{2}-\d{2}/)
	})
})
