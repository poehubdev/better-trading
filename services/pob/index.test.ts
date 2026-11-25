/* eslint-disable @typescript-eslint/no-explicit-any */
import { toExportString } from './index';
import { decodeBuild } from './build';
import { matchMod } from './mods';
import { inPool, modPool } from './pools';
import { decodeExportString, fixture } from './test-utils';
import { describe, expect, it, vi } from 'vitest';
import { deflateSync } from 'node:zlib';
import type { ImportOptions, RollFloor } from './index';

const FIXTURES = {
  'elemental-hit-slayer-3.30.txt': { title: 'Elemental Hit Slayer', icon: 'slayer' },
  'eviscirate-elementalist-3.30.txt': { title: 'Eviscerate Elementalist', icon: 'elementalist' },
  'flicker-strike-slayer-3.30.txt': { title: 'Flicker Strike Slayer', icon: 'slayer' },
  'frost-blades-champion-3.30.txt': { title: 'Frost Blades Champion', icon: 'champion' },
  'ice-trap-assasin-3.30.txt': { title: 'Ice Trap Assassin', icon: 'assassin' },
  'kinetic-blast-warden-3.30.txt': { title: 'Kinetic Blast Warden', icon: 'warden' },
  'righteous-fire-chieftain-3.30.txt': { title: 'Righteous Fire Chieftain', icon: 'chieftain' },
  'static-strike-luminary-3.30.txt': { title: 'Static Strike Luminary', icon: 'luminary' },
  'venom-gyre-gladiator-3.30.txt': { title: 'Venom Gyre Gladiator', icon: 'gladiator' },
};

const CLUSTER_ENCHANT = 'enchant.stat_3948993189';
const folderOf = async (name: string, options?: ImportOptions) =>
  decodeExportString((await toExportString(await fixture(name), options)).exportString);
const tradeOf = async (name: string, title: string, options?: ImportOptions) => {
  const trade = (await folderOf(name, options)).trades.find(trade => trade.title === title);
  if (!trade) throw new Error(`No Trade "${title}" in ${name}`);
  return trade.query;
};

/** A Folder of one Build Item made from POB item text, in a belt slot */
const singleItem = async (itemText: string, options?: ImportOptions) => {
  const xml = `<PathOfBuilding><Build className="Witch" level="90"/><Items activeItemSet="1"><Item id="1">${itemText}</Item>
    <ItemSet id="1"><Slot name="Belt" itemId="1"/></ItemSet></Items></PathOfBuilding>`;
  return decodeExportString((await toExportString(deflateSync(xml).toString('base64url'), options)).exportString);
};

describe.each(Object.entries(FIXTURES))('%s', (name, expected) => {
  it('returns an Export String', async () => {
    expect((await toExportString(await fixture(name))).exportString).toMatch(/^3:/);
  });

  it('either matches every mod line of a non-unique item or reports it', async () => {
    const { unmatched } = await toExportString(await fixture(name));
    const items = (await decodeBuild(await fixture(name))).items.filter(({ slot }) => !slot.includes('Swap'));
    items.forEach(({ slot, item }) => {
      if (item.rarity === 'UNIQUE' || item.rarity === 'RELIC') return;
      const title = `${slot} — ${item.name}`;
      expect(item.mods.length, title).toBeGreaterThan(0);
      item.mods.forEach(({ text }, i) => {
        const [prev, next] = [item.mods[i - 1]?.text, item.mods[i + 1]?.text];
        // A stat can span two lines (cluster jewel enchants)
        const matched =
          matchMod(text) ?? (next && matchMod(`${text}\n${next}`)) ?? (prev && matchMod(`${prev}\n${text}`));
        if (!matched) expect(unmatched, title).toContain(`${title}: ${text}`);
      });
    });
  });

  it('builds one PoE 1 Folder titled with main skill and ascendancy', async () => {
    const { title, icon, version } = await folderOf(name);
    expect({ title, icon, version }).toEqual({ ...expected, version: '1' });
  });

  it('has one Trade per distinct Build Item', async () => {
    expect((await folderOf(name)).trades.map(trade => trade.title)).toMatchSnapshot();
  });

  it('gives every Trade an instant buyout query without a league', async () => {
    for (const { query } of (await folderOf(name)).trades) {
      expect(query.status).toEqual({ option: 'securable' });
      expect(JSON.stringify(query)).not.toMatch(/league/i);
    }
  });
});

describe('Build Items', () => {
  it('leaves out Skill Gems', async () => {
    const titles = (await folderOf('righteous-fire-chieftain-3.30.txt')).trades.map(trade => trade.title).join('\n');
    expect(titles).not.toMatch(/Righteous Fire|Elemental Focus|Lifetap/);
  });

  it('includes tree jewels and abyss jewels socketed in equipment', async () => {
    const titles = (await folderOf('righteous-fire-chieftain-3.30.txt')).trades.map(trade => trade.title);
    expect(titles).toContain('Boots Abyssal Socket 1 — Whispering Stare');
    expect(titles).toContain('Unique Jewel — Glorious Vanity');
  });
});

describe('Search Query', () => {
  it('searches a rare by category and base type', async () => {
    const query = await tradeOf('righteous-fire-chieftain-3.30.txt', 'Helmet — Foe Corona');
    expect(query.type).toBe('Giantslayer Helmet');
    expect(query.filters.type_filters).toEqual({ filters: { category: { option: 'armour.helmet' } } });
  });

  it('derives a magic item base type from its name', async () => {
    const query = await tradeOf(
      'righteous-fire-chieftain-3.30.txt',
      "Flask 2 — Abecedarian's Granite Flask of the Rainbow",
    );
    expect(query.type).toBe('Granite Flask');
    expect(query.filters.type_filters).toEqual({ filters: { category: { option: 'flask' } } });
  });

  it('maps every ring slot to the ring category', async () => {
    const query = await tradeOf('righteous-fire-chieftain-3.30.txt', 'Ring 1 — Hypnotic Circle');
    expect(query.filters.type_filters.filters.category).toEqual({ option: 'accessory.ring' });
  });

  it('searches a unique by name only', async () => {
    expect(await tradeOf('righteous-fire-chieftain-3.30.txt', "Unique Body Armour — Kaom's Heart")).toEqual({
      status: { option: 'securable' },
      name: "Kaom's Heart",
    });
  });

  it('searches a Foulborn unique by its plain name with the Foulborn flag and a filter per Mutated Mod', async () => {
    expect(await tradeOf('elemental-hit-slayer-3.30.txt', 'Unique Body Armour — Foulborn Skin of the Lords')).toEqual({
      status: { option: 'securable' },
      name: 'Skin of the Lords',
      filters: { misc_filters: { filters: { mutated: { option: 'true' } } } },
      stats: [{ type: 'and', filters: expect.any(Array) }],
    });
  });

  it('searches a Skin of the Lords by its random keystone', async () => {
    const { stats } = await tradeOf('elemental-hit-slayer-3.30.txt', 'Unique Body Armour — Foulborn Skin of the Lords');
    // Avatar of Fire
    expect(stats[0].filters).toContainEqual({ id: 'explicit.stat_346029096' });
  });

  it('scales a Mutated Mod by the Roll Floor, keeping a minimum of 1', async () => {
    const { stats } = await tradeOf('ice-trap-assasin-3.30.txt', "Unique Ring — Foulborn Romira's Banquet");
    expect(stats).toHaveLength(1);
    expect(stats[0].filters.map((filter: any) => filter.value)).toEqual(
      Array(stats[0].filters.length).fill({ min: 1 }),
    );
  });

  it('searches a unique jewel by all its mods, leaving out the variants it has not selected', async () => {
    const watchersEye = `Rarity: UNIQUE
Watcher's Eye
Prismatic Jewel
Variant: Precision
Variant: Malevolence
Variant: Purity of Ice
Variant: Malevolence Recovery
Has Alt Variant: true
Has Alt Variant Two: true
Selected Variant: 1
Selected Alt Variant: 2
Selected Alt Variant Two: 3
Implicits: 0
5% increased maximum Energy Shield
{variant:1}14% increased Attack Speed while affected by Precision
{variant:2}+18% to Damage over Time Multiplier while affected by Malevolence
{variant:3}Unaffected by Chilled Ground while affected by Purity of Ice
{variant:4}10% increased Recovery rate of Life and Energy Shield while affected by Malevolence`;
    const { query } = (await singleItem(watchersEye)).trades[0]!;
    expect(query.name).toBe("Watcher's Eye");
    // Unique jewels roll random mods (Watcher's Eye auras by item level), so the fixed Energy Shield line counts too;
    // one mod of one type each: they are all required, so they share one and group
    expect(query.stats).toEqual([
      {
        type: 'and',
        filters: [
          { id: 'explicit.stat_2482852589', value: { min: 4 } },
          { id: expect.stringMatching(/^explicit\./), value: { min: 11 } },
          { id: expect.stringMatching(/^explicit\./), value: { min: 14 } },
          { id: expect.stringMatching(/^explicit\./) },
        ],
      },
    ]);
  });

  it("searches a Watcher's Eye without variant data by its fixed and aura mods alike", async () => {
    const { name, stats } = await tradeOf('righteous-fire-chieftain-3.30.txt', "Unique Jewel — Watcher's Eye");
    expect(name).toBe("Watcher's Eye");
    // The Energy Shield, Life and Mana lines every Watcher's Eye has, then its three aura mods
    expect(stats).toHaveLength(1);
    expect(stats[0].filters).toHaveLength(6);
  });

  it('searches a Forbidden Shako by its random support gems, not the Attributes every one has', async () => {
    const { stats } = await tradeOf('flicker-strike-slayer-3.30.txt', 'Unique Helmet — Forbidden Shako');
    // Endurance Charge on Melee Stun level 7 and Ice Bite level 33, without +26 to all Attributes
    expect(stats).toEqual([
      {
        type: 'and',
        filters: [
          { id: 'explicit.indexable_support_88', value: { min: 5 } },
          { id: 'explicit.indexable_support_73', value: { min: 26 } },
        ],
      },
    ]);
  });

  it('searches an Impresence by the mods of its variant, not the ones every Impresence has', async () => {
    const { stats } = await tradeOf('eviscirate-elementalist-3.30.txt', 'Unique Amulet — Impresence');
    // The fire variant: life, fire resistance and the two curse auras, without its added fire damage, attributes,
    // life regeneration and Maddening Presence
    expect(stats).toEqual([
      {
        type: 'and',
        filters: [
          { id: 'explicit.stat_3299347043', value: { min: 42 } },
          { id: 'explicit.stat_3372524247', value: { min: 17 } },
          { id: 'explicit.stat_3416664215' },
          { id: 'explicit.stat_1195140808' },
        ],
      },
    ]);
  });

  it('keeps a fixed mod of a unique jewel, whose roll may set its price', async () => {
    const { stats } = await tradeOf('righteous-fire-chieftain-3.30.txt', 'Unique Jewel — Voices');
    // Adds # Jewel Socket Passive Skills: on every Voices, 1 to 7
    expect(stats[0].filters).toContainEqual({ id: 'explicit.stat_247746531', value: { min: 2 } });
  });

  it('searches a unique sold in several bases by its base too', async () => {
    const { name, type } = await tradeOf('elemental-hit-slayer-3.30.txt', 'Unique Jewel — Combat Focus');
    expect({ name, type }).toEqual({ name: 'Combat Focus', type: 'Viridian Jewel' });
  });

  it('searches an Agnerod by the item level bracket that sets its Vinktar Square mods', async () => {
    const { query } = (
      await singleItem(`Rarity: UNIQUE
Agnerod East
Imperial Staff
Item Level: 81
Implicits: 0
+20% Chance to Block Attack Damage while wielding a Staff`)
    ).trades[0]!;
    expect(query.filters).toEqual({ misc_filters: { filters: { ilvl: { min: 80 } } } });
  });

  it('searches a unique whose variants are only versions by its name only', async () => {
    const query = (
      await singleItem(`Rarity: UNIQUE
Atziri's Disfavour
Vaal Axe
Variant: Pre 3.19.0
Variant: Current
Selected Variant: 2
Implicits: 0
{variant:1}+2 to Level of Socketed Support Gems
{variant:2}+30% to Quality of Socketed Support Gems`)
    ).trades[0]!.query;
    expect(query).toEqual({ status: { option: 'securable' }, name: "Atziri's Disfavour" });
  });

  it('searches a unique by the mods its PoB definition lacks, not the ones every copy has', async () => {
    const { stats } = await tradeOf('elemental-hit-slayer-3.30.txt', 'Unique Weapon — Paradoxica');
    const ids = stats.flatMap((group: any) => group.filters.map((filter: any) => filter.id));
    // Dexterity and Intelligence, Attack Speed and Penetration
    expect(ids).toEqual(
      expect.arrayContaining(['explicit.stat_2300185227', 'explicit.stat_681332047', 'explicit.stat_4064396395']),
    );
    // Double Damage, which every Paradoxica has
    expect(ids).not.toContain('explicit.stat_1506185293');
  });

  it('leaves the bench-crafted mods of a unique out', async () => {
    const query = (
      await singleItem(`Rarity: UNIQUE
Paradoxica
Vaal Rapier
Implicits: 1
+25% to Global Critical Strike Multiplier
{crafted}22% increased Attack Speed
Attacks with this Weapon deal Double Damage`)
    ).trades[0]!.query;
    expect(query.stats).toBeUndefined();
  });

  it('searches a relic as a unique', async () => {
    expect(await tradeOf('righteous-fire-chieftain-3.30.txt', 'Unique Belt — Mageblood')).toEqual({
      status: { option: 'securable' },
      name: 'Mageblood',
    });
  });
});

describe('Minimum values', () => {
  it('rounds every minimum down to an integer, except the sum of a weight group', async () => {
    const { query } = (
      await singleItem(
        `Rarity: RARE\nDoom Eye\nCoral Ring\nItem Level: 80\nImplicits: 0\n+13% to Fire Resistance\n12% increased Mana Regeneration Rate`,
      )
    ).trades[0]!;
    const [pseudo, count, weight] = query.stats;
    expect(pseudo.filters[0]).toEqual({ id: 'pseudo.pseudo_total_fire_resistance', value: { min: 10 } });
    expect(count.filters.map((filter: any) => filter.value)).toEqual(Array(count.filters.length).fill({ min: 9 }));
    // 80% of 13 * 2.08 + 12 * 1.32
    expect(weight.value).toEqual({ min: 34.3 });
  });

  it('keeps a minimum of at least 1 for a stat that rolled 1 or more', async () => {
    const { query } = (
      await singleItem(
        `Rarity: RARE\nDoom Eye\nCoral Ring\nItem Level: 80\nImplicits: 0\n1% increased Mana Regeneration Rate`,
      )
    ).trades[0]!;
    const mana = query.stats
      .flatMap((group: any) => group.filters)
      .find((f: any) => f.id === 'explicit.stat_789117908');
    expect(mana.value).toEqual({ min: 1 });
  });
});

describe('Cluster jewel enchants', () => {
  const cluster = async (base: string, ...enchants: string[]) =>
    (
      await singleItem(
        `Rarity: RARE\nOblivion Stone\n${base}\nCluster Jewel Skill: affliction_axe_and_sword_damage\nItem Level: 84\nImplicits: ${enchants.length}\n${enchants.map(line => `{crafted}${line}`).join('\n')}\nAdded Small Passive Skills also grant: +2 to Dexterity`,
      )
    ).trades[0]!.query.stats;
  const filtersOf = (stats: any[], stat: string) =>
    stats.flatMap(group => group.filters).filter(filter => filter.id.endsWith(stat));

  it.each([
    ['Large', 12],
    ['Medium', 5],
    ['Small', 3],
  ])('titles a %s Cluster Jewel Trade by size, name and skill', async (size, passives) => {
    const { trades } = await singleItem(
      `Rarity: RARE\nOblivion Stone\n${size} Cluster Jewel\nCluster Jewel Skill: affliction_trap_and_mine_damage\nItem Level: 84\nImplicits: 1\n{crafted}Adds ${passives} Passive Skills`,
    );
    expect(trades[0]!.title).toBe(`${size} Cluster — Oblivion Stone (Trap And Mine Damage)`);
  });

  it('leaves the missing parts out of a Cluster Jewel title', async () => {
    const { trades } = await singleItem(
      'Rarity: RARE\nOblivion Stone\nLarge Cluster Jewel\nItem Level: 84\nImplicits: 0',
    );
    expect(trades[0]!.title).toBe('Large Cluster — Oblivion Stone');
  });

  it('searches an enchant by its enchant stat alone, with its exact value', async () => {
    const stats = await cluster(
      'Large Cluster Jewel',
      'Adds 12 Passive Skills',
      '2 Added Passive Skills are Jewel Sockets',
    );
    expect(filtersOf(stats, 'stat_4079888060')).toEqual([{ id: 'enchant.stat_4079888060', value: { min: 2 } }]);
  });

  it('puts every enchant into one and group that is on', async () => {
    const stats = await cluster(
      'Large Cluster Jewel',
      'Adds 12 Passive Skills',
      '2 Added Passive Skills are Jewel Sockets',
      'Added Small Passive Skills grant: Axe Attacks deal 12% increased Damage with Hits and Ailments',
      'Added Small Passive Skills grant: Sword Attacks deal 12% increased Damage with Hits and Ailments',
    );
    expect(stats.filter((group: any) => group.type === 'and')).toEqual([
      {
        type: 'and',
        filters: [
          { id: 'enchant.stat_3086156145', value: { min: 12 } },
          { id: 'enchant.stat_4079888060', value: { min: 2 } },
          { id: 'enchant.stat_3948993189', value: { option: 1 } },
        ],
      },
    ]);
    // No enchant is left in a count group of its own
    expect(
      stats
        .filter((group: any) => group.type === 'count')
        .flatMap((group: any) => group.filters.map((filter: any) => filter.id)),
    ).not.toContainEqual(expect.stringMatching(/^enchant\./));
  });

  it('turns the explicit mods into count groups that are on, with the weighted sum off', async () => {
    const { stats } = (
      await singleItem(
        `Rarity: RARE\nOblivion Stone\nLarge Cluster Jewel\nCluster Jewel Skill: affliction_axe_and_sword_damage\nItem Level: 84\nImplicits: 1\n{crafted}Adds 12 Passive Skills\nAdded Small Passive Skills also grant: +2 to Dexterity\n1 Added Passive Skill is Fuel the Fight`,
        { weightedSum: false },
      )
    ).trades[0]!.query;
    const groups = stats.filter((group: any) => group.type === 'count');
    expect(groups.length).toBeGreaterThan(0);
    expect(groups.every((group: any) => group.disabled === false)).toBe(true);
  });

  it('searches the cluster skill enchant by its enchant stat alone', async () => {
    const stats = await cluster(
      'Large Cluster Jewel',
      'Added Small Passive Skills grant: Axe Attacks deal 12% increased Damage with Hits and Ailments',
      'Added Small Passive Skills grant: Sword Attacks deal 12% increased Damage with Hits and Ailments',
    );
    expect(filtersOf(stats, 'stat_3948993189')).toEqual([{ id: 'enchant.stat_3948993189', value: { option: 1 } }]);
  });

  it.each([
    ['Large Cluster Jewel', 8, { max: 8 }],
    ['Large Cluster Jewel', 12, { min: 12 }],
    ['Medium Cluster Jewel', 4, { max: 4 }],
    ['Medium Cluster Jewel', 5, { min: 5 }],
    ['Small Cluster Jewel', 2, { max: 2 }],
    ['Small Cluster Jewel', 3, { min: 3 }],
  ])('limits the passive count of a %s with %i passives to %j', async (base, count, value) => {
    expect(filtersOf(await cluster(base, `Adds ${count} Passive Skills`), 'stat_3086156145')).toEqual([
      { id: 'enchant.stat_3086156145', value },
    ]);
  });
});

describe('Flask enchants', () => {
  // POB tags a flask's enchants {crafted} and lists them as implicits
  const flask = `Rarity: MAGIC\nAlchemist's Silver Flask of the Rainbow\nItem Level: 84\nImplicits: 2\n{crafted}70% increased effect\n{crafted}Gains no Charges during Effect\n27% reduced Duration\n25% increased effect`;

  it('searches an enchant by its enchant stat alone, with its exact value, switched off', async () => {
    const { stats } = (await singleItem(flask)).trades[0]!.query;
    expect(stats[0]).toEqual({
      type: 'and',
      filters: [
        { id: 'enchant.stat_2448920197', value: { min: 70 }, disabled: true },
        { id: 'enchant.stat_4123533923', disabled: true },
      ],
    });
  });
});

describe('Unique flask enchants', () => {
  it('adds the enchants of a Unique flask as Disabled Filters with their exact values, next to its name', async () => {
    const query = await tradeOf('ice-trap-assasin-3.30.txt', 'Unique Flask — Bottled Faith');
    expect(query.name).toBe('Bottled Faith');
    expect(query.stats).toEqual([
      {
        type: 'and',
        filters: [
          { id: 'enchant.stat_2448920197', value: { min: 69 }, disabled: true },
          { id: 'enchant.stat_4123533923', disabled: true },
        ],
      },
    ]);
  });
});

describe('Base jewel mod types', () => {
  const jewel = singleItem(
    `Rarity: RARE\nBramble Joy\nViridian Jewel\nItem Level: 81\nImplicits: 1\nCorrupted Blood cannot be inflicted on you\n10% increased Melee Damage\nCorrupted`,
  ).then(item => item.trades[0]!.query.stats);
  const idsOf = async (stat: string) =>
    (await jewel)
      .filter((group: any) => group.type !== 'weight')
      .flatMap((group: any) => group.filters.map((filter: any) => filter.id))
      .filter((id: string) => id.endsWith(stat));

  it('searches the corrupted implicit as an implicit only', async () => {
    expect(await idsOf('stat_1658498488')).toEqual(['implicit.stat_1658498488']);
  });

  it('searches an explicit as an explicit or fractured mod: a jewel has no crafted mods, enchants or implicits of that kind', async () => {
    expect(await idsOf('stat_1002362373')).toEqual(['explicit.stat_1002362373', 'fractured.stat_1002362373']);
  });
});

describe('Mod Pool', () => {
  const belt = (implicits: string[], base = 'Leather Belt') =>
    singleItem(
      `Rarity: RARE\nDoom Lock\n${base}\nItem Level: 84\nImplicits: ${implicits.length}\n${implicits.join('\n')}`,
    ).then(folder => folder.trades[0]!.query);
  const idsOf = (query: any): string[] =>
    (query.stats ?? []).flatMap((group: any) => group.filters.map((filter: any) => filter.id));

  it("leaves out another base's implicit", async () => {
    // Has # Abyssal Sockets is a Stygian Vise implicit, never a Leather Belt one
    expect(idsOf(await belt(['Has 1 Abyssal Socket']))).not.toContain('implicit.stat_3527617737');
    expect(idsOf(await belt(['Has 1 Abyssal Socket'], 'Stygian Vise'))).toContain('implicit.stat_3527617737');
  });

  it('keeps the corruptions the base can roll and leaves out the others', async () => {
    // +# to Level of all Fire Spell Skill Gems is a weapon corruption
    const ids = idsOf(await belt(['Bleeding cannot be inflicted on you', '+1 to Level of all Fire Spell Skill Gems']));
    expect(ids).toContain('implicit.stat_1901158930');
    expect(ids.some(id => id.endsWith('stat_591105508'))).toBe(false);
  });

  it('keeps the enchants the base can have and leaves out the others', async () => {
    const ids = idsOf(
      await belt([
        '{crafted}Recover 2% of Life when you Kill an Enemy while you have Rage',
        '{crafted}Regenerate 1% of Life per second if you were Hit Recently',
      ]),
    );
    expect(ids).toContain('enchant.stat_3305072079');
    expect(ids.some(id => id.endsWith('stat_1122635070'))).toBe(false);
  });

  it('searches the flask-local twin of a stat on a flask and the global one elsewhere', async () => {
    const mod = '20% chance to gain a Flask Charge when you deal a Critical Strike';
    const idsOn = async (item: string) =>
      idsOf((await singleItem(`${item}\nItem Level: 84\nImplicits: 0\n${mod}`)).trades[0]!.query);
    const flaskIds = await idsOn('Rarity: MAGIC\nDivine Life Flask of Gluttony');
    expect(flaskIds).toContain('explicit.stat_2858921304');
    expect(flaskIds).not.toContain('explicit.stat_3738001379');
    const beltIds = await idsOn('Rarity: RARE\nDoom Lock\nLeather Belt');
    expect(beltIds).toContain('explicit.stat_3738001379');
    expect(beltIds).not.toContain('explicit.stat_2858921304');
  });

  it('finds the Mod Pool of a base PoB names with a variant', async () => {
    expect(modPool('Two-Stone Ring (Fire/Lightning)')).toBe(modPool('Two-Stone Ring'));
    expect(modPool('Two-Stone Ring')).toBeDefined();
  });

  it('checks nothing on a base missing from the Mod Pools, and warns', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const ids = idsOf(await belt(['Has 1 Abyssal Socket'], 'Imaginary Belt'));
    expect(ids).toContain('implicit.stat_3527617737');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Imaginary Belt'));
    warn.mockRestore();
  });

  it("checks a unique's implicits and enchants, not its explicit mods", async () => {
    const { trades } = await singleItem(
      `Rarity: UNIQUE\nWatcher's Eye\nPrismatic Jewel\nItem Level: 84\nImplicits: 2\nCorrupted Blood cannot be inflicted on you\n+1 to Maximum Endurance Charges\n6% increased maximum Life\nCorrupted`,
    );
    const ids = idsOf(trades[0]!.query);
    expect(ids).toContain('implicit.stat_1658498488');
    expect(ids.some(id => id.endsWith('stat_1515657623'))).toBe(false);
    expect(ids).toContain('explicit.stat_983749596');
  });
});

describe('Crafted and fractured mods', () => {
  const stats = (...mods: string[]) =>
    singleItem(
      `Rarity: RARE\nDoom Lock\nLeather Belt\nItem Level: 84\nImplicits: 0\n${mods.join('\n')}\n15% increased Flask Effect Duration`,
    ).then(folder => folder.trades[0]!.query.stats as any[]);
  const groupOf = (groups: any[], stat: string) =>
    groups.find(group => group.type !== 'weight' && group.filters.some((filter: any) => filter.id.endsWith(stat)));

  it('searches a crafted prefix in any rolled or crafted form, or an empty prefix to craft it', async () => {
    const groups = await stats('{crafted}+40 to maximum Life');
    expect(groupOf(groups, 'stat_3299347043')).toEqual({
      type: 'count',
      value: { min: 1 },
      disabled: false,
      filters: [
        { id: 'explicit.stat_3299347043', value: { min: 32 } },
        { id: 'fractured.stat_3299347043', value: { min: 32 } },
        { id: 'crafted.stat_3299347043', value: { min: 32 } },
        { id: 'pseudo.pseudo_number_of_empty_prefix_mods', value: { min: 1 } },
      ],
    });
    // Not folded into the total life, which is only suggested
    expect(groups[0].filters.filter((filter: any) => filter.id === 'pseudo.pseudo_total_life')).toEqual([
      { id: 'pseudo.pseudo_total_life', disabled: true },
    ]);
  });

  it('offers an empty suffix for a crafted suffix', async () => {
    const filters = groupOf(await stats('{crafted}+25% to Fire Resistance'), 'stat_3372524247').filters;
    expect(filters.at(-1)).toEqual({ id: 'pseudo.pseudo_number_of_empty_suffix_mods', value: { min: 1 } });
    expect(filters.map((filter: any) => filter.id)).not.toContain('pseudo.pseudo_number_of_empty_prefix_mods');
  });

  it('leaves a crafted mod out of the weighted sum', async () => {
    const weight = (await stats('{crafted}+40 to maximum Life', '+100 to Armour')).find(
      group => group.type === 'weight',
    );
    expect(weight.filters.map((filter: any) => filter.id)).not.toContain('crafted.stat_3299347043');
    expect(weight.filters.some((filter: any) => filter.id.endsWith('stat_3299347043'))).toBe(false);
    // Only Armour and the flask duration line count
    const uncrafted = (await stats('+100 to Armour')).find(group => group.type === 'weight');
    expect(weight.value).toEqual(uncrafted.value);
  });

  it('leaves a crafted mod out of the identity of a unique', async () => {
    const { trades } = await singleItem(
      // Every explicit mod of a Bound By Destiny is random, so it would be searched
      `Rarity: UNIQUE\nBound By Destiny\nLeather Belt\nItem Level: 84\nImplicits: 0\n{crafted}+25% to Fire Resistance`,
    );
    expect(trades[0]!.query).toEqual({ status: { option: 'securable' }, name: 'Bound By Destiny' });
  });

  it('searches a fractured mod as an explicit or fractured one', async () => {
    expect(groupOf(await stats('{fractured}+100 to Armour'), 'stat_809229260')).toEqual({
      type: 'count',
      value: { min: 1 },
      // Off: the weight group covers it
      disabled: true,
      filters: [
        { id: 'explicit.stat_809229260', value: { min: 80 } },
        { id: 'fractured.stat_809229260', value: { min: 80 } },
      ],
    });
  });
});

describe('Forbidden Flame and Flesh', () => {
  const pair = ['explicit.stat_2460506030', 'explicit.stat_1190333629'].map(id => ({ id, value: { option: 3184 } }));

  it('searches the pair by the ascendancy node alone, so a find on either jewel counts', async () => {
    const forbidden = (name: string, other: string) =>
      `Rarity: UNIQUE\n${name}\nCrimson Jewel\nItem Level: 85\nImplicits: 0\nAllocates Headsman if you have the matching modifier on Forbidden ${other}\nCorrupted`;
    for (const [name, other] of [
      ['Forbidden Flame', 'Flesh'],
      ['Forbidden Flesh', 'Flame'],
    ] as const) {
      const { query } = (await singleItem(forbidden(name, other))).trades[0]!;
      expect(query).toEqual({
        status: { option: 'securable' },
        stats: [{ type: 'count', value: { min: 1 }, disabled: false, filters: expect.arrayContaining(pair) }],
      });
    }
  });
});

describe('Unique titles', () => {
  const titles = async (name: string) => (await folderOf(name)).trades.map(trade => trade.title);

  it('prefixes a Unique with its category, without the slot number', async () => {
    expect(await titles('ice-trap-assasin-3.30.txt')).toEqual(
      expect.arrayContaining([
        'Unique Ring — Winterweave',
        "Unique Belt — The Arkhon's Tools",
        'Unique Jewel — Militant Faith',
      ]),
    );
  });

  it('leaves a non-Unique as it is', async () => {
    expect(await titles('ice-trap-assasin-3.30.txt')).toContain("Flask 5 — Abecedarian's Diamond Flask of Penetrating");
  });
});

describe('Cluster jewel titles', () => {
  it('names the skill of a cluster jewel even when its POB id ends in an underscore', async () => {
    // POB: "Cluster Jewel Skill: affliction_attack_damage_while_dual_wielding_"
    const titles = (await folderOf('static-strike-luminary-3.30.txt')).trades.map(trade => trade.title);
    expect(titles.some(title => title.endsWith('(Attack Damage While Dual Wielding)'))).toBe(true);
  });
});

describe('Forbidden Flame and Flesh title', () => {
  it('names the Trade after the pair, since the search finds either jewel', async () => {
    const titles = (await folderOf('elemental-hit-slayer-3.30.txt')).trades
      .map(trade => trade.title)
      .filter(title => title.includes('Forbidden'));
    expect(titles).toEqual(['Unique Jewel — Forbidden Flame / Flesh']);
  });
});

describe('Timeless jewels', () => {
  const seedGroup = async (name: string, title: string, seed: number, ids: string[]) => {
    const query = await tradeOf(name, title);
    expect(query.name).toBe(title.split(' — ')[1]);
    expect(query.stats).toEqual([
      {
        type: 'count',
        value: { min: 1 },
        filters: ids.map(id => ({ id: `explicit.pseudo_timeless_jewel_${id}`, value: { min: seed, max: seed } })),
      },
    ]);
  };

  it('searches by name plus one count group holding every conqueror seed stat', async () => {
    await seedGroup('righteous-fire-chieftain-3.30.txt', 'Unique Jewel — Glorious Vanity', 5330, [
      'doryani',
      'ahuana',
      'xibaqua',
    ]);
    await seedGroup('elemental-hit-slayer-3.30.txt', 'Unique Jewel — Lethal Pride', 14861, [
      'akoya',
      'kaom',
      'rakiata',
    ]);
  });

  it('ignores the jewel mods that follow the seed lines', async () => {
    await seedGroup('ice-trap-assasin-3.30.txt', 'Unique Jewel — Militant Faith', 9499, [
      'avarius',
      'dominus',
      'maxarius',
    ]);
  });
});

describe('Impossible Escape', () => {
  it('searches by its keystone, a stat written over three lines', async () => {
    const query = await tradeOf('frost-blades-champion-3.30.txt', 'Unique Jewel — Impossible Escape');
    // The keystone node is the option of the stat: Elemental Equilibrium
    expect(query.stats).toEqual([
      { type: 'and', filters: [{ id: 'explicit.stat_2422708892', value: { option: 39085 } }] },
    ]);
  });
});

describe('Mod lines that read unlike the stat data', () => {
  it('joins a two-line stat whose lines POB keeps apart', async () => {
    // Thread of Hope: "-12% to all Elemental Resistances" sits between the stat's first line and "Passage"
    const { stats } = await tradeOf('flicker-strike-slayer-3.30.txt', 'Unique Jewel — Thread of Hope');
    expect(stats[0].filters).toContainEqual({ id: 'explicit.stat_1725885727' });
  });

  it('matches a "You have" line to its stat still written "Players have"', async () => {
    const { stats } = await tradeOf('flicker-strike-slayer-3.30.txt', 'Unique Belt — Screams of the Desiccated');
    // Echoing Shrine Buff, the mod Screams of the Desiccated rolls at random
    expect(stats).toEqual([{ type: 'and', filters: [{ id: 'explicit.stat_1941745370' }] }]);
  });

  it('matches a granted skill POB writes with a trailing "Skill"', async () => {
    // Pandemonium Palm: "Grants Level 30 Aspect of the Cat Skill" is the stat "Grants Level # Aspect of the Cat"
    const { stats } = await tradeOf('flicker-strike-slayer-3.30.txt', 'Gloves — Pandemonium Palm');
    expect(stats).toContainEqual(
      expect.objectContaining({
        filters: expect.arrayContaining([{ id: 'explicit.effect_771254875', value: { min: 24 } }]),
      }),
    );
    expect((await toExportString(await fixture('flicker-strike-slayer-3.30.txt'))).unmatched).toEqual([]);
  });
});

describe('Disabled Filters for item properties', () => {
  it('adds item level, sockets, links, defences and influences of a rare, all disabled', async () => {
    const query = await tradeOf('righteous-fire-chieftain-3.30.txt', 'Helmet — Foe Corona');
    expect(query.filters.misc_filters).toEqual({ disabled: true, filters: { ilvl: { min: 82 } } });
    expect(query.filters.socket_filters).toEqual({
      disabled: true,
      filters: { sockets: { min: 4 }, links: { min: 4 } },
    });
    expect(query.filters.armour_filters).toEqual({ disabled: true, filters: { ar: { min: 773 } } });
    expect(query.stats[0].filters).toContainEqual({ id: 'pseudo.pseudo_has_elder_influence', disabled: true });
  });

  it('adds every defence and the Eldritch influences', async () => {
    const query = await tradeOf('elemental-hit-slayer-3.30.txt', 'Helmet — Eagle Glance');
    expect(query.filters.armour_filters).toEqual({ disabled: true, filters: { ar: { min: 562 }, ev: { min: 482 } } });
    expect(query.filters.misc_filters).toEqual({
      disabled: true,
      filters: { ilvl: { min: 85 }, searing_item: { option: 'true' }, tangled_item: { option: 'true' } },
    });
    const and = query.stats.filter((group: any) => group.type === 'and');
    expect(and).toHaveLength(1);
    // The totals, and the ring's implicit that is required on its own
    for (const { id } of and[0].filters) expect(id).toMatch(/^(pseudo\.pseudo_total_|implicit\.)/);
  });

  it('counts links within socket groups and leaves out abyss sockets', async () => {
    const query = await tradeOf('righteous-fire-chieftain-3.30.txt', 'Boots — Torment March');
    expect(query.filters.socket_filters).toEqual({
      disabled: true,
      filters: { sockets: { min: 3 }, links: { min: 3 } },
    });
  });

  it('adds the corrupted state', async () => {
    const query = await tradeOf('ice-trap-assasin-3.30.txt', 'Jewel — Viper Eye');
    expect(query.filters.misc_filters).toEqual({
      disabled: true,
      filters: { ilvl: { min: 1 }, corrupted: { option: 'true' } },
    });
  });

  it('leaves out properties the item does not have', async () => {
    const query = await tradeOf('righteous-fire-chieftain-3.30.txt', 'Ring 1 — Hypnotic Circle');
    expect(query.filters.misc_filters).toEqual({ disabled: true, filters: { ilvl: { min: 30 } } });
    expect(query.filters.socket_filters).toBeUndefined();
    expect(query.filters.armour_filters).toBeUndefined();
    const and = query.stats.filter((group: any) => group.type === 'and');
    expect(and).toHaveLength(1);
    // The totals, and the ring's implicit that is required on its own
    for (const { id } of and[0].filters) expect(id).toMatch(/^(pseudo\.pseudo_total_|implicit\.)/);
  });

  it('adds none to uniques', async () => {
    const query = await tradeOf('righteous-fire-chieftain-3.30.txt', "Unique Body Armour — Kaom's Heart");
    expect(query.filters).toBeUndefined();
  });
});

describe('Item level filter', () => {
  const ilvlOf = async (itemText: string) => {
    const { filters } = (await singleItem(itemText)).trades[0]!.query;
    return { disabled: filters?.misc_filters?.disabled, ilvl: filters?.misc_filters?.filters.ilvl };
  };

  it("asks for the highest Tier level among a gear item's rolls, bench Tiers included, ignoring PoB's item level", async () => {
    // Tiers on a Leather Belt: 44% fire resistance is level 72, 50 Strength 74, a crafted 45 life 81 (an explicit
    // 45 life would be level 18)
    expect(
      await ilvlOf(`Rarity: RARE\nDoom Cord\nLeather Belt\nItem Level: 60\nImplicits: 0
+44% to Fire Resistance\n+50 to Strength\n{crafted}+45 to maximum Life`),
    ).toEqual({ disabled: true, ilvl: { min: 81 } });
  });

  it('skips a roll above every Tier, as a pure and a hybrid mod summed into one line', async () => {
    expect(
      await ilvlOf(`Rarity: RARE\nDoom Cord\nLeather Belt\nItem Level: 60\nImplicits: 0
+44% to Fire Resistance\n+300 to maximum Life`),
    ).toEqual({ disabled: true, ilvl: { min: 72 } });
  });

  it("falls back to PoB's item level when no roll has a Tier", async () => {
    expect(await ilvlOf('Rarity: RARE\nDoom Cord\nLeather Belt\nItem Level: 70\nImplicits: 0')).toEqual({
      disabled: true,
      ilvl: { min: 70 },
    });
  });

  it.each([
    ['1 Added Passive Skill is Martial Mastery', { min: 50, max: 67 }],
    ['1 Added Passive Skill is Master of Fire', { min: 75, max: 83 }],
    ['Added Small Passive Skills also grant: 3% increased Attack Speed', { min: 84 }],
  ])('gives a cluster jewel with "%s" a range up to the next level that unlocks more', async (line, ilvl) => {
    expect(
      await ilvlOf(`Rarity: RARE\nOblivion Stone\nLarge Cluster Jewel\nItem Level: 84\nImplicits: 0\n${line}`),
    ).toEqual({ disabled: true, ilvl });
  });
});

describe('Duplicate Trades', () => {
  it('keeps one Trade for items with the same mods and different rolls or names', async () => {
    const ring = (name: string, life: number) =>
      `Rarity: RARE\n${name}\nCoral Ring\nItem Level: 80\nImplicits: 0\n${life}% increased maximum Life`;
    const xml = `<PathOfBuilding><Build className="Witch" level="90"/><Items activeItemSet="1">
      <Item id="1">${ring('Doom Eye', 5)}</Item><Item id="2">${ring('Gloom Eye', 7)}</Item>
      <ItemSet id="1"><Slot name="Ring 1" itemId="1"/><Slot name="Ring 2" itemId="2"/></ItemSet></Items></PathOfBuilding>`;
    const { trades } = decodeExportString((await toExportString(deflateSync(xml).toString('base64url'))).exportString);
    expect(trades.map(trade => trade.title)).toEqual(['Ring 1 — Doom Eye']);
  });
});

describe('Weapon swap', () => {
  it('adds the swap weapons as Trades titled with their swap slot', async () => {
    const titles = (await folderOf('elemental-hit-slayer-3.30.txt')).trades.map(trade => trade.title);
    expect(titles).toContain('Weapon 1 Swap — Dusk Sever');
    expect(titles).toContain('Weapon 2 Swap — Corpse Beak');
  });

  it('searches a swap weapon like any other weapon', async () => {
    const query = await tradeOf('kinetic-blast-warden-3.30.txt', 'Weapon 1 Swap — Grove Bow');
    expect(query.filters.type_filters.filters.category).toEqual({ option: 'weapon.bow' });
  });
});

describe('Stat Filters', () => {
  it('turns an explicit mod into a count group that is on over all its type variants', async () => {
    const { stats } = await tradeOf('righteous-fire-chieftain-3.30.txt', 'Helmet — Foe Corona', { weightedSum: false });
    expect(stats).toContainEqual({
      type: 'count',
      value: { min: 1 },
      disabled: false,
      filters: ['explicit', 'implicit', 'fractured', 'crafted'].map(type => ({
        id: `${type}.stat_3325883026`,
        value: { min: 8 },
      })),
    });
  });

  it('switches both implicit and explicit groups on, with the weighted sum off', async () => {
    const { stats } = await tradeOf('righteous-fire-chieftain-3.30.txt', 'Ring 1 — Hypnotic Circle', {
      weightedSum: false,
    });
    const group = (id: string) => stats.find((group: any) => group.filters.some((filter: any) => filter.id === id));
    // The implicit is a plain filter of the and group, switched on; the explicit alternatives are a count group, on
    expect(group('implicit.stat_3182714256')?.type).toBe('and');
    expect(stats[0].filters.find((filter: any) => filter.id === 'implicit.stat_3182714256').disabled).toBeUndefined();
    expect(group('explicit.stat_3988349707')?.disabled).toBe(false);
  });

  it('matches a two-line cluster jewel enchant as one option filter', async () => {
    const { stats } = await tradeOf(
      'ice-trap-assasin-3.30.txt',
      'Medium Cluster — Plague Essence (Trap And Mine Damage)',
    );
    expect(stats).toContainEqual(
      expect.objectContaining({
        type: 'and',
        filters: expect.arrayContaining([{ id: CLUSTER_ENCHANT, value: { option: expect.any(Number) } }]),
      }),
    );
  });

  it('leaves uniques without Stat Filters', async () => {
    expect(
      (await tradeOf('righteous-fire-chieftain-3.30.txt', "Unique Body Armour — Kaom's Heart")).stats,
    ).toBeUndefined();
  });
});

describe('Aggregate Jewel Trade', () => {
  const TITLE = 'Jewels — combined';
  /** A build with the given tree jewels, each a [name, base, rarity, mod lines] */
  const jewelBuild = (jewels: [string, string, string, string[]][], extra = '') => {
    const items = jewels
      .map(
        ([name, base, rarity, mods], i) =>
          `<Item id="${i + 1}">Rarity: ${rarity}\n${name}\n${base}\nImplicits: 0\n${mods.join('\n')}</Item>`,
      )
      .join('');
    const sockets = jewels.map((_, i) => `<Socket nodeId="${i + 1}" itemId="${i + 1}"/>`).join('');
    const nodes = jewels.map((_, i) => i + 1).join(',');
    const xml = `<PathOfBuilding><Build className="Witch" level="90"/><Items activeItemSet="1">${items}<ItemSet id="1"/></Items>
      <Tree activeSpec="1"><Spec nodes="${nodes}"><Sockets>${sockets}</Sockets></Spec></Tree>${extra}</PathOfBuilding>`;
    return deflateSync(xml).toString('base64url');
  };
  const aggregate = async (code: string) =>
    decodeExportString((await toExportString(code)).exportString).trades.filter(trade => trade.title === TITLE);
  const ids = (group: any) => group.filters.map((filter: any) => filter.id);

  const LIFE = '5% increased maximum Life';
  const CRIT = '+15% to Critical Strike Multiplier with Elemental Skills';
  const SPEED = '4% increased Attack Speed';
  const RES = '+15% to Lightning Resistance';
  const base = (name: string, mods: string[]): [string, string, string, string[]] => [
    name,
    'Viridian Jewel',
    'RARE',
    mods,
  ];

  it('adds one Trade with the deduplicated mod union as a single count group without values', async () => {
    const [trade, ...rest] = await aggregate(jewelBuild([base('A', [LIFE, CRIT]), base('B', [CRIT, SPEED, RES])]));
    expect(rest).toEqual([]);
    expect(trade!.query.status).toEqual({ option: 'securable' });
    expect(trade!.query.filters).toEqual({ type_filters: { filters: { category: { option: 'jewel.base' } } } });
    const [group, ...others] = trade!.query.stats;
    expect(others.map((other: any) => other.type)).toEqual(['weight']);
    expect(group.type).toBe('count');
    // Each distinct mod in its explicit and fractured variants, and as an implicit where a jewel can have it (attack
    // speed and lightning resistance are Synthesis implicits), with no value
    const pool = modPool('Viridian Jewel')!;
    const expected = [...new Set([LIFE, CRIT, SPEED, RES].flatMap(line => matchMod(line)!.ids))].filter(
      id => /^(explicit|fractured)\./.test(id) || (id.startsWith('implicit.') && inPool(pool, id)),
    );
    expect(group.filters).toEqual(expected.map(id => ({ id })));
    expect(ids(group)).toContain('implicit.stat_681332047');
  });

  it('adds the implicit variant only of the mods a corrupted jewel can have as an implicit', async () => {
    const HINDER = 'You cannot be Hindered';
    const [trade] = await aggregate(jewelBuild([base('A', [LIFE, HINDER])]));
    const implicits = ids(trade!.query.stats[0]).filter((id: string) => id.startsWith('implicit.'));
    // Hindered is a corruption implicit; the Life of this jewel can only be explicit
    expect(implicits).toEqual(matchMod(HINDER)!.ids.filter(id => id.startsWith('implicit.')));
    expect(matchMod(LIFE)!.ids.some(id => id.startsWith('implicit.'))).toBe(true);
  });

  it('searches an immunity, which no jewel has but through corruption, by its implicit variant alone', async () => {
    const [trade] = await aggregate(
      jewelBuild([base('A', [LIFE, 'Corrupted Blood cannot be inflicted on you', 'You cannot be Hindered'])]),
    );
    expect(ids(trade!.query.stats[0]).filter((id: string) => /stat_(1658498488|721014846)$/.test(id))).toEqual([
      'implicit.stat_1658498488',
      'implicit.stat_721014846',
    ]);
  });

  it('adds a weight group of the explicit mods, worth the most valuable jewel', async () => {
    const [trade] = await aggregate(jewelBuild([base('A', [LIFE]), base('B', [LIFE, CRIT])]));
    const weight = trade!.query.stats.find((group: any) => group.type === 'weight');
    // Without the implicit variants, each weighed 100 / its largest roll on the jewel: Life 7%, the multiplier 15%
    const weights = [
      [LIFE, 14.29],
      [CRIT, 6.67],
    ] as const;
    expect(weight.filters).toEqual(
      weights.flatMap(([line, weight]) =>
        matchMod(line)!
          .ids.filter(id => /^(explicit|fractured)\./.test(id))
          .map(id => ({ id, value: { weight } })),
      ),
    );
    // B's values, at 80%: 5 * 14.29 + 15 * 6.67
    expect(weight.value).toEqual({ min: 137.2 });
  });

  it('weighs a stat alike on every jewel, by its largest roll on any base jewel', async () => {
    // Trap Throwing Speed rolls up to 22% on a Cobalt Jewel, 8% on a Viridian one: 100 / 22 for both
    const TRAP = '6% increased Trap Throwing Speed';
    const code = jewelBuild([base('A', [TRAP]), ['B', 'Cobalt Jewel', 'RARE', [TRAP]]]);
    const [trade] = await aggregate(code);
    const weight = trade!.query.stats.find((group: any) => group.type === 'weight');
    expect(weight.filters.map((filter: any) => filter.value.weight)).toEqual(Array(weight.filters.length).fill(4.55));
    expect(weight.value).toEqual({ min: 21.84 });
  });

  it('leaves the weight group out with the weighted sum off', async () => {
    const code = jewelBuild([base('A', [LIFE, CRIT])]);
    const [trade] = decodeExportString((await toExportString(code, { weightedSum: false })).exportString).trades.filter(
      trade => trade.title === TITLE,
    );
    expect(trade!.query.stats.map((group: any) => group.type)).toEqual(['count']);
  });

  it('takes min from the most matched mods on one jewel, clamped to 2-4', async () => {
    const min = async (mods: string[]) => (await aggregate(jewelBuild([base('A', mods)])))[0]!.query.stats[0].value.min;
    expect(await min([LIFE])).toBe(2);
    expect(await min([LIFE, CRIT, SPEED])).toBe(3);
    expect(await min([LIFE, CRIT, SPEED, RES, '+7% to Fire Damage over Time Multiplier'])).toBe(4);
  });

  it('does not count a mod that has no explicit, fractured or implicit variant', async () => {
    const enchantOnly = '10% chance to Blind Enemies on Hit with Spells';
    expect(matchMod(enchantOnly)!.ids.every(id => id.startsWith('enchant.'))).toBe(true);
    const [trade] = await aggregate(jewelBuild([base('A', [LIFE, CRIT, SPEED, enchantOnly])]));
    expect(trade!.query.stats[0].value.min).toBe(3);
  });

  it('counts only matched mods', async () => {
    const [trade] = await aggregate(jewelBuild([base('A', [LIFE, CRIT, SPEED, 'Not a real mod line'])]));
    expect(trade!.query.stats[0].value.min).toBe(3);
  });

  it('is built from base jewels only', async () => {
    const build = jewelBuild([
      base('A', [LIFE]),
      ['Combat Focus', 'Viridian Jewel', 'UNIQUE', [SPEED]],
      ['Viper Spark', 'Large Cluster Jewel', 'RARE', [RES]],
      ['Grim Thirst', 'Searching Eye Jewel', 'RARE', ['3% increased Attack Speed']],
      ['Glorious Vanity', 'Timeless Jewel', 'UNIQUE', ['Historic']],
    ]);
    const [trade] = await aggregate(build);
    // Same mods as the lone base jewel A: the other four jewels add nothing
    expect(trade!.query.stats[0].filters).toEqual(
      (await aggregate(jewelBuild([base('A', [LIFE])])))[0]!.query.stats[0].filters,
    );
  });

  it('is left out when the build has no base jewels', async () => {
    expect(await aggregate(jewelBuild([['Viper Spark', 'Large Cluster Jewel', 'RARE', [RES]]]))).toEqual([]);
    expect(await aggregate(jewelBuild([]))).toEqual([]);
    expect(await aggregate(await fixture('kinetic-blast-warden-3.30.txt'))).toEqual([]);
  });

  it('sits after the per-jewel Trades', async () => {
    const titles = (await folderOf('righteous-fire-chieftain-3.30.txt')).trades.map(trade => trade.title);
    const lastJewel = titles.findLastIndex(title => /^(Unique )?Jewel — /.test(title));
    expect(titles.indexOf(TITLE)).toBe(lastJewel + 1);
  });
});

describe('Pseudo totals', () => {
  const ids = (stats: any[]) => stats.flatMap((group: any) => group.filters.map((filter: any) => filter.id));

  it('folds life and resistances into an and group that is on', async () => {
    const { stats } = await tradeOf('righteous-fire-chieftain-3.30.txt', 'Gloves — Honour Mitts');
    expect(stats[0]).toEqual({
      type: 'and',
      filters: [
        { id: 'pseudo.pseudo_total_life', value: { min: 97 } },
        { id: 'pseudo.pseudo_total_fire_resistance', value: { min: 37 } },
        { id: 'pseudo.pseudo_total_chaos_resistance', value: { min: 23 } },
        { id: 'pseudo.pseudo_total_elemental_resistance', value: { min: 37 }, disabled: true },
      ],
    });
  });

  it('does not search a folded mod on its own', async () => {
    const { stats } = await tradeOf('righteous-fire-chieftain-3.30.txt', 'Gloves — Honour Mitts');
    for (const stat of ['stat_3299347043', 'stat_3372524247', 'stat_2923486259']) {
      expect(ids(stats).filter(id => id.endsWith(stat))).toEqual([]);
    }
  });

  it('splits hybrid attributes into each attribute total', async () => {
    const { stats } = await tradeOf('righteous-fire-chieftain-3.30.txt', 'Boots Abyssal Socket 1 — Whispering Stare');
    expect(stats[0].filters).toEqual([
      { id: 'pseudo.pseudo_total_life', value: { min: 29 } },
      { id: 'pseudo.pseudo_total_dexterity', value: { min: 8 } },
      { id: 'pseudo.pseudo_total_intelligence', value: { min: 8 } },
      // Suggested: an abyss jewel can carry them
      { id: 'pseudo.pseudo_total_elemental_resistance', disabled: true },
      { id: 'pseudo.pseudo_total_chaos_resistance', disabled: true },
    ]);
  });

  it('keeps influences in the same and group, disabled, next to the totals that are on', async () => {
    const { stats } = await tradeOf('righteous-fire-chieftain-3.30.txt', 'Helmet — Foe Corona');
    expect(stats.filter((group: any) => group.type === 'and')).toEqual([
      {
        type: 'and',
        filters: [
          { id: 'pseudo.pseudo_total_life', value: { min: 113 } },
          { id: 'pseudo.pseudo_total_elemental_resistance', disabled: true },
          { id: 'pseudo.pseudo_total_chaos_resistance', disabled: true },
          { id: 'pseudo.pseudo_has_elder_influence', disabled: true },
          // A mod of a single stat is a filter of the group too, off like its count group: the weight group covers it
          { id: 'explicit.effect_1200122555', value: { min: 16 }, disabled: true },
        ],
      },
    ]);
  });
});

describe('Weight Group', () => {
  it('weighs every explicit mod not folded into pseudo, in all its variants', async () => {
    const { stats } = await tradeOf('righteous-fire-chieftain-3.30.txt', 'Amulet — Corruption Rosary');
    const weight = stats.at(-1);
    expect(weight.type).toBe('weight');
    // An amulet cannot have it as an implicit or enchant: those variants are left out. It rolls up to 26%
    expect(weight.filters.filter((filter: any) => filter.id.endsWith('stat_3988349707'))).toEqual(
      ['explicit', 'fractured'].map(type => ({ id: `${type}.stat_3988349707`, value: { weight: 3.85 } })),
    );
  });

  it('leaves out implicits and mods without a value', async () => {
    const { stats } = await tradeOf('righteous-fire-chieftain-3.30.txt', 'Ring 1 — Hypnotic Circle');
    const weight = stats.find((group: any) => group.type === 'weight');
    expect(JSON.stringify(weight)).not.toMatch(/implicit\.stat_3182714256|stat_1050105434/);
  });
});

describe('Weighted sum', () => {
  /** The stat groups of a rare Coral Ring with these mod lines */
  const ring = async (lines: string[], options?: ImportOptions, base = 'Coral Ring') =>
    (await singleItem(`Rarity: RARE\nDoom Eye\n${base}\nItem Level: 80\nImplicits: 0\n${lines.join('\n')}`, options))
      .trades[0]!.query.stats as any[];
  const weightGroup = (stats: any[]) => stats.find(group => group.type === 'weight');
  const weightOf = (stats: any[], id: string) =>
    weightGroup(stats).filters.find((filter: any) => filter.id === id)?.value.weight;
  const filtersOf = (stats: any[], stat: string) =>
    stats.flatMap(group => group.filters.map((filter: any) => ({ ...filter, group }))).filter(f => f.id.endsWith(stat));
  const MANA_REGEN = '12% increased Mana Regeneration Rate';

  it('weighs a mod by 100 / its largest roll on the base', async () => {
    const stats = await ring([MANA_REGEN]);
    // Mana Regeneration Rate rolls up to 76% on a ring: 100 / 76
    expect(weightGroup(stats).filters).toContainEqual({ id: 'explicit.stat_789117908', value: { weight: 1.32 } });
    expect(weightGroup(stats).value).toEqual({ min: 12.67 });
  });

  it('weighs the broadest pseudo totals, attributes each apart', async () => {
    const stats = await ring([
      '+13% to Fire Resistance',
      '+10% to Cold Resistance',
      '+20 to maximum Life',
      '+10 to Strength',
      '+5 to all Attributes',
    ]);
    // Resistances roll up to 48%, Life to 114 and attributes to 58 on a ring
    expect(weightOf(stats, 'pseudo.pseudo_total_elemental_resistance')).toBe(2.08);
    expect(weightOf(stats, 'pseudo.pseudo_total_life')).toBe(0.88);
    for (const attribute of ['strength', 'dexterity', 'intelligence']) {
      expect(weightOf(stats, `pseudo.pseudo_total_${attribute}`)).toBe(1.72);
    }
    expect(weightOf(stats, 'pseudo.pseudo_total_fire_resistance')).toBeUndefined();
    expect(JSON.stringify(weightGroup(stats))).not.toMatch(/explicit\./);
    // 80% of 23 * 2.08 + (20 + 15 / 2) * 0.88 + (15 + 5 + 5) * 1.72: the site's total Life counts Strength / 2
    expect(weightGroup(stats).value).toEqual({ min: 92.03 });
  });

  it('leaves the weight group out when nothing the build item has is weighed', async () => {
    expect(weightGroup(await ring(['Cannot be Frozen']))).toBeUndefined();
  });

  it('keeps per-element totals in the and group, with a disabled total elemental resistance', async () => {
    const [and] = await ring(['+13% to Fire Resistance', '+10% to Cold Resistance']);
    expect(and.type).toBe('and');
    expect(and.filters).toEqual(
      expect.arrayContaining([
        { id: 'pseudo.pseudo_total_fire_resistance', value: { min: 10 } },
        { id: 'pseudo.pseudo_total_cold_resistance', value: { min: 8 } },
        { id: 'pseudo.pseudo_total_elemental_resistance', value: { min: 18 }, disabled: true },
      ]),
    );
  });

  it('suggests the totals the base can carry and the item lacks: disabled, weighed, not raising the minimum', async () => {
    const stats = await ring(['+13% to Fire Resistance']);
    expect(stats[0].filters).toEqual(
      expect.arrayContaining([
        { id: 'pseudo.pseudo_total_life', disabled: true },
        { id: 'pseudo.pseudo_total_chaos_resistance', disabled: true },
      ]),
    );
    expect(weightOf(stats, 'pseudo.pseudo_total_life')).toBe(0.88);
    expect(weightOf(stats, 'pseudo.pseudo_total_chaos_resistance')).toBe(2.86);
    // 80% of the fire resistance alone: 13 * 2.08
    expect(weightGroup(stats).value).toEqual({ min: 21.63 });
  });

  it('suggests no total the base can never carry', async () => {
    // A jewel rolls no flat Life
    const stats = await ring(['+13% to Fire Resistance'], undefined, 'Cobalt Jewel');
    expect(filtersOf(stats, 'pseudo_total_life')).toEqual([]);
    expect(filtersOf(stats, 'pseudo_total_chaos_resistance')).not.toEqual([]);
  });

  it('switches the weight group on and the groups of the weighed mods off by default', async () => {
    const stats = await ring([MANA_REGEN, '+13% to Fire Resistance', 'Cannot be Frozen']);
    expect(weightGroup(stats).disabled).toBeUndefined();
    const mana = filtersOf(stats, 'stat_789117908').filter(f => f.group.type !== 'weight');
    expect(mana.length).toBeGreaterThan(0);
    expect(mana.every(f => f.disabled || f.group.disabled)).toBe(true);
    // Pseudo totals stay on, and so does a mod the weight group does not cover
    expect(filtersOf(stats, 'pseudo_total_fire_resistance')[0].disabled).toBeUndefined();
    const frozen = filtersOf(stats, matchMod('Cannot be Frozen')!.ids[0]!.split('.')[1]!);
    expect(frozen.some(f => !f.disabled && !f.group.disabled)).toBe(true);
  });

  it('with the weighted sum off, switches the per-mod groups on and leaves the weight group out', async () => {
    const stats = await ring([MANA_REGEN, '+13% to Fire Resistance'], { weightedSum: false });
    expect(weightGroup(stats)).toBeUndefined();
    const mana = filtersOf(stats, 'stat_789117908');
    expect(mana.every(f => !f.disabled && !f.group.disabled)).toBe(true);
    expect(filtersOf(stats, 'pseudo_total_fire_resistance')[0].disabled).toBeUndefined();
  });

  it('keeps cluster jewel enchants on in either mode', async () => {
    for (const weightedSum of [true, false]) {
      const { stats } = (
        await singleItem(
          `Rarity: RARE\nOblivion Stone\nLarge Cluster Jewel\nCluster Jewel Skill: affliction_axe_and_sword_damage\nItem Level: 84\nImplicits: 1\n{crafted}Adds 12 Passive Skills\nAdded Small Passive Skills also grant: +2 to Dexterity`,
          { weightedSum },
        )
      ).trades[0]!.query;
      expect(filtersOf(stats, 'stat_3086156145')).toEqual([
        expect.objectContaining({ id: 'enchant.stat_3086156145', value: { min: 12 } }),
      ]);
      expect(filtersOf(stats, 'stat_3086156145')[0].disabled).toBeUndefined();
    }
  });

  it('weighs every stat 1 on a base missing from the Mod Pools, suggesting nothing', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const stats = await ring([MANA_REGEN, '+13% to Fire Resistance'], undefined, 'Unheard Ring');
    warn.mockRestore();
    expect(weightGroup(stats).filters.every((filter: any) => filter.value.weight === 1)).toBe(true);
    expect(weightGroup(stats).value).toEqual({ min: 20 });
    expect(stats[0].filters.filter((filter: any) => filter.disabled)).toEqual([
      { id: 'pseudo.pseudo_total_elemental_resistance', value: { min: 10 }, disabled: true },
    ]);
  });
});

describe('Roll Floor', () => {
  const RING = `Rarity: RARE\nDoom Eye\nCoral Ring\nItem Level: 80\nImplicits: 0\n+13% to Fire Resistance\n12% increased Mana Regeneration Rate`;
  const CLUSTER = `Rarity: RARE\nOblivion Stone\nLarge Cluster Jewel\nCluster Jewel Skill: affliction_axe_and_sword_damage\nItem Level: 84\nImplicits: 2\n{crafted}Adds 8 Passive Skills\n{crafted}2 Added Passive Skills are Jewel Sockets\nAdded Small Passive Skills also grant: +2 to Dexterity`;
  const MODES: RollFloor[] = [{ kind: 'exact' }, { kind: 'percent', percent: 50 }, { kind: 'none' }];
  /** The minima of the fire resistance total, the mana regeneration roll and the weight group of a rare ring */
  const minima = async (rollFloor?: RollFloor) => {
    const stats = (await singleItem(RING, { rollFloor })).trades[0]!.query.stats as any[];
    const filters = stats.flatMap(group => group.filters);
    return {
      total: filters.find((f: any) => f.id === 'pseudo.pseudo_total_fire_resistance').value,
      roll: filters.find((f: any) => f.id === 'explicit.stat_789117908' && !f.value?.weight).value,
      weight: stats.find(group => group.type === 'weight').value,
    };
  };

  it.each([
    // 13 * 2.08 + 12 * 1.32
    [{ kind: 'exact' }, { total: { min: 13 }, roll: { min: 12 }, weight: { min: 42.88 } }],
    [
      { kind: 'percent', percent: 50 },
      { total: { min: 6 }, roll: { min: 6 }, weight: { min: 21.44 } },
    ],
    [{ kind: 'none' }, { total: undefined, roll: undefined, weight: undefined }],
  ] as [RollFloor, object][])(
    'sets the minima of rolls, totals and the weight group in %j',
    async (rollFloor, expected) => {
      expect(await minima(rollFloor)).toEqual(expected);
    },
  );

  it('defaults to 80% of the roll', async () => {
    expect(await minima()).toEqual(await minima({ kind: 'percent', percent: 80 }));
    const name = 'righteous-fire-chieftain-3.30.txt';
    expect(await folderOf(name)).toEqual(await folderOf(name, { rollFloor: { kind: 'percent', percent: 80 } }));
  });

  it.each(MODES)('keeps enchants exact and the cluster passive count in %j', async rollFloor => {
    const stats = (await singleItem(CLUSTER, { rollFloor })).trades[0]!.query.stats as any[];
    const enchants = stats.flatMap(group => group.filters).filter((f: any) => f.id.startsWith('enchant.'));
    expect(enchants).toEqual(
      expect.arrayContaining([
        { id: 'enchant.stat_3086156145', value: { max: 8 } },
        { id: 'enchant.stat_4079888060', value: { min: 2 } },
      ]),
    );
  });

  it.each(MODES)('applies to the mods of a unique in %j', async rollFloor => {
    const exact = rollFloor.kind === 'none' ? undefined : expect.objectContaining({ min: expect.any(Number) });
    const { stats } = await tradeOf('ice-trap-assasin-3.30.txt', "Unique Ring — Foulborn Romira's Banquet", {
      rollFloor,
    });
    for (const filter of stats[0].filters) expect(filter.value).toEqual(exact);
  });
});
