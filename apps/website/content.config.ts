import { defineCollection, defineContentConfig, z } from '@nuxt/content';

export default defineContentConfig({
  collections: {
    docs: defineCollection({
      type: 'page',
      source: 'docs/**/*.md',
      schema: z.object({ order: z.number().default(100) }),
    }),
    products: defineCollection({ type: 'page', source: 'products/**/*.md' }),
    // Code samples for marketing pages, highlighted at build time by Nuxt Content (shiki).
    snippets: defineCollection({ type: 'page', source: 'snippets/**/*.md' }),
    // The release notes live next to the package; render them as-is.
    changelog: defineCollection({
      type: 'page',
      source: {
        cwd: '../../packages/cypress-plugin-visual-regression-diff',
        include: 'CHANGELOG.md',
        prefix: '/changelog',
      },
    }),
  },
});
