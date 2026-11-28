/* eslint-disable @typescript-eslint/no-explicit-any */
import { toExportString } from './index';
import { buildGame } from './build';
import { decodeExportString, fixture } from './test-utils';
import { describe, expect, it } from 'vitest';
import { deflateSync } from 'node:zlib';
import type { ImportOptions } from './index';

const TWISTER = 'twister-gemling-legionnaire-0.55.txt';
const COMET = 'comet-oracle-0.55.txt';
const ICE_SHOT = 'ice-shot-deadeye-0.55.txt';
const FIXTURES = [TWISTER, COMET, ICE_SHOT];

const importOf = async (name: string, options?: ImportOptions) => {
  const { exportStrings, unmatched } = await toExportString(await fixture(name, 'poe2'), options);
  return { folder: decodeExportString(exportStrings[0]!), unmatched };
};
const tradeOf = async (name: string, title: string, options?: ImportOptions) => {
  const trade = (await importOf(name, options)).folder.trades.find(trade => trade.title.endsWith(title));
  if (!trade) throw new Error(`No Trade "${title}" in ${name}`);
  return trade.query;
};

/** A PoE 2 Folder of one Build Item made from POB 2 item text, in the given slot */
const singleItem = async (itemText: string, slot = 'Belt', options?: ImportOptions) => {
  const xml = `<PathOfBuilding2><Build className="Witch" level="90"/><Items activeItemSet="1"><Item id="1">${itemText}</Item>
    <ItemSet id="1"><Slot name="${slot}" itemId="1"/></ItemSet></Items></PathOfBuilding2>`;
  return decodeExportString((await toExportString(deflateSync(xml).toString('base64url'), options)).exportStrings[0]!);
};
const idsOf = (query: any): string[] =>
  (query.stats ?? []).flatMap((group: any) => group.filters.map((filter: any) => filter.id));

describe(TWISTER, () => {
  it('builds one PoE 2 Folder, with the ascendancy icon, of Trades on the PoE 2 trade site', async () => {
    // decodeExportString checks that every Trade's location has the Folder's Game Version
    const { title, icon, version, trades } = (await importOf(TWISTER)).folder;
    expect({ title, icon, version }).toEqual({ title: 'Twister', icon: 'poe2-gemling-legionnaire', version: '2' });
    expect(trades.length).toBeGreaterThan(0);
  });

  it('searches a rare by its PoE 2 base type', async () => {
    expect((await tradeOf(TWISTER, 'Weapon 1 — Dread Edge')).type).toBe('Forked Spear');
  });

  it('searches a unique by its name, with its base type when several bases share the name', async () => {
    const { trades } = (await importOf(TWISTER)).folder;
    const query = (title: string) => trades.find(trade => trade.title.endsWith(title))?.query;
    // Atziri's Step is also sold on Runemastered Cinched Boots; Headhunter on Heavy Belt only
    expect(query("Unique Boots — Atziri's Step")).toMatchObject({ name: "Atziri's Step", type: 'Cinched Boots' });
    expect(query('Unique Belt — Headhunter')).toMatchObject({ name: 'Headhunter' });
    expect(query('Unique Belt — Headhunter')).not.toHaveProperty('type');
  });

  it('matches mod lines to PoE 2 trade stats', async () => {
    const shield = await tradeOf(TWISTER, 'Weapon 2 — Onslaught Sanctuary');
    // "+32 to maximum Life" folds into the total life of the weight group
    expect(JSON.stringify(shield.stats)).toContain('pseudo.pseudo_total_life');
    expect(shield).toMatchSnapshot();
  });
});

describe.each(FIXTURES)('%s', name => {
  it('has one Trade per distinct Build Item', async () => {
    expect((await importOf(name)).folder.trades.map(trade => trade.title)).toMatchSnapshot();
  });

  it('matches every mod line', async () => {
    expect((await importOf(name)).unmatched).toEqual([]);
  });

  it('searches every non-unique in a trade category and every unique by name', async () => {
    const { trades } = (await importOf(name, { skipEarlierLoadouts: false })).folder;
    for (const { title, query } of trades) {
      if (/ — Unique /.test(` — ${title.split(' — ').slice(-2, -1)[0]}`)) expect(query.name, title).toBeTruthy();
      else expect(query.filters?.type_filters?.filters.category?.option, title).toBeTruthy();
    }
  });

  it('searches no "Grants Skill" line', async () => {
    const { trades } = (await importOf(name)).folder;
    expect(JSON.stringify(trades)).not.toContain('Grants Skill');
  });
});

describe('PoE 2 Folder icon', () => {
  const iconOf = async (build: string) => {
    const xml = `<PathOfBuilding2>${build}<Items activeItemSet="1"><ItemSet id="1"/></Items></PathOfBuilding2>`;
    return decodeExportString((await toExportString(deflateSync(xml).toString('base64url'))).exportStrings[0]!).icon;
  };

  it.each([
    [COMET, 'poe2-oracle'],
    [ICE_SHOT, 'poe2-deadeye'],
  ])('is the ascendancy of %s', async (name, icon) => {
    expect((await importOf(name)).folder.icon).toBe(icon);
  });

  it('matches the ascendancy name whatever its spacing', async () => {
    expect(await iconOf('<Build className="Mercenary" ascendClassName="Witchhunter" level="90"/>')).toBe(
      'poe2-witch-hunter',
    );
  });

  it('is none without an ascendancy, or for one with no icon', async () => {
    expect(await iconOf('<Build className="Witch" ascendClassName="None" level="1"/>')).toBeNull();
    expect(await iconOf('<Build className="Witch" ascendClassName="Necromancer" level="90"/>')).toBeNull();
  });
});

describe('PoE 2 slots', () => {
  const categoryOf = (query: any) => query.filters?.type_filters?.filters.category?.option;

  it('searches weapon swaps like the weapons', async () => {
    expect(categoryOf(await tradeOf(TWISTER, 'Weapon 1 Swap — Frosted Barbed Spear of Renown'))).toBe('weapon.spear');
    expect(categoryOf(await tradeOf(TWISTER, 'Weapon 1 — Dread Edge'))).toBe('weapon.spear');
  });

  it('searches a buckler as a buckler', async () => {
    expect(categoryOf(await tradeOf(TWISTER, 'Weapon 2 — Onslaught Sanctuary'))).toBe('armour.buckler');
  });

  it('searches charms and flasks by their kind', async () => {
    expect(categoryOf(await tradeOf(TWISTER, 'Charm 1 — Thawing Charm of the Wide'))).toBe('flask.charm');
    expect(categoryOf(await tradeOf(TWISTER, "Flask 1 — Summoner's Gargantuan Life Flask"))).toBe('flask.life');
    expect(categoryOf(await tradeOf(TWISTER, 'Flask 2 — Fermented Gargantuan Mana Flask'))).toBe('flask.mana');
  });

  it('skips arms and legs: Wickerman parts of a PoE 1 league, which the PoE 2 trade site does not list', async () => {
    // COMET has a Caster Arm in "Arm 1" and limbs in every Arm and Leg slot
    const titles = (await importOf(COMET, { skipEarlierLoadouts: false })).folder.trades.map(trade => trade.title);
    expect(titles.filter(title => / — (Arm|Leg) \d — /.test(` — ${title}`))).toEqual([]);
  });

  it('searches a tree jewel as a jewel', async () => {
    expect(categoryOf(await tradeOf(COMET, 'Week 1 (lvl 92) — Jewel — Blight Eye'))).toBe('jewel');
  });

  it('searches a jewel socketed in gear as a jewel', async () => {
    const jewel = await tradeOf(ICE_SHOT, 'Gloves Jewel Socket 1 — Pandemonium Bliss');
    expect(categoryOf(jewel)).toBe('jewel');
  });
});

describe('PoE 2 modifier types', () => {
  it('searches rune lines, Bonded ones too, as rune stats', async () => {
    const ids = idsOf(await tradeOf(TWISTER, 'Weapon 1 — Dread Edge'));
    // "14% increased Physical Damage" of the Lesser Iron Rune, and its Bonded line
    expect(ids.filter(id => id.startsWith('rune.'))).toEqual(['rune.stat_1509134228', 'rune.stat_1039491398']);
    // The weapon's own Physical Damage roll is not searched as a rune
    expect(ids).toContain('explicit.stat_1509134228');
  });

  it('searches a desecrated mod as desecrated, a fractured one as fractured, each also as explicit', async () => {
    const { trades } = await singleItem(
      `Rarity: RARE
Doom Cord
Heavy Belt
Implicits: 1
{enchant}{rune}+12% to Fire Resistance
{desecrated}+40 to maximum Mana
{fractured}+30 to Accuracy Rating`,
      'Belt',
      { weightedSum: false },
    );
    const ids = idsOf(trades[0]!.query);
    expect(ids).toEqual(expect.arrayContaining(['desecrated.stat_1050105434', 'explicit.stat_1050105434']));
    expect(ids).toEqual(expect.arrayContaining(['fractured.stat_803737631', 'explicit.stat_803737631']));
    expect(ids).not.toContain('fractured.stat_1050105434');
    expect(ids).not.toContain('desecrated.stat_803737631');
  });

  it('searches implicit, enchant and crafted mods under their own types', async () => {
    const { trades } = await singleItem(
      `Rarity: RARE
Doom Cord
Heavy Belt
Implicits: 2
{enchant}+10 to Strength
+20% to Cold Resistance
{crafted}+40 to maximum Mana`,
      'Belt',
      { weightedSum: false },
    );
    const ids = idsOf(trades[0]!.query);
    expect(ids).toContain('enchant.stat_4080418644');
    expect(ids).toContain('crafted.stat_1050105434');
  });

  it('reads Twice Corrupted as corrupted, not as a mod', async () => {
    const { query } = (await importOf(TWISTER)).folder.trades.find(trade => trade.title.includes('Beast Edge'))!;
    expect(JSON.stringify(query.filters)).toContain('"corrupted":{"option":"true"}');
  });

  it('searches rune sockets', async () => {
    const query = await tradeOf(ICE_SHOT, 'Weapon 1 — Sorrow Guide');
    expect(query.filters.equipment_filters).toMatchObject({ disabled: true, filters: { rune_sockets: { min: 2 } } });
    expect(query.filters.socket_filters).toBeUndefined();
  });
});

describe('buildGame', () => {
  it("tells a Path of Building 2 Build Code from a Path of Building one, so only its game's data is loaded", async () => {
    expect(await buildGame(await fixture(TWISTER, 'poe2'))).toBe('2');
    expect(await buildGame(await fixture('righteous-fire-chieftain-3.30.txt'))).toBe('1');
  });
});
