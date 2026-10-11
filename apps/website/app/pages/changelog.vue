<script setup lang="ts">
// Index of the per-integration changelogs. Only the ones that have release notes yet are links.
const { t } = useI18n();
const localePath = useLocalePath();
const NuxtLink = resolveComponent('NuxtLink');
useSeoMeta({ title: () => t('changelogs.title'), description: () => t('changelogs.body') });
const integrations = [
  { key: 'cypress', to: '/products/cypress-plugin/changelog', available: true },
  { key: 'manifest', to: '/docs/reference/manifest', available: true },
  { key: 'playwright', available: false },
  { key: 'vitest', available: false },
  { key: 'renderer', available: false },
  { key: 'githubApp', available: false },
] as { key: string; to?: string; available: boolean }[];
</script>

<template>
  <PageShell :crumbs="[{ label: t('nav.changelog') }]">
    <h1 class="text-[clamp(2rem,4.6vw,2.9rem)] leading-[1.06]">{{ t('changelogs.title') }}</h1>
    <p class="mt-4 max-w-[60ch] text-muted">{{ t('changelogs.body') }}</p>
    <ul class="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <li v-for="p in integrations" :key="p.key">
        <component
          :is="p.to ? NuxtLink : 'div'"
          v-bind="p.to ? { to: localePath(p.to) } : {}"
          class="px-glass group relative flex h-full flex-col !rounded-lg p-5"
          :class="p.to ? 'transition-colors hover:bg-glass-strong active:opacity-80' : 'opacity-70'"
        >
          <svg v-if="p.to" class="absolute top-4 right-4 text-faint transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-ink" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg>
          <span class="font-mono text-[10px] tracking-[0.12em] uppercase" :class="p.available ? 'text-blue-text' : 'text-faint'">
            {{ p.available ? t('pricing.oss.available') : t('pricing.soon') }}
          </span>
          <span class="mt-3 text-[17px] font-semibold">{{ t(`pricing.oss.${p.key}`) }}</span>
          <span class="mt-2 text-sm leading-relaxed text-muted">{{ t(`pricing.oss.${p.key}Body`) }}</span>
        </component>
      </li>
    </ul>
  </PageShell>
</template>
