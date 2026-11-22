# AGENTS.md

Guidance for coding agents working in this repository.

## Project

Better Trading: a browser extension for the pathofexile.com trade site (PoE 1 and 2), rewritten from Ember.js
to WXT + React 19 + TypeScript. The legacy Ember code may sit in `old-extension/` (git-ignored, often absent, excluded
from `tsc` and ESLint); it is only a porting reference, never edit it. The behavioural reference is the upstream repo
`exile-center/better-trading` (checked out at `~/www/better-trading`). Domain terms (Game Version, Folder, Trade, …)
are defined in `GLOSSARY.md`; decisions in `docs/adr/`.

## Commands

Package manager is pnpm (Node `lts/jod`, see `.nvmrc`).

- `pnpm dev` / `pnpm dev:firefox` — WXT dev mode (opens Chromium on `https://www.pathofexile.com/trade`)
- `pnpm build` / `pnpm zip` (add `:firefox` variants) — production build / store zip into `.output/`
- `pnpm storybook` — Storybook on :6006; the primary way to develop UI components in isolation
- `pnpm compile` — `tsc --noEmit` type check
- `pnpm lint` / `pnpm lint:fix`, `pnpm format` / `pnpm format:check`
- `pnpm test` / `pnpm test:watch` — vitest (`vitest.config.ts`, WXT's vitest plugin). Single file or test:
  `pnpm test services/pob/mods.test.ts` / `pnpm test -t '<name>'`. Tests sit next to the code as `*.test.ts`; most
  cover `services/pob/` (ported from the pob2bt CLI) with Build Code fixtures in `services/pob/fixtures/` and
  snapshots in `__snapshots__/`. Work test-first there: add a failing test for the behavior, then change the code.

**Non-TTY shells (agents, scripts):** run `wxt`, `pnpm` and `git commit` (its hook calls pnpm) as
`CI=true timeout 20 <cmd> < /dev/null`. Without `CI=true`, Vite watches stdin: a closed stdin makes `wxt build`
exit 0 mid-build with an empty `.output/`, and a never-closing one makes `wxt prepare` (the `postinstall`) hang.

The husky pre-commit hook runs `lint-staged` (prettier + eslint --fix) and then `pnpm compile`, so type errors block
commits. It does not run the tests.

`bin/next-tickets` lists open GitHub issues in dependency waves (which ticket to pick next).

**Releasing:** set `changelog` in `package.json` to a new slug and write `changelogs/<slug>.md` (shown in the
in-app changelog banner; WXT takes the manifest version from `package.json`), commit, then
`npm version patch|minor|major` (bumps `version`, commits, tags `vX.Y.Z`) and `git push --follow-tags`. The tag
triggers `.github/workflows/build.yml`, which builds both browsers and creates a GitHub Release with the zips
(incl. the sources zip AMO asks for). The job fails if the tag doesn't match `package.json` `version`.

## Architecture

**Entrypoints** (`entrypoints/`):
- `content/` — content script injected on all PoE trade domains; mounts a React root via WXT `createIntegratedUi`
  into `body` (`#better-trading-container`). `App.tsx` is the shell: it nests the context providers, renders the
  header, changelog banner and the current root page (bookmarks / history / pinned items, or settings), and
  remembers the page in local storage.
- `background.ts` — service worker. Its only job is proxying `poe.ninja` API requests
  (`{ query: 'poe-ninja', resource }` message) because content scripts can't fetch cross-origin. Called via
  `utils/extension-background.ts` from `services/poe-ninja.ts`.

**Strings flow top-down.** Components never call i18n. `hooks/useMessages.ts` resolves every user-visible string
from `locales/en.yml` (`@wxt-dev/i18n`, `#i18n`) and `App.tsx` spreads them into components as props
(`{...messages.header}`). Storybook supplies the same props per locale via `.storybook/locale-utils.ts`
(`defineMessages` / `resolveLocaleValue`).

**Layers** (all imported with the `@/` alias):
- `components/<Name>/index.tsx` + `styles.module.scss` + `<Name>.stories.tsx` — UI. `Page*` components are the
  root pages.
- `contexts/` — app state: `BookmarksContext` (folders, wraps `services/bookmarks/storage.ts`, refreshes after every
  mutation), `TradeHistoryContext`, `FlashMessagesContext`, `ItemResultsContext` (wires the result enhancers and
  pinned items). `hooks/` holds thin wrappers and DOM/storage hooks.
- `services/` — non-React logic: `bookmarks/storage.ts` (persistence), `poe-ninja.ts` (chaos ratios, cached 1 h),
  `item-results/enhancers/*` (stateful enhancers), `pob/` (Path of Building build code → trade search import).
- `utils/` — pure helpers (storage, trade-location parsing, bookmark export/backup, DOM item parsing, and the
  stateless enhancers in `utils/item-results/enhancers/`).
- `types/` — shared types (`*Struct` naming for persisted shapes).

**Item enhancement flow**: `useItemEnhancer` runs a `MutationObserver` on the trade site's `#trade` element,
finds un-enhanced `.resultset > div.row[data-id]` rows (marked with the `bt-enhanced` attribute afterwards), and
runs each enhancer's `initialize` → `prepare` → `enhance` (per item) / `clear`, sequentially through a promise
queue. Enhancers implement `ItemResultsEnhancerService` (`types/item-results.ts`), are registered in
`ItemResultsContext`, and can be disabled by `slug` from settings.

**Storage** (`utils/storage.ts`, keys prefixed `bt-`): two tiers. `getValue` / `setValue` / `setEphemeralValue`
are async over `chrome.storage.local` with optional expiry (`{ value, expiresAt }`) — bookmarks, trade history
(max 50), poe.ninja cache. `getLocalValue` / `setLocalValue` are sync over `localStorage` for UI state (current
page, collapsed panel, disabled enhancers). Both degrade to no-op if unavailable.

**PoB stat data** (ADR 0002): `public/pob-stats.ndjson` is committed and shipped as a public asset; the background
script fetches it and `services/pob/mods.ts` indexes it. It is generated by `scripts/pob-stats.ts`, nothing is
downloaded at build or test time. Two kinds of lines:

- Stat lines (matchers, trade ids) in Awakened PoE Trade's `stats.ndjson` format, slimmed to the fields `mods.ts`
  reads. They come from dat-mcp (`~/www/poehubdev/dat-mcp`), which generates them from the game files.
- Unique lines from `scripts/pob-uniques.ndjson`, copied verbatim: `{ unique: <name>, fixed?, multiBase? }`.
  `fixed` lists the trade stat numbers (`stat_<n>`, `effect_<n>`) every copy has; the import searches the unique's other explicit
  mods as random. `multiBase` marks a name shared by several bases, so the search also sets the base type. Game data
  can't produce these, so the file was taken from APT at 2498730 and is edited by hand: add a unique there when the
  import searches stats every copy has, or misses its base.

On a new PoE1 patch: in dat-mcp run `npm run stats -- poe1 <patch>`, here run
`pnpm pob-stats ~/www/poehubdev/dat-mcp/data/poe1-<patch>-stats.ndjson`, then `pnpm test`, and commit the regenerated
file (snapshot changes are expected only where the new patch changed stat texts or ids).

**Storybook**: stories run the real contexts and services; `.storybook/chrome-storage-mock.ts` is an in-memory
`chrome.storage.local`, and `.storybook/mock-providers.tsx` has mock providers (`MockTradeHistoryProvider`, …) for
seeding context state.

**Dev tooling**: in `pnpm dev`, JSX elements carry `data-insp-path="file:line:col:tag"` (see `wxt.config.ts`), so
an element on the page maps straight to its source. Saving a global Sass partial touches `styles/app.scss` to force
a rebuild.

## Conventions

ESLint enforces (see `eslint.config.ts`): arrow-function expressions only (`func-style`), `import type` for
type-only imports, a specific `import-x/order` (index → sibling → parent → `@/` internal → external → builtin →
type), and `export` statements last in the file. No parent-relative imports (`../`) in TS or SCSS `@use`: use the
`@/` alias (e.g. `@/components/Button`, `@/.storybook/locale-utils`, `@use '@/styles/variables'`); only
same-directory `./` imports stay relative. Prettier: single quotes, no parens on single-arg arrows, 120 columns,
trailing commas. Styles are SCSS modules; global trade-site tweaks live in `styles/globals/`. SVG icons in
`assets/icons/` are imported as React components through `vite-plugin-svgr` (`modules/svgr.ts`), sized 1em by
default.

**Every new component needs a Storybook story** (`<Name>.stories.tsx` next to it). Stories must work with the
Storybook locale switcher (toolbar `locale` global, see `.storybook/preview.tsx`): supply user-visible strings per
locale via `defineMessages` / `resolveLocaleValue`, and check the component under other locales, because fonts and
text length change per language. Only `en` exists in `locales/` today, but more languages WILL be added, so never
assume English-only layout or hardcode strings in components.

**Port, don't copy.** When migrating something from the Ember version, review the old solution first: keep it if it
worked well, redesign it if there is a clearly better approach. Parity is about behavior, not about code structure.

**Look at the page before judging it.** When the user talks about an object on a page (an element, a layout, a
style, a rendered item, a visual bug), assess it live with the Chrome DevTools MCP (e.g. `mcp__chrome-9222__*`:
`take_snapshot`, `take_screenshot`, `get_css_styles`, `evaluate_script`) instead of guessing from the source code.
Before the first MCP call, check the setup and report what's missing instead of working around it:
1. Chrome is up: `list_pages` succeeds. If it fails, Chrome isn't running with debugging on port 9222; ask the
   user to start it, don't launch one yourself.
2. The extension is current: `pnpm dev` is running (`pgrep -af wxt`), or `.output/` was rebuilt after your last
   change and the extension was reloaded.
3. The page works: a `pathofexile.com/trade` tab is open and loaded (not a login or Cloudflare page), and
   `document.querySelector('#better-trading-container')` returns an element.

## Agent skills

### Issue tracker

Issues live in GitHub Issues for `message/better-trading` (via the `gh` CLI). See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-label vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See
`docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
