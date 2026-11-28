import { toExportString } from './index';
import { buildGame } from './build';
import { decodeExportString, fixture } from './test-utils';
import { describe, expect, it } from 'vitest';

const TWISTER = 'twister-gemling-legionnaire-0.55.txt';

const importOf = async (name: string) => {
  const { exportStrings, unmatched } = await toExportString(await fixture(name, 'poe2'));
  return { folder: decodeExportString(exportStrings[0]!), unmatched };
};

describe(TWISTER, () => {
  it('builds one PoE 2 Folder, without an icon, of Trades on the PoE 2 trade site', async () => {
    // decodeExportString checks that every Trade's location has the Folder's Game Version
    const { title, icon, version, trades } = (await importOf(TWISTER)).folder;
    expect({ title, icon, version }).toEqual({ title: 'Twister', icon: null, version: '2' });
    expect(trades.length).toBeGreaterThan(0);
  });

  it('searches a rare by its PoE 2 base type', async () => {
    const { trades } = (await importOf(TWISTER)).folder;
    expect(trades.find(trade => trade.title.endsWith('Weapon 1 — Dread Edge'))?.query.type).toBe('Forked Spear');
  });

  it('matches mod lines to PoE 2 trade stats', async () => {
    const { trades } = (await importOf(TWISTER)).folder;
    const shield = trades.find(trade => trade.title.endsWith('Weapon 2 — Onslaught Sanctuary'));
    // "+32 to maximum Life" folds into the total life of the weight group
    expect(JSON.stringify(shield?.query.stats)).toContain('pseudo.pseudo_total_life');
    expect(shield?.query).toMatchSnapshot();
  });

  it('has one Trade per distinct Build Item', async () => {
    expect((await importOf(TWISTER)).folder.trades.map(trade => trade.title)).toMatchSnapshot();
  });

  it('reports the mod lines it could not match', async () => {
    expect((await importOf(TWISTER)).unmatched).toMatchSnapshot();
  });
});

describe('buildGame', () => {
  it("tells a Path of Building 2 Build Code from a Path of Building one, so only its game's data is loaded", async () => {
    expect(await buildGame(await fixture(TWISTER, 'poe2'))).toBe('2');
    expect(await buildGame(await fixture('righteous-fire-chieftain-3.30.txt'))).toBe('1');
  });
});
