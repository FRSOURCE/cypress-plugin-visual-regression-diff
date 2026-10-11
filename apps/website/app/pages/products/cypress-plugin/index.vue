<script setup lang="ts">
const { t } = useI18n();
const localePath = useLocalePath();
useSeoMeta({ title: () => t('cypress.title'), description: () => t('cypress.body') });
const { data: page } = await useAsyncData('product:cypress-plugin', () => queryCollection('products').path('/products/cypress-plugin').first());
const toc = computed(() => page.value?.body?.toc?.links?.filter(l => l.depth === 2) ?? []);
const install = 'npm i -D @pixsame/cypress-plugin-visual-regression-diff';
const copied = ref(false);
const copy = async () => {
  try {
    await navigator.clipboard.writeText(install);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1600);
  } catch {
    /* clipboard unavailable: the command stays selectable */
  }
};
</script>

<template>
  <PageShell :crumbs="[{ label: t('nav.product'), to: '/products' }, { label: t('cypress.crumb') }]">
    <p class="px-eyebrow">{{ t('cypress.eyebrow') }}</p>
    <h1 class="mt-4 text-[clamp(2.2rem,4.6vw,2.9rem)] leading-[1.06]">{{ t('cypress.title') }}</h1>
    <p class="mt-5 max-w-[60ch] text-[16.5px] leading-relaxed text-muted">{{ t('cypress.body') }}</p>
    <div class="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
      <div class="px-glass flex w-full max-w-full items-center gap-3 !rounded-lg px-4 py-3 font-mono text-[13px] sm:w-auto">
        <span class="text-faint" aria-hidden="true">$</span>
        <code class="min-w-0 overflow-x-auto whitespace-nowrap">{{ install }}</code>
        <button type="button" class="ml-auto shrink-0 cursor-pointer text-[11px] font-medium tracking-[0.1em] text-coral-text transition-colors hover:text-ink active:opacity-70" @click="copy">
          {{ copied ? t('hero.copied') : t('hero.copy') }}
        </button>
      </div>
      <PxButton variant="ghost" :to="localePath('/docs/getting-started/install')">{{ t('cypress.docs') }} →</PxButton>
      <PxButton variant="ghost" :to="localePath('/products/cypress-plugin/changelog')">{{ t('cypress.changelog') }} →</PxButton>
      <PxButton variant="ghost" to="https://www.npmjs.com/package/@pixsame/cypress-plugin-visual-regression-diff">{{ t('cypress.npm') }} ↗</PxButton>
    </div>

    <div class="mt-14 grid grid-cols-1 gap-x-12 gap-y-8 xl:grid-cols-[minmax(0,1fr)_200px]">
      <article class="px-prose min-w-0 !max-w-[88ch]">
        <ContentRenderer v-if="page" :value="page" />
      </article>
      <aside v-if="toc.length" class="hidden xl:sticky xl:top-8 xl:block xl:self-start" :aria-label="t('cypress.onThisPage')">
        <p class="px-eyebrow !text-faint">{{ t('cypress.onThisPage') }}</p>
        <ul class="mt-4 space-y-2 text-sm">
          <li v-for="l in toc" :key="l.id">
            <a :href="`#${l.id}`" class="text-muted transition-colors hover:text-ink active:text-coral-text">{{ l.text }}</a>
          </li>
        </ul>
      </aside>
    </div>
  </PageShell>
</template>
