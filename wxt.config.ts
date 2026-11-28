import { transformCode } from '@code-inspector/core';
import { defineConfig } from 'wxt';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import type { Plugin } from 'vite';
import type { UserConfig } from 'wxt';

// Dev only: tags our JSX elements with `data-insp-path="file:line:col:tag"`, visible in DevTools Elements.
// ponytail: only the attribute transform of code-inspector; its click-to-open overlay needs `customElements`,
// which is null in content scripts.
const jsxSourcePath = (): Plugin => ({
  name: 'jsx-source-path',
  enforce: 'pre',
  transform: (code, id) =>
    id.endsWith('.tsx') && !id.includes('/node_modules/')
      ? transformCode({
          content: code,
          filePath: path.relative(import.meta.dirname, id),
          fileType: 'jsx',
          escapeTags: [],
          pathType: 'relative',
        })
      : undefined,
});

// See https://wxt.dev/api/config.html
const config: UserConfig = {
  modules: ['@wxt-dev/module-react', '@wxt-dev/i18n/module'],
  manifest: {
    name: '__MSG_extensionName__',
    description: '__MSG_extensionDescription__',
    default_locale: 'en',
    permissions: ['activeTab', 'storage'],
    // The background script fetches poe.ninja ratios for the content script (see entrypoints/background.ts)
    host_permissions: ['https://poe.ninja/*'],
    // Images are used by the content script on the trade site (see utils/extension-url.ts)
    web_accessible_resources: [
      {
        resources: ['assets/images/*', 'assets/images/currency/*/*', 'assets/sounds/*'],
        matches: ['https://*.pathofexile.com/*', 'https://poe.game.daum.net/*'],
      },
    ],
  },
  // Icons are sized like font icons (1em) unless CSS says otherwise
  svgr: { svgrOptions: { icon: true } },
  vite: ({ command }) => ({ plugins: command === 'serve' ? [jsxSourcePath()] : [] }),
  // outDir: './dist',
  webExt: {
    chromiumArgs: ['https://www.pathofexile.com/trade'],
  },
  hooks: {
    // The PoB import's data (public/pob-*.ndjson and .json) ships gzipped and is inflated by the background script
    // (ADR 0004); the readable files stay in git only
    'build:done': (wxt, output) => {
      for (const asset of output.publicAssets.filter(({ fileName }) => /^pob-.+\.(ndjson|json)$/.test(fileName))) {
        const file = path.join(wxt.config.outDir, asset.fileName);
        // A dev rebuild lists assets it did not copy again
        if (!fs.existsSync(file)) continue;
        fs.writeFileSync(`${file}.gz`, zlib.gzipSync(fs.readFileSync(file), { level: 9 }));
        fs.rmSync(file);
        // The build report lists it by its new name
        asset.fileName += '.gz';
      }
    },
    // WXT picks what to rebuild from the bundle's module ids, and Sass partials pulled in with @use aren't modules,
    // so saving styles/globals/_base.scss etc. was a silent no-op in dev. Touch the entry stylesheet instead.
    'server:started': (_, server) => {
      const entry = path.resolve(import.meta.dirname, 'styles/app.scss');
      server.watcher.on('change', file => {
        if (file.endsWith('.scss') && !file.endsWith('.module.scss') && file !== entry) {
          const now = new Date();
          fs.utimesSync(entry, now, now);
        }
      });
    },
  },
};

export default defineConfig(config);
