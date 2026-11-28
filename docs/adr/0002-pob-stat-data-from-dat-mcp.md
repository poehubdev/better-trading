# PoB stat data comes from dat-mcp, unique data follows APT and Exiled Exchange 2

The PoB import needs stat matchers and trade ids for every mod text, plus per-unique facts: which stats every copy has
(`fixed`) and which names cover several bases (`multiBase`). Both used to be downloaded from Awakened PoE Trade (APT) at
a pinned commit. APT's generator is not public, so the data only moved when someone bumped the pin, and every build and
test run needed the network.

dat-mcp now generates the stat lines from the game files, in Awakened PoE Trade's `stats.ndjson` format, for both games:

- **PoE 1** matches APT on 99.22% of the fields the import reads (and the import's tests pass on it).
- **PoE 2** has no APT file. dat-mcp ports Exiled Exchange 2's (EE2) public generator, whose file is built differently
  from APT's (one line per trade text with its ` (Local)` suffix cut, no `resolve` groups), and matches 99.14% of EE2's
  lines (99.11% on Character Stats). It also carries PoE 2's `rune` and `desecrated` trade groups through as their own
  mod types.

We commit `public/pob-stats.ndjson` (PoE 1) and `public/pob-stats-poe2.ndjson` (PoE 2), regenerated from dat-mcp's
output on a new patch by `pnpm pob-stats [poe2]`. The build gzips them and the background loads only the imported
game's (ADR 0004).

The unique lines are committed lists (`scripts/pob-uniques.ndjson`, `scripts/pob-uniques-poe2.ndjson`) that follow the
game's reference: APT for PoE 1, EE2's `items.ndjson` for PoE 2. The game files have no link from a unique to its mods,
and the references' `fixed` lists are hand-picked rather than "what every copy has" (Aul's Uprising leaves out its
`+# to maximum Life`), so no generator reproduces them. A weekly workflow three-way merges the reference's changes since
the last synced commit into each game's list and opens a PR per game that names each change; uniques we edited by hand
keep our version and are flagged. Trade stat numbers are hashes of the game's stat ids and do not change between
patches, so the lists only move when a unique does. Path of Building's (PoB) and PoB 2's unique definitions generate a
second, wider `fixed` list per game (`scripts/pob-unique-mods[-poe2].ndjson`) that the reference's lines overlay.

## Considered Options

- **Keep downloading from APT.** Rejected: tied to someone else's release cadence, and builds need the network.
- **Derive unique lines from Path of Building's `Data/Uniques`** (explicit lines without a `{variant:}` tag) as the only
  source. Rejected: matched APT on 6 of 54 uniques; PoB models random mods and legacy versions both as variants. Kept as
  the base layer that the reference's hand-picked lines overlay.
- **Download dat-mcp's output at build time.** Rejected: dat-mcp publishes nothing; a committed file is reviewable and
  works offline.
- **One generator for both games (APT's rules for PoE 2).** Rejected: APT has no PoE 2 file to reproduce, and EE2's
  public generator is the nearest reference there is.

## Consequences

- A new patch's stats reach the import only when someone regenerates and commits the game's file.
- New uniques with random mods or several bases arrive only once APT (PoE 1) or EE2 (PoE 2) adds them; until then, or if
  the reference stops updating, add them to the game's `scripts/pob-uniques*.ndjson` by hand.
- The workflow needs "Allow GitHub Actions to create and approve pull requests" in the repo settings.
