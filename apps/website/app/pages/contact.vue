<script setup lang="ts">
const { t } = useI18n();
useSeoMeta({ title: () => t('contact.title'), description: () => t('contact.intro') });
</script>

<template>
  <PageShell :crumbs="[{ label: t('contact.title') }]">
    <div class="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <div>
        <h1 class="font-heading text-4xl">{{ t('contact.heading') }}</h1>
        <p class="mt-4 max-w-[48ch] text-muted">{{ t('contact.intro') }}</p>
        <dl class="mt-10 grid gap-6 text-sm">
          <div>
            <dt class="px-eyebrow !text-faint">{{ t('contact.emailLabel') }}</dt>
            <dd class="mt-2"><a href="mailto:pixsame@frsource.org" class="text-ink hover:text-coral-text">pixsame@frsource.org</a></dd>
          </div>
          <div>
            <dt class="px-eyebrow !text-faint">{{ t('contact.company') }}</dt>
            <dd class="mt-2 not-italic text-muted">
              <address class="not-italic">
                FRS JAKUB FREISLER<br>
                al. Kijowska 48/24<br>
                30-079 Kraków, Poland
              </address>
            </dd>
          </div>
          <div>
            <dt class="px-eyebrow !text-faint">{{ t('contact.taxIds') }}</dt>
            <dd class="mt-2 font-mono text-muted">
              VAT ID: PL6783179514<br>
              NIP: 6783179514
            </dd>
          </div>
        </dl>
      </div>
      <ContactForm />
    </div>
  </PageShell>
</template>
