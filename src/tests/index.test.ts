import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import Index from '../pages/index.astro';
import { SOCIAL_LINKS } from '../constants';

describe('Index page', () => {
    it('renders the layout, heading, intro text and social links', async () => {
        const container = await AstroContainer.create();

        const result = await container.renderToString(Index, {
            request: new Request('https://www.davidfross.com/'),
        });

        // Main heading and display text
        expect(result).toContain('David Fross,');
        expect(result).toContain('designer <span class="font-normal">&amp;</span> developer.');

        // Intro text
        expect(result).toContain('I bring 20+ years of frontend experience to teams building for the long term.');
        expect(result).toContain('I listen first to understand what needs solving, then bring');
        expect(result).toContain('people together around clean and accessible code.');

        // Social Links
        expect(result).toContain(`href="${SOCIAL_LINKS.linkedin}"`);
        expect(result).toContain(`href="mailto:${SOCIAL_LINKS.email}"`);

        // Check icon components are somewhat rendered by checking social-link
        expect(result).toContain('class="social-link focus-ring"');
    });
});
