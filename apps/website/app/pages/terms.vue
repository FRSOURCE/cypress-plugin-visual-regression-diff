<script setup lang="ts">
const { t } = useI18n();
useSeoMeta({
  title: () => t('legal.terms.title'),
  description: () => t('legal.terms.p1'),
});
</script>

<template>
  <PageShell :crumbs="[{ label: t('legal.terms.title') }]">
    <article class="px-prose">
      <h1>{{ t('legal.terms.title') }}</h1>
      <p v-for="n in 3" :key="n">{{ t(`legal.terms.p${n}`) }}</p>
    </article>
  </PageShell>
</template>
