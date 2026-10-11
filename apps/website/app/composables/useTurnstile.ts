// Cloudflare Turnstile is only loaded when a site key is configured.
// The widget calls the global `pxTurnstile` callback (see data-callback in the forms).
export const useTurnstile = () => {
  const { public: { turnstileSiteKey } } = useRuntimeConfig();
  const token = ref('');
  if (turnstileSiteKey) {
    useHead({ script: [{ src: 'https://challenges.cloudflare.com/turnstile/v0/api.js', async: true, defer: true }] });
    if (import.meta.client) {
      (window as unknown as Record<string, unknown>).pxTurnstile = (value: string) => (token.value = value);
    }
  }
  return { siteKey: turnstileSiteKey, token };
};
