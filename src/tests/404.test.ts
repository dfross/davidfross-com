import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test, describe } from 'vitest';
import NotFoundPage from '../pages/404.astro';

describe('404 Page', () => {
	test('renders the 404 page correctly', async () => {
		const container = await AstroContainer.create({
			manifest: {
				site: 'http://localhost:4321',
			} as any,
		});
		const result = await container.renderToString(NotFoundPage, {
			request: new Request('http://localhost:4321/404'),
		});

		expect(result).toContain('404');
		expect(result).toContain('Page Not Found');
		expect(result).toContain("Sorry, the page you're looking for doesn't exist.");
		expect(result).toContain('Return Home');
		expect(result).toContain('href="/"');
	});
});