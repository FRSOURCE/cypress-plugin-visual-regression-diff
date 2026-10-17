<script setup lang="ts">
const { t } = useI18n();
// The controller paragraph interpolates the shared `company` block, so the entity details live in one place.
const company = computed(() => ({
  name: t('company.name'),
  address1: t('company.address1'),
  address2: t('company.address2'),
  vat: t('company.vat'),
  email: t('company.email'),
}));
useSeoMeta({
  title: () => t('legal.privacy.title'),
  description: () => t('legal.privacy.p1'),
});
</script>

<template>
  <PageShell :crumbs="[{ label: t('legal.privacy.title') }]">
    <article class="px-prose">
      <h1>{{ t('legal.privacy.title') }}</h1>
      <p>{{ t('legal.updated') }}</p>
      <p v-for="n in 6" :key="n">{{ t(`legal.privacy.p${n}`, company) }}</p>
    </article>
  </PageShell>
</template>
