import { defineConfig } from 'vite';
import { generateChromeMessages, parseMessagesText } from '@wxt-dev/i18n/build';
import { WxtVitest } from 'wxt/testing/vitest-plugin';
import svgr from 'vite-plugin-svgr';
import type { Plugin } from 'vite';

// Compiles `locales/*.yml` the way WXT does for `_locales/*/messages.json`, for `.storybook/i18n-mock.ts`
const localeMessages = (): Plugin => ({
  name: 'bt-locale-messages',
  enforce: 'pre',
  transform: (code, id) => {
    if (!/\/locales\/[^/]+\.yml$/.test(id)) return;
    return `export default ${JSON.stringify(generateChromeMessages(parseMessagesText(code, 'YAML')))};`;
  },
});

export default defineConfig({
  plugins: [
    // Add all the vite config from your wxt.config.ts, including the built-in
    // plugins and config WXT sets up automatically.
    WxtVitest(),
    svgr({ svgrOptions: { icon: true } }),
    localeMessages(),
  ],
});
