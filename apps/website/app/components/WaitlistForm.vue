<script setup lang="ts">
const props = defineProps<{ product: string }>();
const { t, locale } = useI18n();

const { public: { waitlistEndpoint } } = useRuntimeConfig();
const { siteKey: turnstileSiteKey, token: turnstileToken } = useTurnstile();

const email = ref('');
const consent = ref(false);
const website = ref(''); // honeypot, must stay empty
const state = ref<'idle' | 'sending' | 'done' | 'error'>('idle');
const touched = ref(false);
const consentError = computed(() => (touched.value && !consent.value ? t('waitlist.consentRequired') : ''));

const submit = async () => {
  touched.value = true;
  if (website.value) return; // bot: pretend success
  if (!waitlistEndpoint) {
    state.value = 'error';
    return;
  }
  if (!consent.value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) return;
  state.value = 'sending';
  try {
    await postToAppsScript(waitlistEndpoint, {
      email: email.value.trim(),
      product: props.product,
      locale: locale.value,
      website: website.value,
      consent: 'yes',
      token: turnstileToken.value,
    });
    state.value = 'done';
  } catch {
    state.value = 'error';
  }
};
</script>

<template>
  <form class="px-glass !rounded-lg grid gap-x-12 gap-y-4 p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:items-center" novalidate @submit.prevent="submit">
    <h2 class="font-heading text-xl">{{ t('waitlist.title') }}</h2>
    <p v-if="state === 'done'" role="status" class="text-blue-text">{{ t('waitlist.success') }}</p>
    <div v-else class="grid gap-3">
      <div>
        <label for="waitlist-email" class="block text-sm text-muted">{{ t('waitlist.emailLabel') }}</label>
        <div class="mt-2 flex flex-wrap gap-2">
          <input
            id="waitlist-email"
            v-model="email"
            type="email"
            required
            autocomplete="email"
            :placeholder="t('waitlist.placeholder')"
            class="h-10 min-w-0 flex-1 rounded-md border border-glass-border bg-glass-strong px-3 text-ink placeholder:text-muted"
          >
          <input v-model="website" type="text" name="website" tabindex="-1" autocomplete="off" class="sr-only" aria-hidden="true" >
          <button
            type="submit"
            :disabled="state === 'sending'"
            class="px-btn px-btn-primary h-10 !px-5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {{ state === 'sending' ? t('waitlist.sending') : t('waitlist.submit') }}
          </button>
        </div>
      </div>
      <ConsentCheckbox id="waitlist-consent" v-model="consent" keypath="waitlist.consent" :error="consentError" />
      <div v-if="turnstileSiteKey" class="cf-turnstile" :data-sitekey="turnstileSiteKey" data-callback="pxTurnstile" />
      <p v-if="state === 'error'" role="alert" class="text-sm text-coral-text">{{ waitlistEndpoint ? t('waitlist.error') : t('contact.unavailable') }}</p>
    </div>
  </form>
</template>
