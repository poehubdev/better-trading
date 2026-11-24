// Mod Pools (ADR 0003): what each base can carry, per modifier type, from public/pob-pools.json (dat-mcp `pools`)

/** dat-mcp's pools asset; source masks are not read yet */
interface PoolsAsset {
  bases: Record<string, string>;
  pools: Record<string, Record<string, number>>;
  /** stat -> [source mask, affix, level, max, level, max, ...]: a `level, max` pair per Tier */
  parts: Record<string, Record<string, number[]>[]>;
}

/** A base's Mod Pool: the trade stat numbers (`stat_123`) it can carry, by modifier type */
type ModPool = Record<string, Set<string>>;

let asset: PoolsAsset | undefined;
const cache = new Map<string, ModPool>();
const warned = new Set<string>();

/** Takes the parsed pools asset. Runs once */
const loadPools = (json: PoolsAsset) => {
  asset ??= json;
};

/** The asset's pool key of a base; PoB names some bases with a variant (`Two-Stone Ring (Fire/Lightning)`) */
const poolKey = (base: string) =>
  [base, base.replace(/ \(.+\)$/, '')]
    .map(name => asset && Object.hasOwn(asset.bases, name) && asset.bases[name])
    .find(Boolean);

/** The Mod Pool of a base, or undefined (with a console warning) when the asset does not have it */
const modPool = (base: string): ModPool | undefined => {
  const key = poolKey(base);
  if (!key) {
    if (!warned.has(base)) console.warn(`[pob-import] No Mod Pool for "${base}": its filters are not checked`);
    warned.add(base);
    return undefined;
  }
  let pool = cache.get(key);
  if (!pool) {
    const types = asset!.pools[key]!;
    pool = Object.fromEntries(
      Object.entries(types).map(([type, index]) => [type, new Set(Object.keys(asset!.parts[type]![index]!))]),
    );
    cache.set(key, pool);
  }
  return pool;
};

/**
 * Whether a trade ID (`implicit.stat_123`, option stats `<id>|<option>`) can appear on an item of this pool at any item
 * level. Corruptions and Synthesis implicits are searched as implicits. IDs that are not `stat_<n>` (pseudo stats) are
 * not in any pool: kept
 */
const inPool = (pool: ModPool, id: string) => {
  const [type, stat] = id.split('|')[0]!.split('.') as [string, string];
  if (!stat.startsWith('stat_')) return true;
  return (
    !!pool[type]?.has(stat) || (type === 'implicit' && !!(pool.corruption?.has(stat) || pool.synthesis?.has(stat)))
  );
};

/** The largest roll of each Tier of a trade ID (`enchant.stat_123`) on a base; empty when the asset does not have it */
const tierMaxes = (base: string, id: string): number[] => {
  const [type, stat] = id.split('.') as [string, string];
  const key = poolKey(base);
  const index = key ? asset!.pools[key]![type] : undefined;
  const tiers = index === undefined ? undefined : asset!.parts[type]![index]![stat];
  return tiers ? tiers.slice(2).filter((_, i) => i % 2) : [];
};

export type { ModPool, PoolsAsset };
export { inPool, loadPools, modPool, tierMaxes };
