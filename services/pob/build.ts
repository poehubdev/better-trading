// Ported from pob2bt (src/build.ts): inflate runs on DecompressionStream, so it works in a service worker
import poe2Bases from './bases-poe2.json';
import bases from './bases.json';
import { XMLParser } from 'fast-xml-parser';
import { Base64 } from 'js-base64';
import type { TradeSiteVersion } from '@/types/trade-location';

/** Relics are POB's foil uniques */
type Rarity = 'NORMAL' | 'MAGIC' | 'RARE' | 'UNIQUE' | 'RELIC';

const INFLUENCES = [
  'Shaper',
  'Elder',
  'Crusader',
  'Redeemer',
  'Hunter',
  'Warlord',
  'Searing Exarch',
  'Eater of Worlds',
] as const;
type Influence = (typeof INFLUENCES)[number];

interface Mod {
  text: string;
  /** From the implicit block, which also holds enchants */
  implicit: boolean;
  /** An implicit tagged {crafted} (POB) or {enchant} (POB 2, not a rune): that is how POB lists an item's enchants */
  enchant: boolean;
  /** Tagged {rune}: given by a rune, soul core or other augment socketed in the item (PoE 2) */
  rune: boolean;
  /** Tagged {desecrated} (PoE 2) */
  desecrated: boolean;
  /** Tagged {mutated}: differs on a Foulborn unique from the regular unique */
  mutated: boolean;
  /** A mod outside the implicit block tagged {crafted}: made on the crafting bench */
  crafted: boolean;
  /** Tagged {fractured} */
  fractured: boolean;
}

interface Item {
  rarity: Rarity;
  name: string;
  /** undefined for a magic item whose base is not in bases.json */
  base: string | undefined;
  /** POB item type of the base, e.g. "One Handed Sword"; undefined when the base is unknown */
  type: string | undefined;
  itemLevel: number | undefined;
  /** POB socket string: groups split by spaces, links by dashes, e.g. "R-G-B A"; POB 2 writes rune sockets as "S S" */
  sockets: string | undefined;
  /** Cluster Jewel enchant family, e.g. "affliction_trap_and_mine_damage" */
  clusterSkill: string | undefined;
  influences: Influence[];
  corrupted: boolean;
  /** Totals POB computed for the item, including quality and local mods */
  armour: number | undefined;
  evasion: number | undefined;
  energyShield: number | undefined;
  /** Mod lines without their POB tags, implicits first */
  mods: Mod[];
}

interface BuildItem {
  slot: string;
  item: Item;
}

/** An Item Set with the passive tree (Spec) of the same title */
interface Loadout {
  /** `Loadout N` when untitled, N its 1-based place in the progression */
  title: string;
  /** Equipment (weapon swap included), flasks and abyss jewels of the Item Set, then jewels socketed in its tree */
  items: BuildItem[];
}

interface Build {
  /** Path of Building writes PoE 1 builds, Path of Building 2 PoE 2 ones */
  game: TradeSiteVersion;
  className: string;
  ascendancy: string | undefined;
  /** Active gem of POB's main skill group, the build's DPS skill; undefined when POB has none */
  mainSkill: string | undefined;
  /** Every Loadout, in progression order */
  loadouts: Loadout[];
}

type Attrs = Record<string, string | undefined>;
type PobSkill = Attrs & { Gem?: Attrs[] };
interface PobRoot {
  Build?: Attrs;
  Items?: Attrs & {
    Item?: (Attrs & { '#text': string })[];
    ItemSet?: { id?: string; title?: string; Slot?: Attrs[] }[];
  };
  Tree?: Attrs & { Spec?: { title?: string; nodes?: string; Sockets?: { Socket?: Attrs[] } }[] };
  Skills?: Attrs & { SkillSet?: (Attrs & { Skill?: PobSkill[] })[]; Skill?: PobSkill[] };
}
/** The root element tells the game */
interface PobXml {
  PathOfBuilding?: PobRoot;
  PathOfBuilding2?: PobRoot;
}

/** Base name to POB item type, per game (pnpm pob-bases) */
const BASE_TYPES: Record<TradeSiteVersion, Record<string, string>> = { '1': bases, '2': poe2Bases };
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  parseTagValue: false,
  parseAttributeValue: false,
  isArray: name => ['Item', 'ItemSet', 'Slot', 'Spec', 'Socket', 'SkillSet', 'Skill', 'Gem'].includes(name),
});

const SLOT_ORDER = [
  'Weapon 1',
  'Weapon 2',
  'Helmet',
  'Body Armour',
  'Gloves',
  'Boots',
  'Amulet',
  'Ring',
  'Belt',
  'Flask',
  // PoE 2. The Arm and Leg slots (POB 2 numbers them) hold the Wickerman's parts, a temporary PoE 1 league mechanic
  // POB 2 carries; they go last with the other unknown slots
  'Charm',
];
/** Item state lines that follow the mods */
const ITEM_FLAGS = new Set([
  'Corrupted',
  'Twice Corrupted',
  'Sanctified',
  'Desecrated Prefix',
  'Desecrated Suffix',
  'Mirrored',
  'Split',
  'Fractured Item',
  'Synthesised Item',
  'Unidentified',
]);

/** Position of a slot in POB's equipment order; abyss sockets follow their item, unknown slots go last */
const slotRank = (slot: string) => {
  const index = SLOT_ORDER.findIndex(prefix => slot.startsWith(prefix));
  return index < 0 ? SLOT_ORDER.length : index;
};

/** Variants the item has selected, e.g. "Selected Variant: 5" and "Selected Alt Variant Two: 1" */
// ponytail: variant groups ("Selected Variant Group") are not read; no unique with a variant search needs them
const selectedVariants = (lines: string[]): Set<number> =>
  new Set(
    lines
      .flatMap(line => /^Selected (?:Alt )?Variant(?: Two| Three| Four| Five)?: (\d+)$/.exec(line)?.[1] ?? [])
      .map(Number),
  );

/** Mods follow the "Implicits: N" line, the first N being implicits */
const parseMods = (lines: string[], selected: Set<number>): Mod[] => {
  const at = lines.findIndex(line => line.startsWith('Implicits: '));
  if (at < 0) return [];
  const implicits = Number(lines[at]!.slice('Implicits: '.length));
  return (
    lines
      .slice(at + 1)
      // "Foil Unique (Verdant)" is how POB keeps a foil's look
      .filter(line => !ITEM_FLAGS.has(line) && !line.startsWith('Foil Unique'))
      // The implicit count includes lines of variants that are not selected
      .flatMap((line, i) => {
        const tags = /^(?:\{[^}]*\})+/.exec(line)?.[0] ?? '';
        const variants = /\{variant:([\d,]+)\}/.exec(tags)?.[1]?.split(',').map(Number);
        if (variants && !variants.some(id => selected.has(id))) return [];
        const text = line.slice(tags.length);
        // A PoE 2 base's skill ("Grants Skill: Parry") comes with every copy of the base
        // ponytail: rolled ones ("Grants Skill: Level 18 Discipline") are skipped too: the site searches them in its
        // `skill` stat group, which the stat data lacks; carry it from dat-mcp if they are worth searching
        if (text.startsWith('Grants Skill: ')) return [];
        const rune = tags.includes('{rune}');
        return [
          {
            text,
            implicit: i < implicits,
            enchant: i < implicits && !rune && (tags.includes('{crafted}') || tags.includes('{enchant}')),
            rune,
            desecrated: tags.includes('{desecrated}'),
            mutated: tags.includes('{mutated}'),
            crafted: i >= implicits && tags.includes('{crafted}'),
            fractured: tags.includes('{fractured}'),
          },
        ];
      })
  );
};

/** A magic item's name holds its base between affixes: take the longest known base inside it */
const magicBase = (name: string, baseTypes: Record<string, string>): string | undefined => {
  let best: string | undefined;
  let bestLength = 0;
  for (const base in baseTypes) {
    if (base.length > bestLength && name.includes(base)) [best, bestLength] = [base, base.length];
  }
  return best;
};

/** POB item text to Item, its base looked up in the game's base table */
const parseItem = (text: string, baseTypes: Record<string, string>): Item | undefined => {
  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
  const start = lines.findIndex(line => line.startsWith('Rarity: '));
  if (start < 0) return undefined;

  const rarity = lines[start]!.slice('Rarity: '.length).toUpperCase() as Rarity;
  const name = lines[start + 1];
  if (!name) return undefined;

  let base: string | undefined;
  if (rarity === 'RARE' || rarity === 'UNIQUE' || rarity === 'RELIC') base = lines[start + 2] ?? name;
  else if (rarity === 'MAGIC') base = magicBase(name, baseTypes);
  else base = name.replace(/^Superior /, '');

  const property = (label: string) => lines.find(line => line.startsWith(`${label}: `))?.slice(label.length + 2);
  const number = (label: string) => {
    const value = property(label);
    return value === undefined ? undefined : Number(value);
  };
  return {
    rarity,
    name,
    base,
    type: base && baseTypes[base],
    itemLevel: number('Item Level'),
    sockets: property('Sockets'),
    clusterSkill: property('Cluster Jewel Skill'),
    influences: INFLUENCES.filter(influence => lines.includes(`${influence} Item`)),
    corrupted: lines.includes('Corrupted') || lines.includes('Twice Corrupted'),
    armour: number('Armour'),
    evasion: number('Evasion'),
    energyShield: number('Energy Shield'),
    mods: parseMods(lines, selectedVariants(lines)),
  };
};

/** zlib inflate; DecompressionStream's 'deflate' is the zlib format */
const inflate = async (bytes: Uint8Array): Promise<string> => {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate'));
  return await new Response(stream).text();
};

/** Build Code (base64url, zlib) to its XML */
// js-base64 accepts the url-safe alphabet too
const buildXml = (buildCode: string) => inflate(Base64.toUint8Array(buildCode.trim()));

/**
 * The game of a Build Code, to load that game's data before decoding it. Only the root element can read
 * `<PathOfBuilding2`: XML text escapes its `<`
 */
const buildGame = async (buildCode: string): Promise<TradeSiteVersion> =>
  /<PathOfBuilding2[\s/>]/.test(await buildXml(buildCode)) ? '2' : '1';

/** Build Code (base64url, zlib, XML) to Build */
const decodeBuild = async (buildCode: string): Promise<Build> => {
  const xml = parser.parse(await buildXml(buildCode)) as PobXml;
  const game = xml.PathOfBuilding2 ? '2' : '1';
  const pob = xml.PathOfBuilding2 ?? xml.PathOfBuilding;
  if (!pob?.Build) throw new Error('Not a Path of Building Build Code');
  const baseTypes = BASE_TYPES[game];

  const itemsById = new Map((pob.Items?.Item ?? []).map(node => [node.id, node['#text']]));
  const specs = pob.Tree?.Spec ?? [];
  const activeSpec = specs[Number(pob.Tree?.activeSpec ?? 1) - 1] ?? specs[0];
  const allocatedOf = (spec: (typeof specs)[number] | undefined) => new Set(spec?.nodes?.split(',').filter(Boolean));

  const sets = pob.Items?.ItemSet ?? [];
  // A build without Item Sets is one Loadout of the jewels in its tree
  const loadouts = (sets.length ? sets : [{ title: undefined, Slot: [] }]).map((set, position) => {
    // A Spec of the same title, else of the same position when every Item Set has one, else the active one: a single
    // Item Set with levelling trees goes with the tree PoB shows
    const spec =
      specs.find(({ title }) => title && title === set.title) ??
      (specs.length === sets.length ? specs[position] : undefined) ??
      activeSpec;
    const allocated = allocatedOf(spec);
    const items: BuildItem[] = [];
    const add = (slot: string, itemId: string | undefined) => {
      const text = itemId && itemId !== '0' ? itemsById.get(itemId) : undefined;
      const item = text && parseItem(text, baseTypes);
      // Transcendent limbs are the Wickerman's parts, a temporary PoE 1 league mechanic POB 2 carries in its Arm and Leg
      // slots: no PoE 2 item, and the PoE 2 trade site doesn't list them
      if (item && item.type !== 'Transcendent Limb') items.push({ slot, item });
    };
    const slots = (set.Slot ?? []).filter(({ name }) => name);
    slots.sort((a, b) => slotRank(a.name!) - slotRank(b.name!) || a.name!.localeCompare(b.name!));
    for (const { name, itemId } of slots) add(name!, itemId);
    // POB keeps jewels in deallocated sockets: only allocated nodes count
    for (const { nodeId, itemId } of spec?.Sockets?.Socket ?? []) {
      if (nodeId && allocated.has(nodeId)) add('Jewel', itemId);
    }
    return { title: set.title, items, passives: allocated.size };
  });
  // Progression order is the number of allocated passives (a stable sort: ties keep Build Code order). Build Codes may
  // list Loadouts out of order, and titles are never parsed for a level: PoB stores the character level once per build,
  // "(lvl 43)" is only how Time Machine PoB names them
  loadouts.sort((a, b) => a.passives - b.passives);

  const skillSets = pob.Skills?.SkillSet;
  // Builds from before Skill Sets keep their skills directly under <Skills>
  const skills = skillSets
    ? (skillSets.find(set => set.id === pob.Skills?.activeSkillSet) ?? skillSets[0])?.Skill
    : pob.Skills?.Skill;
  const mainGroup = skills?.[Number(pob.Build.mainSocketGroup) - 1];
  // POB numbers the group's active skills, and a Vaal gem is two: "Vaal X", then "X"
  const mainSkills = (mainGroup?.Gem ?? [])
    .filter(gem => gem.gemId && gem.nameSpec && !gem.gemId.includes('/SupportGem'))
    .flatMap(gem => (gem.nameSpec!.startsWith('Vaal ') ? [gem.nameSpec!, gem.nameSpec!.slice(5)] : [gem.nameSpec!]));
  const mainSkill = mainSkills[(Number(mainGroup?.mainActiveSkill) || 1) - 1];

  const { className = '', ascendClassName } = pob.Build;
  return {
    game,
    className,
    ascendancy: ascendClassName && ascendClassName !== 'None' ? ascendClassName : undefined,
    mainSkill,
    loadouts: loadouts.map(({ title, items }, i) => ({ title: title || `Loadout ${i + 1}`, items })),
  };
};

export type { BuildItem, Influence, Item, Loadout, Mod };
export { buildGame, decodeBuild };
