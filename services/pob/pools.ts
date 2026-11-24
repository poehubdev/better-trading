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

/** The asset's entry of a trade ID (`enchant.stat_123`) on a base: [source mask, affix, level, max, ...] */
const entryOf = (base: string, id: string): number[] | undefined => {
  const [type, stat] = id.split('.') as [string, string];
  const key = poolKey(base);
  const index = key ? asset!.pools[key]![type] : undefined;
  return index === undefined ? undefined : asset!.parts[type]![index]![stat];
};

/**
 * The affix slots a trade stat number (`stat_123`) takes as a crafted mod on a base, else as an explicit one; both when
 * the asset knows neither
 */
const affixesOf = (base: string | undefined, stat: string): ('prefix' | 'suffix')[] => {
  const code = (base && (entryOf(base, `crafted.${stat}`) ?? entryOf(base, `explicit.${stat}`))?.[1]) || 3;
  return (['prefix', 'suffix'] as const).filter((_, i) => code & (1 << i));
};

/**
 * The Tiers (`[level, max]`) of a trade stat number (`stat_123`) of a modifier type on a base, or of every stat of
 * that type when `stat` is left out; empty when the asset does not have them
 */
const tiers = (base: string, type: string, stat?: string): [number, number][] => {
  const key = poolKey(base);
  const index = key ? asset!.pools[key]![type] : undefined;
  const part = index === undefined ? {} : asset!.parts[type]![index]!;
  const rows = stat === undefined ? Object.values(part) : Object.hasOwn(part, stat) ? [part[stat]!] : [];
  return rows.flatMap(row =>
    Array.from({ length: (row.length - 2) / 2 }, (_, i) => [row[2 + 2 * i]!, row[3 + 2 * i]!] as [number, number]),
  );
};

export type { ModPool, PoolsAsset };
export { affixesOf, inPool, loadPools, modPool, tiers };
