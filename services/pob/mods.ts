// Ported from pob2bt (src/mods.ts): stats come in as text instead of being read from disk
import type { Mod } from './build';
import type { TradeSiteVersion } from '@/types/trade-location';

/** A mod line matched to trade stats */
interface ModMatch {
  /** Trade ID of the stat in every modifier type it exists in; option stats are `<id>|<option>` */
  ids: string[];
  /** The item's value for the stat; undefined when no minimum can be derived from it */
  value: number | undefined;
}

interface Matcher {
  string: string;
  /** Fixed value of a matcher without numbers */
  value?: number;
  /** The line reads the opposite way of the stat ("reduced" for "increased") */
  negate?: boolean;
}

interface Stat {
  better: number;
  matchers: Matcher[];
  trade: { ids: Record<string, string[]>; inverted?: boolean };
}

/** What the import knows about a unique beyond its name, from the `{ unique }` lines of pob-stats.ndjson */
interface UniqueInfo {
  unique: string;
  /** Trade stat numbers (`stat_123`) every copy has; any other explicit mod is rolled at random */
  fixed?: string[];
  /** Comes in several bases that are worth different amounts (Precursor's Emblem rings) */
  multiBase?: true;
}

// PoE 2 adds rune (augments socketed in the item) and desecrated stats
const TYPES = ['explicit', 'implicit', 'fractured', 'enchant', 'crafted', 'rune', 'desecrated'];
const NUMBER = /[+-]?\d+(?:\.\d+)?/g;

/** The stat data of one game, indexed */
interface StatIndex {
  byText: Map<string, { stats: Stat[]; matcher: Matcher }>;
  uniques: Map<string, UniqueInfo>;
  // Timeless jewel seed stats, one per conqueror; a jewel's conquerors share the "Passives ... Conquered by" line
  conquerorIds: Map<string, string[]>;
  seedTexts: Map<string, string>;
}

const indexes = new Map<TradeSiteVersion, StatIndex>();
// The selected game's index, which every matcher reads
const emptyIndex = (): StatIndex => ({
  byText: new Map(),
  uniques: new Map(),
  conquerorIds: new Map(),
  seedTexts: new Map(),
});
let { byText, uniques, conquerorIds, seedTexts } = emptyIndex();

/** Makes the matchers read the stat data of a game; throws when it is not loaded */
// ponytail: one selected game for the whole module; toExportString selects it in the synchronous part after decoding,
// so concurrent imports of both games don't mix. Pass the index around if matching ever awaits
const selectStats = (game: TradeSiteVersion) => {
  const index = indexes.get(game);
  if (!index) throw new Error(`Stat data of PoE ${game} not loaded`);
  ({ byText, uniques, conquerorIds, seedTexts } = index);
};

/**
 * Indexes a game's pob-stats.ndjson (APT's stats.ndjson format): one stat per line, or `{ stats }` for stats sharing a
 * text. Runs once per game
 */
const loadStats = (ndjson: string, game: TradeSiteVersion) => {
  if (indexes.has(game)) return;
  const index = emptyIndex();
  const { byText, uniques, conquerorIds, seedTexts } = index;
  for (const line of ndjson.split('\n')) {
    if (!line) continue;
    const entry = JSON.parse(line) as (Stat & { stats?: Stat[] }) | UniqueInfo;
    if ('unique' in entry) {
      uniques.set(entry.unique, entry);
      continue;
    }
    // ponytail: shared texts merge all their stats (APT picks one by item class); the count group accepts any
    const stats = entry.stats ?? [entry];
    for (const stat of stats) {
      // APT puts zero-width spaces before gem names
      for (const matcher of stat.matchers) {
        const text = matcher.string.replaceAll('​', '');
        const known = byText.get(text);
        byText.set(text, { stats: known && known.stats !== stats ? [...known.stats, ...stats] : stats, matcher });
      }
    }
  }

  for (const { stats, matcher } of byText.values()) {
    const id = stats[0]?.trade.ids.explicit?.[0];
    const [, conquered] = matcher.string.split('\n');
    if (!id?.startsWith('explicit.pseudo_timeless_jewel_') || !conquered) continue;
    seedTexts.set(matcher.string, conquered);
    conquerorIds.set(conquered, [...(conquerorIds.get(conquered) ?? []), id]);
  }
  indexes.set(game, index);
};

const uniqueInfo = (name: string): UniqueInfo | undefined => uniques.get(name);

/** Finds a Timeless jewel's seed in its mod lines: the stat of every conqueror and the seed they all share */
const matchTimeless = (lines: string[]): { ids: string[]; seed: number } | undefined => {
  for (let i = 0; i + 1 < lines.length; i++) {
    const seed = lines[i]!.match(/\d+/);
    const conquered = seed && seedTexts.get(`${lines[i]!.replace(seed[0], '#')}\n${lines[i + 1]}`);
    if (conquered) return { ids: conquerorIds.get(conquered)!, seed: Number(seed![0]) };
  }
  return undefined;
};

const bits = (n: number) => n.toString(2).replaceAll('0', '').length;

/** Matches a POB mod line as it reads in the stat data */
const matchText = (line: string): ModMatch | undefined => {
  const numbers = [...line.matchAll(NUMBER)];
  // Replace every number with #, then fewer: some numbers are part of the stat text ("Level 20")
  const masks = [...Array(2 ** numbers.length).keys()].sort((a, b) => bits(b) - bits(a));
  for (const mask of masks) {
    let text = '';
    let end = 0;
    const values: number[] = [];
    numbers.forEach((number, i) => {
      if (!(mask & (1 << i))) return;
      text += line.slice(end, number.index) + '#';
      end = number.index + number[0].length;
      values.push(Number(number[0]));
    });
    const key = text + line.slice(end);
    const found = byText.get(key);
    if (!found) continue;

    const idsOf = (stats: Stat[]) => stats.flatMap(stat => TYPES.flatMap(type => stat.trade.ids[type] ?? []));
    // Forbidden Flame and Flesh are only useful as a pair: the same ascendancy node on either jewel is a find
    const twin = byText.get(
      key.replace(/Forbidden (Flame|Flesh)$/, (_, name) => `Forbidden ${name === 'Flame' ? 'Flesh' : 'Flame'}`),
    );
    const paired = key.startsWith('Allocates ') && twin;
    // Sorted, so both jewels of the pair give the same ids
    const ids = [...new Set([...idsOf(found.stats), ...(paired ? idsOf(twin.stats) : [])])];
    if (paired) ids.sort();
    if (!ids.length) return undefined;
    // The trade site compares "Adds # to #" stats by their average
    let value = found.matcher.value ?? (values.length ? values.reduce((a, b) => a + b) / values.length : undefined);
    if (value !== undefined && found.matcher.negate) value = -value;
    // ponytail: only "higher is better" positive values get a minimum; inverted and negative rolls match on presence
    const scalable =
      value !== undefined && value > 0 && found.stats.every(stat => stat.better === 1 && !stat.trade.inverted);
    return { ids, value: scalable ? value : undefined };
  }
  return undefined;
};

// How POB lines read where the stat data reads otherwise. Each rewrite is tried only when the line itself fails
const REWRITES: [RegExp, string][] = [
  // The game rewrote "Players have" mods (Screams of the Desiccated shrine buffs); the stat data still has the old text
  // ponytail: drop once APT's stats.ndjson reads "You have"
  [/^You have /, 'Players have '],
  // "Grants Level 30 Aspect of the Cat Skill" is the stat "Grants Level # Aspect of the Cat". The few granted skills
  // whose stat ends in "Skill" (Anger, Hatred) match as they are, before this
  [/^(Grants Level \d+ .+) Skill$/, '$1'],
  // A PoE 2 Bonded rune stat has no "reduced" matcher ("Bonded: 20% reduced Slowing Potency of Debuffs on You"); the
  // negative value matches it on presence. ponytail: drop once dat-mcp writes the negated matcher for Bonded stats
  [/^Bonded: (\d+(?:\.\d+)?)% reduced /, 'Bonded: -$1% increased '],
  // The stat data has "increased Rarity of Items found" as a pseudo stat only; the explicit reads "to Item Rarity"
  [/^(\d+)% increased Rarity of Items found$/, '+$1% to Item Rarity'],
];

/** Matches a POB mod (one line, or two joined by \n) to trade stats, or returns undefined */
const matchMod = (line: string): ModMatch | undefined => {
  const match = matchText(line);
  if (match) return match;
  for (const [pattern, replacement] of REWRITES) {
    if (pattern.test(line)) return matchText(line.replace(pattern, replacement));
  }
  return undefined;
};

/** A mod of an item matched to trade stats; `text` holds every line of a stat that spans several */
type MatchedMod = Mod & { match: ModMatch };

/** Matches the mod lines of an item, joining the stats that span lines */
const matchedMods = function* (mods: Mod[], reportUnmatched: (line: string) => void): Generator<MatchedMod> {
  // Lines already joined to an earlier one that was not right before them
  const joined = new Set<number>();
  for (let i = 0; i < mods.length; i++) {
    if (joined.has(i)) continue;
    const mod = mods[i]!;
    const { text, implicit } = mod;
    let match = matchMod(text);
    let line = text;
    // Some stats span two lines (cluster jewel enchants) or three (Impossible Escape)
    for (let next = mods[i + 1]; !match && next?.implicit === implicit && line.split('\n').length < 3;) {
      match = matchMod((line = `${line}\n${next.text}`));
      next = mods[i + line.split('\n').length];
    }
    if (match) i += line.split('\n').length - 1;
    // POB may put another mod between a stat's two lines (Thread of Hope's "Passage")
    for (let j = i + 2; !match && mods[j]?.implicit === implicit; j++) {
      match = joined.has(j) ? undefined : matchMod((line = `${text}\n${mods[j]!.text}`));
      if (match) joined.add(j);
    }
    if (!match) reportUnmatched(text);
    else yield { ...mod, match, text: line };
  }
};

export type { MatchedMod, ModMatch, UniqueInfo };
export { loadStats, matchedMods, matchMod, matchTimeless, selectStats, uniqueInfo };
