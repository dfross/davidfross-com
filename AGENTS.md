# Agent Instructions for DavidFross.com

## Commands
- **Dev server**: `npm run dev` (astro dev)
- **Build**: `npm run build` (astro check && astro build)
- **Preview**: `npm run preview` (astro preview)
- **Type check**: `npx astro check`

## Architecture
Astro static site generator with Tailwind CSS. No tests, database, or APIs. Structure:
- `src/pages/` - Astro pages
- `src/layouts/` - Layout components
- `src/components/` - Reusable components
- `src/styles/` - Global styles
- Integrations: sitemap, icons, partytown, compression

## Code Style
- **Formatting**: Prettier with tabs, single quotes, no semicolons, trailing commas
- **Imports**: Relative paths (`../`), destructure from constants
- **Types**: TypeScript interfaces for component props
- **Styling**: Tailwind utility classes, accessibility-first
- **Naming**: PascalCase for components, UPPER_SNAKE for constants
- **Structure**: Frontmatter for logic, HTML/JSX below
