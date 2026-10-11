export default defineNuxtConfig({
  extends: ['../../packages/ui-layer'],
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
      { code: 'zh-tw', language: 'zh-TW', name: '繁體中文', file: 'zh-tw.json' },
    ],
  },
  runtimeConfig: {
    public: {
      // Empty until the app exists: hides "Sign in".
      appUrl: '',
      // Cloudflare Web Analytics beacon token and Turnstile site key (optional).
      cfAnalyticsToken: '',
      turnstileSiteKey: '',
    },
  },
  content: {
    // Node's built-in sqlite (22.5+): no native better-sqlite3 build needed.
    experimental: { sqliteConnector: 'native' },
    build: { markdown: { highlight: { theme: { default: 'github-light-high-contrast', dark: 'github-dark-high-contrast' }, langs: ['bash', 'ts', 'js', 'json', 'yaml', 'vue'] } } },
  },
  routeRules: {
    '/**': { prerender: true },
    // Old URLs from before the docs restructure and the /products rename.
    '/product': { redirect: { to: '/products', statusCode: 301 } },
    '/docs': { redirect: { to: '/docs/getting-started/install', statusCode: 301 } },
    '/docs/install': { redirect: { to: '/docs/getting-started/install', statusCode: 301 } },
    '/docs/usage': { redirect: { to: '/docs/getting-started/usage', statusCode: 301 } },
    '/docs/manifest': { redirect: { to: '/docs/reference/manifest', statusCode: 301 } },
  },
  nitro: { prerender: { crawlLinks: true } },
});
