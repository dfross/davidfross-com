import eslintPluginAstro from 'eslint-plugin-astro'
import eslintPluginJsxA11y from 'eslint-plugin-jsx-a11y'
import * as astroParser from 'astro-eslint-parser'
import tsParser from '@typescript-eslint/parser'

export default [
	...eslintPluginAstro.configs.recommended,
	...eslintPluginAstro.configs['jsx-a11y-recommended'],
	{
		files: ['**/*.astro'],
		languageOptions: {
			parser: astroParser,
			parserOptions: {
				parser: tsParser,
				extraFileExtensions: ['.astro'],
			},
		},
	},
	{
		ignores: ['dist/', '.astro/', 'node_modules/'],
	},
]
