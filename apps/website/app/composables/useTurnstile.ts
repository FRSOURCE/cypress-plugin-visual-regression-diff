// Cloudflare Turnstile, rendered explicitly. Implicit rendering (the `cf-turnstile` class) only scans the
// DOM when api.js first loads, so a form reached by client-side navigation would never get a widget and
// every submission would be rejected by the Apps Script's siteverify call. Only loaded when a site key is set.
type Turnstile = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: Turnstile;
    pxTurnstileLoad?: () => void;
  }
}

const SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=pxTurnstileLoad';
let loading: Promise<Turnstile> | undefined;
const load = () => {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loading ??= new Promise<Turnstile>((resolve) => {
    window.pxTurnstileLoad = () => resolve(window.turnstile!);
    const script = document.createElement('script');
    script.src = SRC;
    script.async = true;
    document.head.append(script);
  });
  return loading;
};

export const useTurnstile = () => {
  const {
    public: { turnstileSiteKey: siteKey },
  } = useRuntimeConfig();
  const token = ref('');
  // The form binds this to an empty <div ref="container">; the widget is rendered into it.
  const container = ref<HTMLElement | null>(null);
  let widget: string | undefined;

  onMounted(async () => {
    if (!siteKey || !container.value) return;
    const turnstile = await load();
    if (!container.value) return; // the form went away while api.js was loading
    widget = turnstile.render(container.value, {
      sitekey: siteKey,
      callback: (value: string) => {
        token.value = value;
      },
      'expired-callback': () => {
        token.value = '';
      },
      'error-callback': () => {
        token.value = '';
      },
    });
  });
  onBeforeUnmount(() => {
    try {
      if (widget) window.turnstile?.remove(widget);
    } catch {
      /* the widget's element may already be gone */
    }
  });

  return { siteKey, token, container };
};
