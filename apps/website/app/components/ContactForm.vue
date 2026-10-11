<script setup lang="ts">
const { t, locale } = useI18n();

const { public: { contactEndpoint } } = useRuntimeConfig();
const { siteKey: turnstileSiteKey, token: turnstileToken } = useTurnstile();

const form = reactive({ name: '', email: '', message: '' });
const consent = ref(false);
const website = ref(''); // honeypot, must stay empty
const state = ref<'idle' | 'sending' | 'done' | 'error'>('idle');
const touched = ref(false);

const errors = computed(() => ({
  name: form.name.trim() ? '' : t('contact.required'),
  email: !form.email.trim() ? t('contact.required') : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) ? '' : t('contact.invalidEmail'),
  message: form.message.trim() ? '' : t('contact.required'),
  consent: consent.value ? '' : t('contact.consentRequired'),
}));
const valid = computed(() => !Object.values(errors.value).some(Boolean));

const submit = async () => {
  touched.value = true;
  if (website.value) return; // bot: pretend success
  if (!valid.value || !contactEndpoint) {
    if (!contactEndpoint) state.value = 'error';
    return;
  }
  state.value = 'sending';
  try {
    await postToAppsScript(contactEndpoint, {
      name: form.name.trim(),
      email: form.email.trim(),
      message: form.message.trim(),
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

const field = 'mt-2 w-full rounded-md border border-glass-border bg-glass-strong px-3 text-ink placeholder:text-muted';
</script>

<template>
  <form class="px-glass !rounded-lg grid gap-5 p-6" novalidate @submit.prevent="submit">
    <p v-if="state === 'done'" role="status" class="text-blue-text">{{ t('contact.success') }}</p>
    <template v-else>
      <div v-for="f in (['name', 'email'] as const)" :key="f">
        <label :for="`contact-${f}`" class="block text-sm text-muted">{{ t(`contact.${f}`) }}</label>
        <input
          :id="`contact-${f}`"
          v-model="form[f]"
          :type="f === 'email' ? 'email' : 'text'"
          :autocomplete="f"
          required
          :aria-invalid="touched && !!errors[f]"
          :aria-describedby="touched && errors[f] ? `contact-${f}-error` : undefined"
          :class="[field, 'h-10']"
        >
        <p v-if="touched && errors[f]" :id="`contact-${f}-error`" class="mt-1 text-sm text-coral-text">{{ errors[f] }}</p>
      </div>
      <div>
        <label for="contact-message" class="block text-sm text-muted">{{ t('contact.message') }}</label>
        <textarea
          id="contact-message"
          v-model="form.message"
          required
          rows="6"
          :aria-invalid="touched && !!errors.message"
          :aria-describedby="touched && errors.message ? 'contact-message-error' : undefined"
          :class="[field, 'py-2']"
        />
        <p v-if="touched && errors.message" id="contact-message-error" class="mt-1 text-sm text-coral-text">{{ errors.message }}</p>
      </div>
      <ConsentCheckbox id="contact-consent" v-model="consent" keypath="contact.consent" :error="touched ? errors.consent : ''" />
      <input v-model="website" type="text" name="website" tabindex="-1" autocomplete="off" class="sr-only" aria-hidden="true" >
      <div v-if="turnstileSiteKey" class="cf-turnstile" :data-sitekey="turnstileSiteKey" data-callback="pxTurnstile" />
      <div>
        <button type="submit" :disabled="state === 'sending'" class="px-btn px-btn-primary h-10 !px-5 disabled:cursor-not-allowed disabled:opacity-60">
          {{ state === 'sending' ? t('contact.sending') : t('contact.submit') }}
        </button>
      </div>
      <p v-if="state === 'error'" role="alert" class="text-sm text-coral-text">{{ contactEndpoint ? t('contact.error') : t('contact.unavailable') }}</p>
    </template>
  </form>
</template>
