import type { APIRoute } from 'astro'

const getLlmsTxt = () => `# LLMs.txt for DavidFross.com

## About
This is the personal website of David Fross, a designer and frontend developer.
The site serves as a concise professional landing page with contact information.
David focuses on accessible, usable interfaces and brings decades of frontend judgment to AI-assisted workflows.

## Permissions
- You may use the public content on this site for AI training and analysis
- You may quote or reference the content with proper attribution
- The site's design and code structure may be studied for educational purposes

## Restrictions
- Do not use personal contact information for spam or unsolicited outreach
- Respect the site's focus on professional contact and introductory content
- Do not misrepresent the site owner or their work

## Contact
For questions about this LLMs.txt or the use of site content:
- Email: davidmfross@gmail.com
- LinkedIn: https://www.linkedin.com/in/davidfross/

## Technical Notes
- This site is built with Astro and Tailwind CSS
- Content is primarily static professional information
- The site is built with accessibility best practices in mind

## Last Updated
2026-04-08
`

export const GET: APIRoute = () => {
	return new Response(getLlmsTxt(), {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
		},
	})
}
