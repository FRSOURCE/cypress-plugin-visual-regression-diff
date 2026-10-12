import { defineCollection, defineContentConfig, z } from '@nuxt/content';

const plugin = '../../packages/cypress-plugin-visual-regression-diff';

export default defineContentConfig({
  collections: {
    // docs/<locale>/<group>/<page>.md. Non-English files are AI drafts until a native speaker
    // flips `reviewed` to true; a missing translation falls back to the English file.
    docs: defineCollection({
      type: 'page',
      source: 'docs/**/*.md',
      schema: z.object({
        order: z.number().default(100),
        reviewed: z.boolean().default(true),
      }),
    }),
    // Code samples for marketing pages, highlighted at build time by Nuxt Content (shiki).
    snippets: defineCollection({ type: 'page', source: 'snippets/**/*.md' }),
    // The Cypress plugin page is the package README, sliced in nuxt.config.ts (content:file:beforeParse).
    readme: defineCollection({
      type: 'page',
      source: { cwd: plugin, include: 'README.md', prefix: '/readme' },
    }),
    // The release notes live next to the package; render them as-is.
    changelog: defineCollection({
      type: 'page',
      source: { cwd: plugin, include: 'CHANGELOG.md', prefix: '/changelog' },
    }),
  },
});
