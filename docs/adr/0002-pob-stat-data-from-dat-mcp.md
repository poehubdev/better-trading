# PoB stat data comes from dat-mcp, unique data is kept by hand

The PoB import needs stat matchers and trade ids for every mod text, plus per-unique facts: which stats every copy has
(`fixed`) and which names cover several bases (`multiBase`). Both used to be downloaded from Awakened PoE Trade (APT) at
a pinned commit. APT's generator is not public, so the data only moved when someone bumped the pin, and every build and
test run needed the network.

dat-mcp now generates APT's `stats.ndjson` format from the game files (99.22% parity with APT on the fields the import
reads, and the import's tests pass on it). We commit `public/pob-stats.ndjson`, regenerated from dat-mcp's output on a
new patch by `pnpm pob-stats`.

The unique lines stay a hand-kept list (`scripts/pob-uniques.ndjson`, frozen from APT 2498730). The game files have no
link from a unique to its mods, and APT's `fixed` lists are hand-picked rather than "what every copy has" (Aul's
Uprising leaves out its `+# to maximum Life`), so no generator reproduces them. Trade stat numbers are hashes of the
game's stat ids and do not change between patches, so the list does not need regenerating.

## Considered Options

- **Keep downloading from APT.** Rejected: tied to someone else's release cadence, and builds need the network.
- **Derive unique lines from Path of Building's `Data/Uniques`** (explicit lines without a `{variant:}` tag). Rejected:
  matched APT on 6 of 54 uniques; PoB models random mods and legacy versions both as variants.
- **Download dat-mcp's output at build time.** Rejected: dat-mcp publishes nothing; a committed file is reviewable and
  works offline.

## Consequences

- A new patch's stats reach the import only when someone regenerates and commits the file.
- New uniques with random mods or several bases have to be added to `scripts/pob-uniques.ndjson` by hand.
