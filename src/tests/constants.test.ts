import { describe, it, expect } from 'vitest'
import {
	SITE_TITLE,
	SITE_DESCRIPTION,
	AUTHOR_NAME,
	AUTHOR_JOB_TITLE,
	SOCIAL_LINKS,
} from '../constants'

describe('Constants', () => {
	it('exports the correct SITE_TITLE', () => {
		expect(SITE_TITLE).toBe('David Fross')
		expect(typeof SITE_TITLE).toBe('string')
	})

	it('exports the correct SITE_DESCRIPTION', () => {
		expect(SITE_DESCRIPTION).toContain('20+ years of frontend experience')
		expect(typeof SITE_DESCRIPTION).toBe('string')
	})

	it('exports the correct AUTHOR_NAME', () => {
		expect(AUTHOR_NAME).toBe('David Fross')
		expect(typeof AUTHOR_NAME).toBe('string')
	})

	it('exports the correct AUTHOR_JOB_TITLE', () => {
		expect(AUTHOR_JOB_TITLE).toBe('Designer & Developer')
		expect(typeof AUTHOR_JOB_TITLE).toBe('string')
	})

	it('exports the correct SOCIAL_LINKS', () => {
		expect(SOCIAL_LINKS).toEqual({
			linkedin: 'https://www.linkedin.com/in/davidfross/',
			email: 'davidmfross@gmail.com',
		})
		expect(SOCIAL_LINKS.linkedin).toBe('https://www.linkedin.com/in/davidfross/')
		expect(SOCIAL_LINKS.email).toBe('davidmfross@gmail.com')
	})
})
