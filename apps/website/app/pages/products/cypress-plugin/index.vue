<script setup lang="ts">
// The body of this page is the package README (sliced in nuxt.config.ts), so the plugin
// has one source of documentation. It is English in every locale.
const { t, locale } = useI18n();
const localePath = useLocalePath();
useSeoMeta({
  title: () => t('cypress.title'),
  description: () => t('cypress.body'),
});
const { data: page } = await useAsyncData('readme:cypress-plugin', () =>
  queryCollection('readme').first(),
);
const toc = computed(
  () => page.value?.body?.toc?.links?.filter((l) => l.depth === 2) ?? [],
);
</script>

<template>
  <PageShell
    :crumbs="[
      { label: t('nav.product'), to: '/products' },
      { label: t('cypress.crumb') },
    ]"
  >
    <p class="px-eyebrow">{{ t('cypress.eyebrow') }}</p>
    <h1 class="mt-4 text-[clamp(2.2rem,4.6vw,2.9rem)] leading-[1.06]">
      {{ t('cypress.title') }}
    </h1>
    <p class="mt-5 max-w-[60ch] text-[16.5px] leading-relaxed text-muted">
      {{ t('cypress.body') }}
    </p>
    <div class="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
      <InstallCommand />
      <PxButton
        variant="ghost"
        :to="localePath('/docs/getting-started/install')"
        >{{ t('cypress.docs') }} →</PxButton
      >
      <PxButton
        variant="ghost"
        :to="localePath('/products/cypress-plugin/changelog')"
        >{{ t('cypress.changelog') }} →</PxButton
      >
      <PxButton
        variant="ghost"
        :to="localePath('/docs/getting-started/migrate-from-frsource')"
        >{{ t('cypress.migrate') }} →</PxButton
      >
      <PxButton
        variant="ghost"
        to="https://www.npmjs.com/package/@pixsame/cypress-plugin-visual-regression-diff"
        >{{ t('cypress.npm') }} ↗</PxButton
      >
    </div>

    <div
      class="mt-14 grid grid-cols-1 gap-x-12 gap-y-8 xl:grid-cols-[minmax(0,1fr)_200px]"
    >
      <article class="px-prose min-w-0 !max-w-[88ch]" lang="en">
        <p
          v-if="locale !== 'en'"
          class="rounded-md border border-hairline bg-chip px-3 py-2 text-xs !text-faint"
        >
          {{ t('docs.englishSection') }}
        </p>
        <ContentRenderer v-if="page" :value="page" />
      </article>
      <aside
        v-if="toc.length"
        class="hidden xl:sticky xl:top-8 xl:block xl:self-start"
        :aria-label="t('cypress.onThisPage')"
      >
        <p class="px-eyebrow !text-faint">{{ t('cypress.onThisPage') }}</p>
        <ul class="mt-4 space-y-2 text-sm">
          <li v-for="l in toc" :key="l.id">
            <a
              :href="`#${l.id}`"
              class="text-muted transition-colors hover:text-ink active:text-coral-text"
              >{{ l.text }}</a
            >
          </li>
        </ul>
      </aside>
    </div>
  </PageShell>
</template>
