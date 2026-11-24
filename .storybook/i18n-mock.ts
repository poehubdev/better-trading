/**
 * Stand-in for `chrome.i18n.getMessage` that serves `locales/*.yml` in the Storybook toolbar locale, so stories render
 * the real `buildMessages()` strings. Missing keys fall back to `en`, like Chrome falls back to `default_locale`.
 */
type ChromeMessages = Record<string, { message: string }>;

const files = import.meta.glob<ChromeMessages>('../locales/*.yml', { eager: true, import: 'default' });
const byLocale: Record<string, ChromeMessages> = Object.fromEntries(
  Object.entries(files).map(([path, messages]) => [path.split('/').pop()!.replace('.yml', ''), messages]),
);

let current: ChromeMessages = byLocale.en!;

/** 'pt-BR' reads `pt_BR.yml`, 'de-DE' reads `de.yml` */
export const setStoryLocale = (locale: string) => {
  const [lang] = locale.split('-');
  current = { ...byLocale.en, ...byLocale[lang!], ...byLocale[locale.replace('-', '_')] };
};

const getMessage = (key: string, substitutions?: string | string[]) => {
  const subs = typeof substitutions === 'string' ? [substitutions] : (substitutions ?? []);
  return (current[key]?.message ?? '').replace(/\$(\d)/g, (_, index: string) => subs[Number(index) - 1] ?? '');
};

// Chrome exposes a `chrome` object to regular pages too, just without `i18n`
const globals = globalThis as { chrome?: { i18n?: unknown } };
globals.chrome ??= {};
globals.chrome.i18n = { getMessage };
