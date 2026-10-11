<script setup lang="ts">
const { t, locale } = useI18n();

const { public: { turnstileSiteKey, contactEndpoint } } = useRuntimeConfig();
const turnstileToken = ref('');
// Cloudflare Turnstile is only loaded when a site key is configured.
if (turnstileSiteKey) {
  useHead({ script: [{ src: 'https://challenges.cloudflare.com/turnstile/v0/api.js', async: true, defer: true }] });
  if (import.meta.client) {
    (window as unknown as Record<string, unknown>).pxTurnstile = (token: string) => (turnstileToken.value = token);
  }
}

const form = reactive({ name: '', email: '', message: '' });
const website = ref(''); // honeypot, must stay empty
const state = ref<'idle' | 'sending' | 'done' | 'error'>('idle');
const touched = ref(false);

const errors = computed(() => ({
  name: form.name.trim() ? '' : t('contact.required'),
  email: !form.email.trim() ? t('contact.required') : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) ? '' : t('contact.invalidEmail'),
  message: form.message.trim() ? '' : t('contact.required'),
}));
const valid = computed(() => !errors.value.name && !errors.value.email && !errors.value.message);

// The endpoint is a Google Apps Script web app. A text/plain POST with the data in the
// query string is a CORS "simple request", so the browser sends no preflight.
const send = async (attempt = 0): Promise<void> => {
  const params = new URLSearchParams({
    name: form.name.trim(),
    email: form.email.trim(),
    message: form.message.trim(),
    locale: locale.value,
    website: website.value,
    token: turnstileToken.value,
  });
  let result: { result?: string } | undefined;
  try {
    const res = await fetch(`${contactEndpoint}?${params}`, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    });
    result = await res.json();
  } catch (error) {
    // Network failure: retry. A server answer (even an error) is final.
    if (attempt < 2) return send(attempt + 1);
    throw error;
  }
  if (result?.result !== 'success') throw new Error('contact_failed');
};

const submit = async () => {
  touched.value = true;
  if (website.value) return; // bot: pretend success
  if (!valid.value || !contactEndpoint) {
    if (!contactEndpoint) state.value = 'error';
    return;
  }
  state.value = 'sending';
  try {
    await send();
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
