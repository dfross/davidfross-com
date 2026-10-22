import { describe, it, expect } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import MainLayout from '../layouts/MainLayout.astro';
import * as cheerio from 'cheerio';
import {
	SITE_TITLE,
	SITE_DESCRIPTION,
	AUTHOR_NAME,
} from '../constants';

describe('MainLayout', () => {
  it('renders SEO tags correctly with custom title', async () => {
    // Note: Provide astroConfig in create() so Astro.site will have the correct URL object in the component logic.
    const container = await AstroContainer.create({
      astroConfig: {
        site: 'https://www.davidfross.com/'
      }
    } as any);

    const result = await container.renderToString(MainLayout, {
      props: { title: 'Test Page' },
      request: new Request('https://www.davidfross.com/test-path')
    });

    const $ = cheerio.load(result);

    expect($('title').text()).toBe(`${SITE_TITLE} - Test Page`);
    expect($('meta[name="description"]').attr('content')).toBe(SITE_DESCRIPTION);
    expect($('meta[name="author"]').attr('content')).toBe(AUTHOR_NAME);
    expect($('meta[name="theme-color"]').attr('content')).toBe('#171717');

    expect($('link[rel="canonical"]').attr('href')).toBe('https://www.davidfross.com/test-path');

    // Check icons and manifest
    expect($('link[rel="icon"][href="/favicon.ico"]').length).toBe(1);
    expect($('link[rel="icon"][href="/favicon-16x16.png"]').length).toBe(1);
    expect($('link[rel="icon"][href="/favicon-32x32.png"]').length).toBe(1);
    expect($('link[rel="apple-touch-icon"][href="/apple-touch-icon.png"]').length).toBe(1);
    expect($('link[rel="manifest"][href="/manifest.json"]').length).toBe(1);

    // Check preconnects and tags
    expect($('link[rel="dns-prefetch"][href="https://www.googletagmanager.com"]').length).toBe(1);
    expect($('link[rel="preconnect"][href="https://www.googletagmanager.com"]').length).toBe(1);

    // Check JSON-LD
    const scriptLdStr = $('script[type="application/ld+json"]').text();
    const scriptLd = JSON.parse(scriptLdStr);
    expect(scriptLd.name).toBe(AUTHOR_NAME);
    expect(scriptLd.url).toBe('https://www.davidfross.com/');

    // Check main skip link
    expect($('a.skip-link').attr('href')).toBe('#main-content');
  });

  it('uses default title if no title provided', async () => {
    const container = await AstroContainer.create({
      astroConfig: {
        site: 'https://www.davidfross.com/'
      }
    } as any);

    const result = await container.renderToString(MainLayout, {
      request: new Request('https://www.davidfross.com/')
    });

    const $ = cheerio.load(result);

    expect($('title').text()).toBe(`${SITE_TITLE} - Designer & Developer`);
  });
});
