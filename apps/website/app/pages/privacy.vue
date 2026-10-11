<script setup lang="ts">
const { t } = useI18n();
useSeoMeta({ title: () => t('legal.privacy.title'), description: () => t('legal.privacy.p1') });
</script>

<template>
  <PageShell :crumbs="[{ label: t('legal.privacy.title') }]">
    <article class="px-prose">
      <h1>{{ t('legal.privacy.title') }}</h1>
      <p v-for="n in 3" :key="n">{{ t(`legal.privacy.p${n}`) }}</p>
    </article>
  </PageShell>
</template>
