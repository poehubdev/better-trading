// Regenerates public/pob-stats.ndjson, the stat data of the PoB import, on a new PoE1 patch:
//   1. In dat-mcp (poehubdev/dat-mcp): npm run stats -- poe1 <patch>   → data/poe1-<patch>-stats.ndjson
//   2. Here: pnpm pob-stats <path to that file>
//   3. pnpm test, and commit the regenerated file.
// The input is in Awakened PoE Trade's stats.ndjson format. Only the fields services/pob/mods.ts reads are kept, and
// the unique lines from scripts/pob-uniques.ndjson are appended (see UniqueInfo in services/pob/mods.ts). Game data
// can't produce those lines, so that file was taken from APT at 2498730 and is edited by hand.
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

interface Stat {
  ref: string;
  better: number;
  matchers: { string: string; value?: number; negate?: boolean }[];
  trade: { ids: Record<string, string[]>; inverted?: boolean };
}

// pseudo is unused by the import today but kept for later features
const TYPES = ['explicit', 'implicit', 'fractured', 'enchant', 'crafted', 'pseudo'];

// Stats without trade IDs stay: matchMod stops at the first text that exists, matched to trade or not
const slim = ({ better, matchers, trade }: Stat): Omit<Stat, 'ref'> => ({
  better,
  matchers: matchers.map(({ string, value, negate }) => ({ string, value, negate })),
  trade: {
    ids: Object.fromEntries(TYPES.filter(type => trade.ids[type]).map(type => [type, trade.ids[type]!])),
    inverted: trade.inverted,
  },
});

const input = process.argv[2];
if (!input) throw new Error('usage: pnpm pob-stats <dat-mcp data/poe1-<patch>-stats.ndjson>');
const entries = (await readFile(input, 'utf8'))
  .split('\n')
  .flatMap(line => (line ? [JSON.parse(line) as Stat & { stats?: Stat[] }] : []));
const uniques = await readFile(join(import.meta.dirname, 'pob-uniques.ndjson'), 'utf8');
const lines = entries.map(entry => JSON.stringify(entry.stats ? { stats: entry.stats.map(slim) } : slim(entry)));
const out = join(import.meta.dirname, '../public/pob-stats.ndjson');
await writeFile(out, lines.join('\n') + '\n' + uniques);
console.log(`wrote ${out}: ${lines.length} stat lines, ${uniques.trim().split('\n').length} unique lines`);
