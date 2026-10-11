<script setup lang="ts">
const { t } = useI18n();
const { public: { appUrl } } = useRuntimeConfig();
const localePath = useLocalePath();

const nav = computed(() => [
  { to: '/products', label: t('nav.product') },
  { to: '/docs/getting-started/install', label: t('nav.docs') },
  { to: '/pricing', label: t('nav.pricing') },
  { to: '/changelog', label: t('nav.changelog') },
]);
</script>

<template>
  <header class="relative z-10 border-b border-hairline">
    <div class="px-container flex items-center justify-between gap-x-6 py-[22px]">
      <div class="flex items-center gap-10">
        <NuxtLink :to="localePath('/')" :aria-label="t('nav.home')">
          <PixsameLogo />
        </NuxtLink>
        <nav :aria-label="t('nav.label')" class="hidden gap-[26px] text-[13.5px] md:flex">
          <NuxtLink
            v-for="item in nav"
            :key="item.to"
            :to="localePath(item.to)"
            class="text-muted transition-colors hover:text-ink"
            active-class="text-ink"
          >
            {{ item.label }}
          </NuxtLink>
        </nav>
      </div>
      <div class="flex items-center gap-3 text-[13px]">
        <div class="hidden items-center gap-3 md:flex">
          <LanguageSwitcher />
          <ThemeToggle :label-to-light="t('theme.toLight')" :label-to-dark="t('theme.toDark')" />
        </div>
        <a v-if="appUrl" class="hidden text-muted hover:text-ink md:inline" :href="`${appUrl}/login`">{{ t('nav.signIn') }}</a>
        <PxButton class="hidden md:inline-flex" :to="localePath('/docs/getting-started/install')">{{ t('nav.install') }}</PxButton>
        <MobileMenu :nav="nav" />
      </div>
    </div>
  </header>
</template>
