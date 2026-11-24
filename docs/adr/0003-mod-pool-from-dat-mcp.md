# The PoB import drops filters outside the item's Mod Pool, computed by dat-mcp

The PoB import turned every matched mod into a search filter, including stats that can never appear on the item's base
(a filter for an implicit from another base, a mod type the base can't roll). Such filters never match: they either
empty the results or only add noise to the weighted sum.

dat-mcp now derives each base's Mod Pool from the game files (mod spawn weights by base tags, every source: base,
influences, crafting bench, essences, Incursion, Delve, Veiled, ...) together with each Tier's item level and maximum
roll. It writes one compact file that we commit next to `public/pob-stats.ndjson` and regenerate the same way on a new
patch (ADR 0002). Each pool entry carries a source bitmask, so a later "ignore source X" choice needs no regeneration.
The pool is checked without the item level: a stat the build item is too low to roll is still possible on the item we
search for. Tiers are used only for the item level filter and for normalising weights by maximum roll.

## Considered Options

- **Keep hand-kept lists** (`JEWEL_CORRUPTION_LINES`, `JEWEL_IMPLICIT_ONLY_LINES`, ...). Rejected: they cover only the
  cases someone noticed and go stale on every patch.
- **Compute pools in the extension from raw game tables.** Rejected: the tables are far larger than the 2 MB budget and
  the work only changes once per patch.
- **Split the file per source.** Rejected: one load is simpler, and the bitmask gives the same control.

## Consequences

- A base missing from the file (new patch, not yet regenerated) imports as before, without pruning and with weight 1.
- Better Trading's PoB import now depends on dat-mcp's pool generator as well as its stat generator.
