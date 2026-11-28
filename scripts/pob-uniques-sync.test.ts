import { fetchSource, merge } from './pob-uniques-sync';
import { expect, test, vi } from 'vitest';

test.each([
  ['poe1', 'SnosMe/awakened-poe-trade'],
  ['poe2', 'Kvan7/Exiled-Exchange-2'],
] as const)("reads %s's unique lines from %s at the given commit", async (game, repo) => {
  const data = `https://raw.githubusercontent.com/${repo}/abc/renderer/public/data/en`;
  const ndjson = (lines: object[]) => lines.map(line => JSON.stringify(line)).join('\n');
  const unique = (refName: string | undefined, base: string, fixedStats?: string[]) => ({
    refName,
    namespace: 'UNIQUE',
    unique: { base, fixedStats },
  });
  const files: Record<string, string> = {
    [`${data}/stats.ndjson`]: ndjson([
      { ref: '# to Strength', trade: { ids: { explicit: ['explicit.stat_1'], rune: ['rune.stat_1'] } } },
      { stats: [{ ref: '#% increased Spell Damage', trade: { ids: { explicit: ['explicit.stat_2'] } } }] },
      { ref: 'Grants Skill: Parry', trade: { ids: null } },
    ]),
    [`${data}/items.ndjson`]: ndjson([
      unique('Cursecarver', 'Acrid Wand', ['# to Strength', '#% increased Spell Damage']),
      unique("Atziri's Step", 'Cinched Boots'),
      unique("Atziri's Step", 'Runemastered Cinched Boots'),
      // Listed several times on one base: one base
      unique("Berek's Grip", 'Two-Stone Ring'),
      unique("Berek's Grip", 'Two-Stone Ring'),
      unique(undefined, 'Ring'),
      unique('Headhunter', 'Heavy Belt'),
      { refName: 'Heavy Belt', namespace: 'ITEM' },
    ]),
  };
  vi.stubGlobal('fetch', async (url: string) =>
    url in files ? new Response(files[url]) : new Response(null, { status: 404, statusText: url }),
  );
  const { lines } = await fetchSource(game, 'abc');
  vi.unstubAllGlobals();
  expect([...lines.values()]).toEqual([
    '{"unique":"Cursecarver","fixed":["stat_1","stat_2"]}',
    '{"unique":"Atziri\'s Step","multiBase":true}',
  ]);
});

test('applies what APT changed and keeps hand edits', () => {
  const old = new Map([
    ['A', 'a1'],
    ['B', 'b1'],
    ['C', 'c1'],
    ['D', 'd1'],
    ['E', 'e1'],
  ]);
  const next = new Map([
    ['A', 'a1'],
    ['B', 'b2'],
    ['C', 'c2'],
    ['E', 'e2'],
    ['F', 'f1'],
  ]);
  // A: edited here, APT unchanged; B: APT updated; C: edited here and by APT; D: APT removed; E: we already took e2
  const ours = new Map([
    ['A', 'a9'],
    ['B', 'b1'],
    ['C', 'c9'],
    ['D', 'd1'],
    ['E', 'e2'],
    ['H', 'h9'],
  ]);
  const { result, changes } = merge(old, next, ours);
  expect([...result]).toEqual([
    ['A', 'a9'],
    ['B', 'b2'],
    ['C', 'c9'],
    ['E', 'e2'],
    ['H', 'h9'],
    ['F', 'f1'],
  ]);
  expect(changes.map(c => `${c.kind} ${c.name}`)).toEqual(['updated B', 'conflict C', 'removed D', 'added F']);
});
