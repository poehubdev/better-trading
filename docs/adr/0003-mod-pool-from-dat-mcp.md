# The PoB import drops filters outside the item's Mod Pool, computed by dat-mcp

The PoB import turned every matched mod into a search filter, including stats that can never appear on the item's base
(a filter for an implicit from another base, a mod type the base can't roll). Such filters never match: they either
empty the results or only add noise to the weighted sum.

dat-mcp now derives each base's Mod Pool from the game files (mod spawn weights by base tags, every source: base,
influences, crafting bench, essences, Incursion, Delve, Veiled, ...) together with each Tier's item level and maximum
roll. It writes one compact file that we commit next to `public/pob-stats.ndjson` and regenerate the same way on a new
patch (ADR 0002). Each pool entry carries a source bitmask, so a later "ignore source X" choice needs no regeneration.
The pool is checked without the item level: a stat the build item is too low to roll is still possible on the item we
search for. Corruptions and Synthesis implicits have types of their own in the file but are searched as implicits.
Tiers give the fewest passives a cluster jewel base allows and the item level filter: the highest level among the Tiers
of the build item's rolls (PoB's own item level only when no roll has a Tier), and for a cluster jewel a maximum just below the next level
that unlocks more of its pool. Tiers carry only their largest roll and a stat's Tiers from different mods overlap
(essence, Incursion, hybrid), so a roll is taken to fall into the tightest Tier that reaches it; a roll above every
Tier (pure and hybrid mods summed, quality) is skipped. Normalising weights by maximum roll can build on them later.

## Considered Options

- **Keep hand-kept lists** (`JEWEL_CORRUPTION_LINES`, `JEWEL_IMPLICIT_ONLY_LINES`, `FEWEST_PASSIVES`). Rejected: they cover only the
  cases someone noticed and go stale on every patch.
- **Compute pools in the extension from raw game tables.** Rejected: the tables are far larger than the 2 MB budget and
  the work only changes once per patch.
- **Split the file per source.** Rejected: one load is simpler, and the bitmask gives the same control.

## Consequences

- A base missing from the file (new patch, not yet regenerated) imports without pruning and logs a console warning;
  a cluster jewel on it is searched for at least its passive count. A file that fails to load leaves every base so.
- Better Trading's PoB import now depends on dat-mcp's pool generator as well as its stat generator.
