<script setup lang="ts">
definePageMeta({ layout: 'docs' });

const route = useRoute();
const { t, locale } = useI18n();

// Docs are English-only. Other locales render the same content, flagged noindex.
const path = computed(() => `/docs/${([] as string[]).concat(route.params.slug as string[]).join('/')}`);
const { data: page } = await useAsyncData(() => `doc:${path.value}`, () => queryCollection('docs').path(path.value).first(), { watch: [path] });
if (!page.value) throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true });

const { data: pages } = await useAsyncData('doc-nav', () => queryCollection('docs').select('title', 'path', 'order').order('order', 'ASC').all());

// /docs/<group>/<page>: the group is the second path segment.
const groups = computed(() => {
  const order = ['getting-started', 'reference', 'integrations'];
  return order
    .map(key => ({ key, items: (pages.value ?? []).filter(p => p.path.split('/')[2] === key) }))
    .filter(g => g.items.length);
});
const group = computed(() => path.value.split('/')[2] ?? '');
const toc = computed(() => page.value?.body?.toc?.links?.filter(l => l.depth === 2) ?? []);

// Scroll-spy: the "on this page" entry whose heading last crossed the top of the viewport is marked.
const activeId = ref('');
let observer: IntersectionObserver | undefined;
const observe = () => {
  observer?.disconnect();
  const heads = toc.value.map(l => document.getElementById(l.id)).filter((el): el is HTMLElement => !!el);
  if (!heads.length) return;
  const update = () => {
    const line = window.innerHeight * 0.3;
    const passed = heads.filter(h => h.getBoundingClientRect().top <= line);
    activeId.value = (passed.at(-1) ?? heads[0]!).id;
  };
  observer = new IntersectionObserver(update, { rootMargin: '0px 0px -70% 0px', threshold: [0, 1] });
  heads.forEach(h => observer!.observe(h));
  window.addEventListener('scroll', update, { passive: true });
  cleanup = () => window.removeEventListener('scroll', update);
  update();
};
let cleanup: (() => void) | undefined;
onMounted(() => nextTick(observe));
watch(toc, () => nextTick(() => { cleanup?.(); observe(); }));
onBeforeUnmount(() => { observer?.disconnect(); cleanup?.(); });

useSeoMeta({
  title: () => page.value?.title,
  description: () => page.value?.description,
  robots: () => (locale.value === 'en' ? undefined : 'noindex, follow'),
});
</script>

<template>
  <PageShell
    :crumbs="[
      { label: t('nav.docs'), to: '/docs/getting-started/install' },
      { label: t(`docs.groups.${group}`) },
      { label: page?.title ?? '' },
    ]"
  >
    <div class="grid grid-cols-1 gap-x-12 gap-y-6 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_200px]">
      <nav :aria-label="t('nav.docs')" class="lg:sticky lg:top-8 lg:self-start">
        <details class="group lg:hidden">
          <summary class="flex cursor-pointer list-none items-center justify-between rounded-md border border-glass-border px-3 py-2.5 text-sm font-medium">
            {{ t('docs.menu') }}
            <svg class="transition-transform group-open:rotate-180" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
          </summary>
          <div class="mt-3"><DocsNavGroups :groups="groups" /></div>
        </details>
        <div class="hidden lg:block"><DocsNavGroups :groups="groups" /></div>
        <p v-if="locale !== 'en'" class="mt-6 text-xs text-faint">{{ t('docs.englishOnly') }}</p>
      </nav>

      <article class="px-prose min-w-0">
        <ContentRenderer v-if="page" :value="page" />
      </article>

      <aside v-if="toc.length" class="hidden xl:sticky xl:top-8 xl:block xl:self-start" :aria-label="t('docs.onThisPage')">
        <p class="px-eyebrow !text-faint">{{ t('docs.onThisPage') }}</p>
        <ul class="mt-4 space-y-2 text-sm">
          <li v-for="l in toc" :key="l.id">
            <a
              :href="`#${l.id}`"
              class="transition-colors hover:text-ink active:text-coral-text"
              :class="activeId === l.id ? 'font-medium text-coral-text' : 'text-muted'"
              :aria-current="activeId === l.id ? 'location' : undefined"
            >{{ l.text }}</a>
          </li>
        </ul>
      </aside>
    </div>
  </PageShell>
</template>
