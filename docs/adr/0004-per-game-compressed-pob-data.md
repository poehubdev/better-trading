# The PoB import's data is pruned to Character Stats, gzipped at build time and loaded per game

With PoE 2 (parent ticket #29) the import ships four data files: a stat file and a Mod Pool file per game. The stat files
carry every trade stat of the game's catalogue (currency, maps, monsters, areas), though a Build Code only ever
names stats of things a character carries. Unpacked they were 8.1 MB of a 2.15 MB zip, and the background script loaded
what it needed for one game only by luck of the file split.

Three changes:

- **Pruning.** `pnpm pob-stats` keeps a stat line only if it is a Character Stat (GLOSSARY.md): its trade id is in some
  Mod Pool of the game, in a unique line (every source line, not the merged ones: a hand-kept `fixed` replaces PoB's,
  which lists more of the unique's mods), or in the game's item stats (`scripts/pob-item-stats[-poe2].json`). Ids
  with an option (`|`: Allocates, Forbidden Flame, Timeless jewel conquerors) and ids without a stat number (pseudo stats,
  Timeless seeds) always stay.
- **Item stats.** Mods only uniques, Foulborn, Special or Exclusive items carry are in no Mod Pool. `pnpm pob-unique-mods`
  collects them from Path of Building: the stat numbers of every line of every unique definition (implicits too) and the
  trade hashes of its item mod lists (`Data/Mod*.lua` but maps', `Viscera.lua`, `Uniques/Special/*.lua`). A first
  version without them failed 14 tests (granted skills, jewel implicits, "You have ..." lines); the rule was corrected,
  not the tests or snapshots.
- **Gzip at build time, load per game.** `public/pob-*` stay readable in git; a WXT `build:done` hook gzips them into
  `.gz` files (level 9) and removes the originals. The background script fetches the imported game's two `.gz` files on
  its first import of that game and inflates them with `DecompressionStream('gzip')`. Importing PoE 1 never fetches
  PoE 2's files and the reverse (checked in Chrome: only that game's two requests).

## Sizes (PoE 1 + PoE 2)

| | before | after |
| --- | --- | --- |
| Unpacked extension (`.output/chrome-mv3`) | 8,083,732 B | 2,627,177 B |
| Zip | 2,151,151 B | 2,078,762 B |
| PoE 1 stat data | 2,447,648 B | 1,942,277 B (235,132 B gzipped) |
| PoE 2 stat data | 829,458 B | 767,965 B (94,683 B gzipped) |
| Mod Pools | 1,581,073 B / 1,198,055 B | same, gzipped 185,632 B / 84,151 B |
| Loaded for one PoE 1 import | 4.0 MB text | 421 kB transferred |
| Loaded for one PoE 2 import | 2.0 MB text | 179 kB transferred |

The zip barely shrinks because it already deflated the plain files; the gains are the unpacked size, the 20% smaller
PoE 1 stat file to parse, and nothing of the other game ever read.

## Considered Options

- **Prune by a hand-kept list of stat categories.** Rejected: Mod Pools and unique lines already say which stats a
  character can carry, and they follow every patch.
- **Compress the zip harder / ship brotli.** Rejected: the zip is deflated either way; per-game loading is what stops
  the other game's data from being read.
- **Gzip the files in git.** Rejected: unreadable diffs; the build does it.

## Consequences

- `pnpm pob-stats` needs the game's Mod Pools file and item stats file; regeneration order on a new patch:
  `pnpm pob-unique-mods [poe2] --stats <dat-mcp stats file>` (matches against dat-mcp's unpruned stats, not the
  committed pruned ones), then `pnpm pob-stats [poe2] <dat-mcp stats file>`.
- A unique added to the lists later (weekly sync) can name a stat that was pruned; its filter then stays unmatched
  until the next regeneration from dat-mcp. The tests catch it for fixtures only.
- `DecompressionStream` needs Chrome 80+ / Firefox 113+; the service worker already needs more.
