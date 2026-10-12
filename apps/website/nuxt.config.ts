import { sliceReadme } from './scripts/slice-readme.mjs';

export default defineNuxtConfig({
  extends: ['../../packages/ui-layer'],
  hooks: {
    'content:file:beforeParse'(ctx) {
      if (ctx.collection.name === 'readme')
        ctx.file.body = sliceReadme(ctx.file.body);
    },
  },
  modules: ['@nuxtjs/i18n', '@nuxtjs/seo', '@nuxt/content', '@nuxt/eslint'],
  compatibilityDate: '2026-10-01',
  devtools: { enabled: false },
  eslint: { config: { stylistic: false } },
  site: { url: 'https://pixsame.com', name: 'pixsame', defaultLocale: 'en' },
  i18n: {
    baseUrl: 'https://pixsame.com',
    defaultLocale: 'en',
    strategy: 'prefix_except_default',
    detectBrowserLanguage: false,
    locales: [
      { code: 'en', language: 'en', name: 'English', file: 'en.json' },
      { code: 'pl', language: 'pl', name: 'Polski', file: 'pl.json' },
      { code: 'de', language: 'de', name: 'Deutsch', file: 'de.json' },
      { code: 'zh', language: 'zh-CN', name: '简体中文', file: 'zh.json' },
      {
        code: 'zh-tw',
        language: 'zh-TW',
        name: '繁體中文',
        file: 'zh-tw.json',
      },
    ],
  },
  runtimeConfig: {
    public: {
      // Empty until the app exists: hides "Sign in".
      appUrl: '',
      // Cloudflare Web Analytics beacon token and Turnstile site key (optional).
      cfAnalyticsToken: '',
      turnstileSiteKey: '',
      // Google Apps Script web app that receives the contact form (NUXT_PUBLIC_CONTACT_ENDPOINT).
      contactEndpoint: '',
      // Google Apps Script web app that stores waitlist signups in a Sheet (NUXT_PUBLIC_WAITLIST_ENDPOINT).
      waitlistEndpoint: '',
    },
  },
  content: {
    // Node's built-in sqlite (22.5+): no native better-sqlite3 build needed.
    experimental: { sqliteConnector: 'native' },
    build: {
      markdown: {
        highlight: {
          theme: {
            default: 'github-light-high-contrast',
            dark: 'github-dark-high-contrast',
          },
          langs: ['bash', 'ts', 'js', 'json', 'yaml', 'vue'],
        },
      },
    },
  },
  routeRules: { '/**': { prerender: true } },
  nitro: { prerender: { crawlLinks: true } },
});
