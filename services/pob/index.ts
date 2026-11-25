// Ported from pob2bt (src/index.ts): Build Code to a BT Export String. Skill Gem Trades (`--gems`) are left out
import { decodeBuild } from './build';
import { matchedMods, matchTimeless, uniqueInfo } from './mods';
import { affixesOf, inPool, modPool, tiers } from './pools';
import { Base64 } from 'js-base64';
import type { BuildItem, Influence, Item, Mod } from './build';
import type { MatchedMod } from './mods';
import type { ModPool } from './pools';

/** How far below the build item's roll a filter's minimum sits: the roll itself, a percentage of it, or no minimum */
type RollFloor = { kind: 'exact' } | { kind: 'percent'; percent: number } | { kind: 'none' };

interface ImportOptions {
  /** A weight group on and the per-mod groups it covers off (default), or the per-mod groups on and no weight group */
  weightedSum?: boolean;
  /** The minimum of modifier rolls, pseudo totals and the weighted sum (default 80%); enchants stay exact */
  rollFloor?: RollFloor;
}

interface Result {
  exportString: string;
  /** Mod lines that could not be matched to a trade stat */
  unmatched: string[];
}

type Report = (line: string) => void;
type StatValue = { min: number } | { max: number } | undefined;
interface StatFilter {
  id: string;
  value?: object;
  disabled?: boolean;
}
interface StatGroup {
  type: 'and' | 'count' | 'weight';
  value?: { min: number };
  disabled?: boolean;
  filters: StatFilter[];
}

// BT's PoE 1 ascendancy folder icons
const ICONS = new Set([
  'slayer',
  'gladiator',
  'champion',
  'assassin',
  'saboteur',
  'trickster',
  'juggernaut',
  'berserker',
  'chieftain',
  'necromancer',
  'elementalist',
  'occultist',
  'deadeye',
  'raider',
  'pathfinder',
  'guardian',
  'hierophant',
  'inquisitor',
  'ascendant',
  'warden',
  'reliquarian',
  'luminary',
]);

const PAIRED_UNIQUES = new Set(['Forbidden Flame', 'Forbidden Flesh']);
// Agnerod staves get their Vinktar Square mods by item level from these brackets (poewiki: The Vinktar Square)
const AGNEROD_LEVELS = [82, 80, 78, 75];

/** Shaper, Elder and Conqueror influences are pseudo stats; the Eldritch ones are misc filters */
const INFLUENCE_STATS: Partial<Record<Influence, string>> = {
  Shaper: 'pseudo.pseudo_has_shaper_influence',
  Elder: 'pseudo.pseudo_has_elder_influence',
  Crusader: 'pseudo.pseudo_has_crusader_influence',
  Redeemer: 'pseudo.pseudo_has_redeemer_influence',
  Hunter: 'pseudo.pseudo_has_hunter_influence',
  Warlord: 'pseudo.pseudo_has_warlord_influence',
};

/** Stats folded into pseudo totals, by trade stat number: the `pseudo.pseudo_total_*` totals each adds to */
// ponytail: the site's total life also counts Strength / 2; left out so the minimum never exceeds the item's own total
const PSEUDO_TOTALS: Record<string, string[]> = {
  stat_3299347043: ['life'],
  stat_3372524247: ['fire_resistance'],
  stat_4220027924: ['cold_resistance'],
  stat_1671376347: ['lightning_resistance'],
  stat_2923486259: ['chaos_resistance'],
  stat_2901986750: ['fire_resistance', 'cold_resistance', 'lightning_resistance'],
  stat_2915988346: ['fire_resistance', 'cold_resistance'],
  stat_3441501978: ['fire_resistance', 'lightning_resistance'],
  stat_4277795662: ['cold_resistance', 'lightning_resistance'],
  stat_378817135: ['fire_resistance', 'chaos_resistance'],
  stat_3393628375: ['cold_resistance', 'chaos_resistance'],
  stat_3465022881: ['lightning_resistance', 'chaos_resistance'],
  stat_4080418644: ['strength'],
  stat_3261801346: ['dexterity'],
  stat_328541901: ['intelligence'],
  stat_1379411836: ['strength', 'dexterity', 'intelligence'],
  stat_538848803: ['strength', 'dexterity'],
  stat_1535626285: ['strength', 'intelligence'],
  stat_2300185227: ['dexterity', 'intelligence'],
};

/** The broadest pseudo totals, which the weight group sums: each with the stats whose largest roll on the base sets its weight */
const WEIGHED_TOTALS: Record<string, string[]> = {
  elemental_resistance: ['stat_3372524247', 'stat_4220027924', 'stat_1671376347'],
  chaos_resistance: ['stat_2923486259'],
  life: ['stat_3299347043'],
  strength: ['stat_4080418644'],
  dexterity: ['stat_3261801346'],
  intelligence: ['stat_328541901'],
};
/** The totals suggested, disabled, when the base can carry them and the build item lacks them */
const SUGGESTED_TOTALS = ['elemental_resistance', 'chaos_resistance', 'life'];
const ELEMENTS = ['fire_resistance', 'cold_resistance', 'lightning_resistance'];

const BASE_JEWELS = new Set(['Cobalt Jewel', 'Crimson Jewel', 'Viridian Jewel', 'Prismatic Jewel']);

const WEAPON_CATEGORIES: Record<string, string> = {
  Shield: 'armour.shield',
  Quiver: 'armour.quiver',
  Bow: 'weapon.bow',
  Staff: 'weapon.staff',
  'Two Handed Sword': 'weapon.twosword',
  'Two Handed Axe': 'weapon.twoaxe',
  'Two Handed Mace': 'weapon.twomace',
  'Fishing Rod': 'weapon.rod',
  'One Handed Sword': 'weapon.onesword',
  'One Handed Axe': 'weapon.oneaxe',
  'One Handed Mace': 'weapon.onemace',
  Sceptre: 'weapon.sceptre',
  Wand: 'weapon.wand',
  Dagger: 'weapon.dagger',
  Claw: 'weapon.claw',
};

const SLOT_CATEGORIES: Record<string, string> = {
  'Body Armour': 'armour.chest',
  Helmet: 'armour.helmet',
  Gloves: 'armour.gloves',
  Boots: 'armour.boots',
  Amulet: 'accessory.amulet',
  Belt: 'accessory.belt',
};

/** The minimum a Roll Floor sets for a roll (or a sum of rolls); undefined for no minimum */
type Floor = (value: number | undefined) => { min: number } | undefined;

interface Floors {
  roll: Floor;
  sum: Floor;
}

const floorsOf = (rollFloor: RollFloor): Floors => {
  const factor = rollFloor.kind === 'exact' ? 1 : rollFloor.kind === 'percent' ? rollFloor.percent / 100 : undefined;
  if (factor === undefined) return { roll: () => undefined, sum: () => undefined };
  return {
    // Trade stats take whole numbers: round down, but never to 0 for a stat that rolled 1 or more
    roll: value =>
      value === undefined ? undefined : { min: Math.max(Math.floor(value * factor), Math.min(1, Math.floor(value))) },
    // A weight group sums fractions, so its minimum stays fractional
    sum: value => (value === undefined ? undefined : { min: Math.round(value * factor * 100) / 100 }),
  };
};

/** 100 / the largest roll of any of these stats (`stat_123`) on any of the bases, so a full roll weighs 100; 1 when unknown */
const weightOf = (bases: (string | undefined)[], stats: string[]) => {
  const rolls = bases.flatMap(base =>
    (base ? stats.flatMap(stat => tiers(base, 'explicit', stat)) : []).map(([, max]) => max),
  );
  const max = Math.max(0, ...rolls);
  return max > 0 ? Math.round(10000 / max) / 100 : 1;
};

/** The trade stat numbers (`stat_123`) of trade IDs */
const statsOf = (ids: string[]) => [...new Set(ids.map(id => id.split('.')[1]!))];

/** Keeps the trade stat IDs of the given modifier types (`enchant` in `enchant.stat_123`), or all if there are none */
const onlyTypes = (ids: string[], types: string[]) => {
  const kept = ids.filter(id => types.includes(id.split('.')[0]!));
  return kept.length ? kept : ids;
};

/** Drops the IDs the base can never carry (ADR 0003); `only` limits the check to those modifier types */
const possible = (ids: string[], pool: ModPool | undefined, only?: string[]) =>
  pool ? ids.filter(id => (only && !only.includes(id.split('.')[0]!)) || inPool(pool, id)) : ids;

/** Option stats are `<id>|<option>`; the rest take the minimum if there is one */
const statFilter = (id: string, value: StatValue): StatFilter => {
  const [statId, option] = id.split('|');
  if (option) return { id: statId!, value: { option: Number(option) } };
  return value ? { id, value } : { id };
};

/**
 * The limit on the "Adds # Passive Skills" enchant (`id`) of a cluster jewel of this base: a jewel with the fewest
 * passives its base allows (its Mod Pool's lowest Tier) is wanted at most that, any more at least that
 */
const passiveCount = (text: string, base: string, id: string): StatValue => {
  const count = Number(/^Adds (\d+) Passive Skills$/.exec(text)?.[1]);
  if (!count) return undefined;
  const fewest = Math.min(
    ...tiers(base, 'enchant', id.split('.')[1])
      .map(([, max]) => max)
      .filter(Boolean),
  );
  return count <= fewest && Number.isFinite(fewest) ? { max: count } : { min: count };
};

/**
 * A unique's `count` group per matched mod, all on. Its mod is of one known type, so it is a single stat; the base's Mod
 * Pool checks only its implicits and enchants, since a unique's explicit mods are its own
 */
const statGroups = (matched: MatchedMod[], pool: ModPool | undefined, floors: Floors): StatGroup[] =>
  matched.flatMap(({ match, implicit }) => {
    const value = floors.roll(match.value);
    const ids = possible(onlyTypes(match.ids, [implicit ? 'implicit' : 'explicit']), pool, ['implicit', 'enchant']);
    return ids.length
      ? [{ type: 'count' as const, value: { min: 1 }, disabled: false, filters: ids.map(id => statFilter(id, value)) }]
      : [];
  });

/**
 * Puts every stat that is required on its own into one `and` group at the top: an `and` group's filters and the
 * `count` groups of a single filter (their minimum of 1 means that filter). Alternatives stay in their `count` group.
 */
const andFirst = (groups: StatGroup[]): StatGroup[] => {
  const single = (group: StatGroup) => group.type === 'count' && group.filters.length === 1 && group.value?.min === 1;
  const filters = groups.flatMap(group =>
    group.type === 'and'
      ? group.filters
      : single(group)
        ? group.filters.map(filter => (group.disabled ? { ...filter, disabled: true } : filter))
        : [],
  );
  const rest = groups.filter(group => group.type !== 'and' && !single(group));
  return [...(filters.length ? [{ type: 'and' as const, filters }] : []), ...rest];
};

/**
 * Rare, magic and flask stats: an `and` group of pseudo totals and cluster enchants (on), suggestions and influences
 * (off), `count` groups for the other mods, and a `weight` group of the explicit ones and the broadest totals. With the
 * weighted sum on, the `count` groups the weight group covers are off; with it off, there is no weight group. A crafted
 * mod is wanted in any rolled or crafted form, or as an empty affix slot to craft it, and stays out of the totals and the
 * weighted sum; a fractured one is wanted as an explicit or fractured mod
 */
const rareStatGroups = (
  mods: Mod[],
  influences: StatFilter[],
  reportUnmatched: Report,
  base: string | undefined,
  weightedSum: boolean,
  floors: Floors,
) => {
  const jewel = !!base?.endsWith('Jewel');
  const cluster = !!base?.endsWith('Cluster Jewel');
  const pool = base ? modPool(base) : undefined;
  const totals = new Map<string, number>();
  const groups: StatGroup[] = [];
  // A cluster jewel's enchants all have to be there: they share the and group of the totals
  const enchants: StatFilter[] = [];
  // Keyed by id: two lines of one stat must not weigh it twice
  const weighted = new Map<string, StatFilter>();
  let weightSum = 0;
  for (const { match, implicit, enchant: tagged, crafted, fractured, text } of matchedMods(mods, reportUnmatched)) {
    // An enchant is never rolled: the exact value is what the jewel is worth
    const enchant = (cluster && implicit) || tagged;
    // A jewel has no crafted mods: its implicit block holds enchants (cluster) or a corrupted implicit
    const typed =
      jewel || enchant || crafted || fractured
        ? onlyTypes(
            match.ids,
            enchant
              ? ['enchant']
              : implicit
                ? ['implicit']
                : crafted
                  ? ['explicit', 'fractured', 'crafted']
                  : ['explicit', 'fractured'],
          )
        : match.ids;
    const ids = possible(typed, pool);
    if (!ids.length) continue;
    const value = match.value;
    // ponytail: negative rolls have no value and stay single-mod groups, so a total may overshoot such an item
    const stat = ids[0]!.split('|')[0]!.split('.')[1]!;
    const folded = !enchant && !crafted && value !== undefined && PSEUDO_TOTALS[stat];
    if (folded) {
      for (const total of folded) totals.set(total, (totals.get(total) ?? 0) + value);
      continue;
    }
    const min =
      (cluster && passiveCount(text, base!, ids[0]!)) ||
      (enchant ? (value === undefined ? undefined : { min: value }) : floors.roll(value));
    if (enchant) {
      // A flask's enchant is a bonus, not a requirement: switched off
      enchants.push(...ids.map(id => ({ ...statFilter(id, min), ...(base?.endsWith('Flask') && { disabled: true }) })));
      continue;
    }
    // ponytail: each crafted mod asks for one empty slot, so one slot also stands in for several crafts (multimod);
    // count the crafts per affix if that lets bad bases through
    const emptySlots = crafted
      ? affixesOf(base, stat).map(affix => ({ id: `pseudo.pseudo_number_of_empty_${affix}_mods`, value: { min: 1 } }))
      : [];
    const weighed = weightedSum && !implicit && !crafted && value !== undefined && !ids.some(id => id.includes('|'));
    groups.push({
      type: 'count',
      value: { min: 1 },
      disabled: weighed,
      filters: [...ids.map(id => statFilter(id, min)), ...emptySlots],
    });
    if (weighed) {
      const weight = weightOf([base], statsOf(ids));
      for (const id of ids) weighted.set(id, { id, value: { weight } });
      weightSum += weight * value;
    }
  }
  const elemental = ELEMENTS.reduce((sum, element) => sum + (totals.get(element) ?? 0), 0);
  const broad = new Map([...totals].filter(([total]) => !ELEMENTS.includes(total)));
  if (elemental) broad.set('elemental_resistance', elemental);
  const suggested = SUGGESTED_TOTALS.filter(
    total => pool && !broad.has(total) && WEIGHED_TOTALS[total]!.some(stat => pool.explicit?.has(stat)),
  );
  if (weightedSum) {
    // A suggestion is weighed but adds nothing to the minimum: the build item does not have it. The site's total life
    // counts Strength / 2, so the build item's does too here, or Strength would score twice on the items found
    const strength = (broad.get('strength') ?? 0) / 2;
    for (const total of [...broad.keys(), ...suggested]) {
      const weight = weightOf([base], WEIGHED_TOTALS[total]!);
      weighted.set(`pseudo.pseudo_total_${total}`, { id: `pseudo.pseudo_total_${total}`, value: { weight } });
      weightSum += weight * ((broad.get(total) ?? 0) + (total === 'life' ? strength : 0));
    }
  }
  const and = [
    ...[...totals].map(([total, sum]) => statFilter(`pseudo.pseudo_total_${total}`, floors.roll(sum))),
    // The per-element totals are on; one switch swaps them for their sum
    ...(elemental
      ? [{ ...statFilter('pseudo.pseudo_total_elemental_resistance', floors.roll(elemental)), disabled: true }]
      : []),
    ...suggested.map(total => ({ id: `pseudo.pseudo_total_${total}`, disabled: true })),
    ...enchants,
    ...influences,
  ];
  return andFirst([
    ...(and.length ? [{ type: 'and' as const, filters: and }] : []),
    ...groups,
    ...(weightSum > 0
      ? [{ type: 'weight' as const, value: floors.sum(weightSum), filters: [...weighted.values()] }]
      : []),
  ]);
};

/**
 * The item level a non-unique needs for its rolls: the highest level among the Tiers they fall into (bench Tiers for
 * crafted mods). A cluster jewel is also wanted below the next level that unlocks more of its Mod Pool, which leaves
 * fewer competing mods. Undefined when no roll has a Tier (no mods, base missing from the Mod Pools)
 */
const itemLevel = (mods: Mod[], base: string | undefined) => {
  if (!base) return undefined;
  const cluster = base.endsWith('Cluster Jewel');
  let min = 0;
  for (const { match, implicit, enchant, crafted } of matchedMods(mods, () => {})) {
    const types =
      enchant || (cluster && implicit)
        ? ['enchant']
        : implicit
          ? ['implicit', 'corruption', 'synthesis']
          : crafted
            ? ['crafted']
            : ['explicit'];
    const stats = new Set(match.ids.map(id => id.split('|')[0]!.split('.')[1]!));
    // ponytail: Tiers only know their largest roll, and a stat's Tiers from different mods overlap (essence, Incursion,
    // hybrid): a roll falls into the tightest Tier that reaches it. A roll above every Tier (a pure and a hybrid mod
    // summed into one line, quality) says nothing: skipped, so the minimum never asks for more than the rolls need
    const found = types
      .flatMap(type => [...stats].flatMap(stat => tiers(base, type, stat)))
      .sort(([levelA, maxA], [levelB, maxB]) => maxA - maxB || levelA - levelB);
    const tier = found.find(([, max]) => max >= (match.value ?? -Infinity));
    if (tier) min = Math.max(min, tier[0]);
  }
  if (!min) return undefined;
  const unlocks = cluster ? tiers(base, 'explicit').filter(([level]) => level > min) : [];
  return unlocks.length ? { min, max: Math.min(...unlocks.map(([level]) => level)) - 1 } : { min };
};

/** Disabled Filters for what POB knows about an item beyond its mods */
const propertyFilters = (item: Item) => {
  const misc: Record<string, unknown> = {};
  // Without Tiers to go by, PoB's item level is the best guess (a crafting base, a base new to the Mod Pools)
  const ilvl = itemLevel(item.mods, item.base) ?? (item.itemLevel && { min: item.itemLevel });
  if (ilvl) misc.ilvl = ilvl;
  if (item.corrupted) misc.corrupted = { option: 'true' };
  if (item.influences.includes('Searing Exarch')) misc.searing_item = { option: 'true' };
  if (item.influences.includes('Eater of Worlds')) misc.tangled_item = { option: 'true' };

  const socket: Record<string, unknown> = {};
  // ponytail: abyss sockets are left out, so the count never asks for more than the site may count
  const groups = (item.sockets ?? '')
    .replaceAll('A', '')
    .split(' ')
    .map(group => group.split('-').filter(Boolean).length);
  const sockets = groups.reduce((sum, size) => sum + size, 0);
  const links = Math.max(...groups);
  if (sockets) socket.sockets = { min: sockets };
  if (links > 1) socket.links = { min: links };

  const armour: Record<string, unknown> = {};
  if (item.armour) armour.ar = { min: item.armour };
  if (item.evasion) armour.ev = { min: item.evasion };
  if (item.energyShield) armour.es = { min: item.energyShield };

  return Object.fromEntries(
    Object.entries({ misc_filters: misc, socket_filters: socket, armour_filters: armour })
      .filter(([, filters]) => Object.keys(filters).length)
      .map(([group, filters]) => [group, { disabled: true, filters }]),
  );
};

/** Port of POB's TradeHelpers.getTradeCategory */
const tradeCategory = (slot: string, type: string | undefined): string | undefined => {
  if (/^Weapon \d/.test(slot) && !slot.includes('Abyssal')) {
    if (!type) return 'weapon.one';
    const exact = WEAPON_CATEGORIES[type];
    if (exact) return exact;
    if (type.includes('Two Handed')) return 'weapon.twomelee';
    if (type.includes('One Handed')) return 'weapon.one';
    return 'weapon';
  }
  if (slot.startsWith('Ring')) return 'accessory.ring';
  if (slot.includes('Abyssal')) return 'jewel.abyss';
  if (slot.includes('Jewel')) return 'jewel';
  if (slot.includes('Flask')) return 'flask';
  return SLOT_CATEGORIES[slot];
};

const searchQuery = ({ slot, item }: BuildItem, reportUnmatched: Report, weightedSum: boolean, floors: Floors) => {
  const query: Record<string, unknown> = { status: { option: 'securable' } };
  if (item.rarity === 'UNIQUE' || item.rarity === 'RELIC') {
    const name = item.name.replace(/^Foulborn /, '');
    // Forbidden Flame and Flesh are searched by their node alone: a find on either jewel of the pair counts
    if (!PAIRED_UNIQUES.has(name)) query.name = name;
    const info = uniqueInfo(name);
    if (info?.multiBase && item.base) query.type = item.base;
    const misc: Record<string, unknown> = {};
    if (item.name !== name) misc.mutated = { option: 'true' };
    const agnerod = name.startsWith('Agnerod') && AGNEROD_LEVELS.find(level => (item.itemLevel ?? 0) >= level);
    if (agnerod) misc.ilvl = { min: agnerod };
    if (Object.keys(misc).length) query.filters = { misc_filters: { filters: misc } };
    const timeless = matchTimeless(item.mods.map(mod => mod.text));
    // A unique is identified by its name, plus the mods that set it apart: Mutated Mods, the mods it rolls at random
    // (those APT does not list as fixed: Skin of the Lords keystones, Forbidden Shako supports), and every mod of a
    // unique jewel, as even a fixed one may roll what sets the price (Voices sockets). A Timeless one goes by its seed
    const jewel = !!item.base?.endsWith('Jewel');
    const fixed = info?.fixed && new Set(info.fixed);
    // A bench craft is the owner's addition, not part of the unique. Lines are matched joined, as a stat may span several
    const candidate = (mod: Mod) => mod.mutated || (!timeless && !mod.crafted && (jewel || (!!fixed && !mod.implicit)));
    // ponytail: an unmatched line of a non-jewel goes unreported, since a fixed line without a trade stat (Berek's
    // Respite) can't be told from a random one; carry PoB's unmatched lines in the unique lines if that matters
    const matched = [
      ...matchedMods(item.mods, text => {
        if (item.mods.some(mod => mod.text === text && (mod.mutated || (jewel && !timeless)))) reportUnmatched(text);
      }),
    ];
    const identity = matched.filter(
      mod => candidate(mod) && (mod.mutated || jewel || !mod.match.ids.some(id => fixed?.has(id.split('.')[1]!))),
    );
    const pool = item.base ? modPool(item.base) : undefined;
    const stats = statGroups(identity, pool, floors);
    // A flask's enchant is not part of its identity but makes a find worth more: the exact value, switched off
    const enchants = slot.startsWith('Flask')
      ? [
          ...matchedMods(
            item.mods.filter(mod => mod.enchant),
            reportUnmatched,
          ),
        ].flatMap(({ match }) =>
          possible(onlyTypes(match.ids, ['enchant']), pool).map(id => ({
            ...statFilter(id, match.value === undefined ? undefined : { min: match.value }),
            disabled: true,
          })),
        )
      : [];
    if (enchants.length) stats.push({ type: 'and', filters: enchants });
    // Any conqueror of the jewel may carry the seed, so the player switches off those they don't want
    if (timeless) {
      const value = { min: timeless.seed, max: timeless.seed };
      stats.push({ type: 'count', value: { min: 1 }, filters: timeless.ids.map(id => ({ id, value })) });
    }
    if (stats.length) query.stats = andFirst(stats);
  } else {
    if (item.base) query.type = item.base;
    const filters: Record<string, unknown> = {};
    const category = tradeCategory(slot, item.type);
    if (category) filters.type_filters = { filters: { category: { option: category } } };
    Object.assign(filters, propertyFilters(item));
    if (Object.keys(filters).length) query.filters = filters;
    const influences = item.influences.flatMap(influence => {
      const id = INFLUENCE_STATS[influence];
      return id ? [{ id, disabled: true }] : [];
    });
    const stats = rareStatGroups(item.mods, influences, reportUnmatched, item.base, weightedSum, floors);
    if (stats.length) query.stats = stats;
  }
  return query;
};

/** A base jewel mod as an explicit, fractured or corrupted implicit, as far as the jewel's Mod Pool allows each */
const aggregateIds = (ids: string[], pool: ModPool | undefined) =>
  pool
    ? possible(
        ids.filter(id => /^(explicit|fractured|implicit)\./.test(id)),
        pool,
      )
    : ids.filter(id => /^(explicit|fractured)\./.test(id));

/** The Aggregate Jewel: one Trade for any base jewel with enough of the mods found on the build's base jewels */
const aggregateJewel = (items: BuildItem[], weightedSum: boolean, floors: Floors) => {
  const union = new Set<string>();
  const weighted = new Map<string, StatFilter>();
  let most = 0;
  let weightSum = 0;
  for (const { slot, item } of items) {
    if (
      slot !== 'Jewel' ||
      !item.base ||
      !BASE_JEWELS.has(item.base) ||
      item.rarity === 'UNIQUE' ||
      item.rarity === 'RELIC'
    )
      continue;
    // Unmatched lines are already reported by the jewel's own Trade
    const mods = [...matchedMods(item.mods, () => {})];
    const pool = modPool(item.base);
    const matches = mods.map(({ match }) => aggregateIds(match.ids, pool)).filter(ids => ids.length);
    for (const ids of matches) ids.forEach(id => union.add(id));
    // The weight group is worth the most valuable jewel, counting only mods that roll (as on a rare)
    let sum = 0;
    for (const { match, implicit } of mods) {
      const ids = match.ids.filter(id => /^(explicit|fractured)\./.test(id) && !id.includes('|'));
      if (implicit || match.value === undefined || !ids.length) continue;
      // One weight per stat for every jewel: the largest roll on any base jewel
      const weight = weightOf([...BASE_JEWELS], statsOf(ids));
      for (const id of ids) weighted.set(id, { id, value: { weight } });
      sum += weight * match.value;
    }
    weightSum = Math.max(weightSum, sum);
    most = Math.max(most, new Set(matches.map(ids => ids.join())).size);
  }
  if (!union.size) return [];
  const query = {
    status: { option: 'securable' },
    filters: { type_filters: { filters: { category: { option: 'jewel.base' } } } },
    stats: [
      {
        type: 'count',
        value: { min: Math.min(Math.max(most, 2), 4) },
        filters: [...union].map(id => statFilter(id, undefined)),
      },
      ...(weightedSum && weighted.size
        ? [{ type: 'weight', value: floors.sum(weightSum), filters: [...weighted.values()] }]
        : []),
    ],
  };
  return [{ tit: 'Jewels — combined', query }];
};

/** "Slot — Name"; a Unique is "Unique Ring — Name"; a Cluster Jewel is "Large Cluster — Name (Trap And Mine Damage)" */
const titleOf = ({ slot, item }: BuildItem) => {
  // The search finds either jewel of the pair, so the title names both
  const name = PAIRED_UNIQUES.has(item.name) ? 'Forbidden Flame / Flesh' : item.name;
  if (item.rarity === 'UNIQUE' || item.rarity === 'RELIC') return `Unique ${slot.replace(/ \d+$/, '')} — ${name}`;
  if (!item.base?.endsWith('Cluster Jewel')) return `${slot} — ${name}`;
  const skill = item.clusterSkill
    ?.replace(/^affliction_/, '')
    .split('_')
    // Some POB ids end in an underscore ("affliction_attack_damage_while_dual_wielding_")
    .filter(Boolean)
    .map(word => word[0]!.toUpperCase() + word.slice(1))
    .join(' ');
  return `${item.base.replace(/ Jewel$/, '')} — ${name}${skill ? ` (${skill})` : ''}`;
};

/** Keeps the first of the Trades that search the same thing: equal queries, ignoring rolls (`min` / `max`) on non-uniques */
const dedupe = (trades: { tit: string; query: Record<string, unknown> }[]) => {
  const seen = new Set<string>();
  return trades.filter(({ query }) => {
    const key = JSON.stringify(query, (k, v) => (!query.name && (k === 'min' || k === 'max') ? undefined : v));
    return !seen.has(key) && !!seen.add(key);
  });
};

/** The trade-site location slug: BT joins it to `/trade/search/<league>/`, and the site reads `?q=` as a query */
const trade = (tit: string, query: object) => ({
  tit,
  loc: `1:search:?q=${encodeURIComponent(JSON.stringify({ query }))}`,
});

/** Build Code to a BT Export String (format 3) holding one Folder; the stats must be loaded first */
const toExportString = async (
  buildCode: string,
  { weightedSum = true, rollFloor = { kind: 'percent', percent: 80 } }: ImportOptions = {},
): Promise<Result> => {
  const floors = floorsOf(rollFloor);
  const build = await decodeBuild(buildCode);
  const name = build.ascendancy ?? build.className;
  const icon = name.toLowerCase();

  const unmatched: string[] = [];
  const folder = {
    icn: ICONS.has(icon) ? icon : null,
    tit: build.mainSkill ? `${build.mainSkill} ${name}` : name,
    ver: '1',
    trs: dedupe([
      ...build.items.map(buildItem => {
        const tit = titleOf(buildItem);
        return { tit, query: searchQuery(buildItem, line => unmatched.push(`${tit}: ${line}`), weightedSum, floors) };
      }),
      ...aggregateJewel(build.items, weightedSum, floors),
    ]).map(({ tit, query }) => trade(tit, query)),
  };
  return { exportString: `3:${Base64.encode(JSON.stringify(folder))}`, unmatched };
};

export type { ImportOptions, RollFloor };
export { toExportString };
