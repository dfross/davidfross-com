import type { APIRoute } from 'astro'

const getRobotsTxt = (sitemapURL: URL) => `
User-agent: *
Allow: /

# AI and LLM usage notes are published at /llms.txt

Sitemap: ${sitemapURL.href}
`

export const GET: APIRoute = ({ site }) => {
	const sitemapURL = new URL('sitemap-index.xml', site || new URL('https://www.davidfross.com/'))
	return new Response(getRobotsTxt(sitemapURL))
}
