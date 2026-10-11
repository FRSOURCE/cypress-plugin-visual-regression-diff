# pixsame website

Static marketing site and docs for pixsame.com. Nuxt 4 (prerendered), Tailwind v4, `@nuxtjs/i18n`, `@nuxtjs/seo`, `@nuxt/content`.
Shared tokens and components live in [`packages/ui-layer`](../../packages/ui-layer), a Nuxt layer the future app reuses.

```bash
pnpm --filter @pixsame/website dev      # http://localhost:3000
pnpm --filter @pixsame/website build    # nuxt generate -> .output/public
pnpm --filter @pixsame/website exec playwright test   # e2e + axe a11y against the built site
```

Use Node >= 22.21 (CI uses `.nvmrc`).

## Locales

`en` (no prefix), `pl`, `de`, `zh` (Simplified, `zh-CN`), `zh-tw` (Traditional, `zh-TW`). Messages are in `i18n/locales/*.json`.
Docs (`content/docs`) are English-only; other locales show them with `noindex`.

| Locale | Native review |
| --- | --- |
| en | done |
| pl | pending (AI draft) |
| de | pending (AI draft) |
| zh-CN | pending (AI draft) |
| zh-TW | pending (AI draft) |

Each non-English file has `meta.reviewed: false` until a native speaker signs it off.

## Deploy (Cloudflare Pages)

Deployed by `.github/workflows/website.yml` on every push to `main` that touches the site (after lint, build and tests), to the
Cloudflare Pages project `pixsame-website` via `wrangler pages deploy`. Repo settings it needs:

- Variables: `NUXT_PUBLIC_TURNSTILE_SITE_KEY`, `NUXT_PUBLIC_CONTACT_ENDPOINT`, `NUXT_PUBLIC_WAITLIST_ENDPOINT` (see `.env.example`; copy it to `.env` locally).
- Secrets: `CLOUDFLARE_API_TOKEN` (Account > Cloudflare Pages > Edit), `CLOUDFLARE_ACCOUNT_ID`.

Build command `pnpm --filter @pixsame/website build`, output `apps/website/.output/public`. `public/_headers` sets CSP and caching.
The site is fully static. The contact and waitlist forms post to Google Apps Script web apps
(sources are kept out of the repo; the waitlist script is bound to the Google Sheet that stores signups).
Each script needs the Script property `TURNSTILE_SECRET`; the site key is `NUXT_PUBLIC_TURNSTILE_SITE_KEY`.

Optional runtime config (env `NUXT_PUBLIC_*` at build time): `APP_URL` (shows "Sign in"), `CF_ANALYTICS_TOKEN`, `TURNSTILE_SITE_KEY`, `CONTACT_ENDPOINT` (Apps Script web app behind `/contact`).
