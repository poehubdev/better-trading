// Regenerates public/pob-stats.ndjson (PoE 1) or public/pob-stats-poe2.ndjson (PoE 2), the stat data of the PoB
// import, on a new patch:
//   1. In dat-mcp (poehubdev/dat-mcp): npm run stats -- <poe1|poe2> <patch>   → data/<game>-<patch>-stats.ndjson
//   2. Here: pnpm pob-stats [poe2] <path to that file> (the game defaults to poe1)
//   3. pnpm test, and commit the regenerated file.
// Without a file it keeps the current stat lines and only re-appends the unique lines (after editing those).
// The input is in Awakened PoE Trade's stats.ndjson format. Only the fields services/pob/mods.ts reads are kept, and
// the unique lines are appended (see UniqueInfo in services/pob/mods.ts). Game data can't produce those: they come from
// scripts/pob-unique-mods.ndjson (PoB's unique definitions, pnpm pob-unique-mods) overlaid field by field with
// scripts/pob-uniques.ndjson (APT's lines and our hand edits, pnpm pob-uniques), which wins; for PoE 2 their -poe2
// twins (PoB 2's definitions, Exiled Exchange 2's lines).
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

interface Stat {
  ref: string;
  better: number;
  matchers: { string: string; value?: number; negate?: boolean }[];
  trade: { ids: Record<string, string[]>; inverted?: boolean };
}

// pseudo is unused by the import today but kept for later features
// rune and desecrated exist in PoE 2 only
const TYPES = ['explicit', 'implicit', 'fractured', 'enchant', 'crafted', 'rune', 'desecrated', 'pseudo'];

// Stats without trade IDs stay: matchMod stops at the first text that exists, matched to trade or not
const slim = ({ better, matchers, trade }: Stat): Omit<Stat, 'ref'> => ({
  better,
  matchers: matchers.map(({ string, value, negate }) => ({ string, value, negate })),
  trade: {
    ids: Object.fromEntries(TYPES.filter(type => trade.ids[type]).map(type => [type, trade.ids[type]!])),
    inverted: trade.inverted,
  },
});

const args = process.argv.slice(2);
const poe2 = args[0] === 'poe2';
if (args[0] === 'poe1' || poe2) args.shift();
const input = args[0];
const out = join(import.meta.dirname, poe2 ? '../public/pob-stats-poe2.ndjson' : '../public/pob-stats.ndjson');
const uniqueLines = async (file: string) =>
  (await readFile(join(import.meta.dirname, file), 'utf8'))
    .split('\n')
    .flatMap(line => (line ? [JSON.parse(line) as { unique: string }] : []));
const merged = new Map<string, { unique: string }>();
const uniqueFiles = poe2
  ? ['pob-unique-mods-poe2.ndjson', 'pob-uniques-poe2.ndjson']
  : ['pob-unique-mods.ndjson', 'pob-uniques.ndjson'];
for (const line of (await Promise.all(uniqueFiles.map(uniqueLines))).flat()) {
  merged.set(line.unique, { ...merged.get(line.unique), ...line });
}
const uniques = [...merged.values()].map(line => JSON.stringify(line) + '\n').join('');
const lines = (await readFile(input ?? out, 'utf8'))
  .split('\n')
  .filter(line => line && !line.startsWith('{"unique"'))
  .map(line => {
    if (!input) return line;
    const entry = JSON.parse(line) as Stat & { stats?: Stat[] };
    return JSON.stringify(entry.stats ? { stats: entry.stats.map(slim) } : slim(entry));
  });
await writeFile(out, lines.join('\n') + '\n' + uniques);
console.log(`wrote ${out}: ${lines.length} stat lines, ${merged.size} unique lines`);
