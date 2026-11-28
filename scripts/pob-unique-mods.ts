// Generates a game's unique mods from Path of Building's unique definitions (src/Data/Uniques/*.lua):
//   pnpm pob-unique-mods [poe1] [PoB checkout, default ~/www/PathOfBuilding]      → scripts/pob-unique-mods.ndjson
//   pnpm pob-unique-mods poe2 [PoB 2 checkout, default ~/www/PathOfBuilding-PoE2] → scripts/pob-unique-mods-poe2.ndjson
// Fetch and fast-forward the checkout first, then pnpm pob-stats [poe2], pnpm test, and commit both files. Run it when
// PoB adds or changes uniques. The stat data it matches against must be dat-mcp's unpruned output (--stats <file>): the
// committed one is pruned (ADR 0004) by the very lists this writes.
// It also writes the game's item stats, scripts/pob-item-stats[-poe2].json, which pnpm pob-stats keeps when pruning: the
// stat numbers of every line of every unique definition (implicits too) and every trade hash of PoB's item mod lists
// (Data/Mod*.lua but maps', Viscera.lua, Uniques/Special/*.lua). Mods that only uniques, Foulborn or Special items
// carry are in no Mod Pool.
// One `{ unique, fixed }` line per unique: the trade stat numbers of every explicit line in its definition, in any
// variant. A mod a copy has beyond those (Paradoxica's crafted rolls) is searched as random. The game files don't
// say which mods a unique has, so PoB's hand-kept definitions are the source. Uniques PoB builds in code
// (Special/: Skin of the Lords, Forbidden Shako, Watcher's Eye) are not here; their lines come from APT.
// eslint-disable-next-line no-restricted-imports -- node runs this script as is, without the @/ alias
import { loadStats, matchedMods, selectStats } from '../services/pob/mods.ts';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const GAMES = {
  poe1: {
    version: '1',
    checkout: 'www/PathOfBuilding',
    stats: 'pob-stats.ndjson',
    out: 'pob-unique-mods.ndjson',
    items: 'pob-item-stats.json',
  },
  poe2: {
    version: '2',
    checkout: 'www/PathOfBuilding-PoE2',
    stats: 'pob-stats-poe2.ndjson',
    out: 'pob-unique-mods-poe2.ndjson',
    items: 'pob-item-stats-poe2.json',
  },
} as const;

const args = process.argv.slice(2);
const statsFlag = args.indexOf('--stats');
const statsFile = statsFlag >= 0 ? args.splice(statsFlag, 2)[1] : undefined;
const game = args[0] === 'poe1' || args[0] === 'poe2' ? args.shift()! : 'poe1';
const { version, checkout, stats, out: outFile, items } = GAMES[game as keyof typeof GAMES];
const data = join(args[0] ?? join(homedir(), checkout), 'src/Data');
const dir = join(data, 'Uniques');
loadStats(await readFile(statsFile ?? join(import.meta.dirname, '../public', stats), 'utf8'), version);
selectStats(version);

/** Stat numbers of mod lines */
const statsOf = (lines: string[]) => {
  const mods = lines.map(line => ({
    // Tags ({variant:1,2}{range:0.5}) off, each (min-max) range read as its max (a min may be negative: "+(-25-50)%")
    text: line.replace(/^(?:\{[^}]*\})+/, '').replace(/\((-?[\d.]+)-(-?[\d.]+)\)/g, '$2'),
    implicit: false,
    enchant: false,
    mutated: false,
    crafted: false,
    fractured: false,
    rune: false,
    desecrated: false,
  }));
  // Joined like the import joins a copy's lines. ponytail: lines that match no trade stat (Has no Sockets, PoB-only
  // wording) are left out; a copy's line of that text is then searched as random, so check unmatched lines on new data
  const ids = [...matchedMods(mods, () => {})].flatMap(({ match }) => match.ids.map(id => id.split('.')[1]!));
  return [...new Set(ids)].sort();
};

/**
 * A definition's lines from its first mod on, with how many of them are implicits. Spec lines ("League: Heist",
 * "Requires Level 68") follow name and base; a mod may read alike ("Left Ring slot: ")
 */
const modLines = (lines: string[]) => {
  const at = lines.findIndex(line => line.startsWith('Implicits: '));
  const spec = (line: string) => /^[A-Z][\w ]*: |^Requires /.test(line);
  const first = at >= 0 ? at + 1 : lines.findIndex((line, i) => i > 1 && !spec(line));
  return {
    mods: first < 0 ? [] : lines.slice(first),
    implicits: at >= 0 ? Number(lines[at]!.slice('Implicits: '.length)) : 0,
  };
};

const fixed = new Map<string, Set<string>>();
const itemStats = new Set<string>();
for (const file of (await readdir(dir)).filter(name => name.endsWith('.lua')).sort()) {
  const lua = await readFile(join(dir, file), 'utf8');
  for (const [, block] of lua.matchAll(/\[\[([\s\S]*?)\]\]/g)) {
    const lines = block!
      .trim()
      .split('\n')
      .map(line => line.trim());
    const { mods, implicits } = modLines(lines);
    const ids = statsOf(mods.slice(implicits));
    statsOf(mods.slice(0, implicits)).forEach(id => itemStats.add(id));
    ids.forEach(id => itemStats.add(id));
    // A name defined twice (a Replica, a legacy copy) gets the stats of both
    fixed.set(lines[0]!, new Set([...(fixed.get(lines[0]!) ?? []), ...ids]));
  }
}

// PoB's item mod lists, and the Special uniques it builds in code, name each mod's trade hashes: `[2954116742] = {`
const hashFiles = [
  ...(await readdir(data)).filter(name => /^Mod(?!Map|FoulbornMap|Cache)\w*\.lua$|^Viscera\.lua$/.test(name)),
  ...(await readdir(join(dir, 'Special'))).map(name => join('Uniques/Special', name)),
];
for (const file of hashFiles) {
  for (const [, hash] of (await readFile(join(data, file), 'utf8')).matchAll(/\[(\d{6,})\] = \{/g)) {
    itemStats.add(`stat_${hash}`);
  }
}

const out = join(import.meta.dirname, outFile);
const lines = [...fixed]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([unique, ids]) => JSON.stringify({ unique, fixed: [...ids].sort() }));
await writeFile(out, lines.join('\n') + '\n');
await writeFile(join(import.meta.dirname, items), JSON.stringify([...itemStats].sort()) + '\n');
console.log(`wrote ${out}: ${lines.length} uniques, ${items}: ${itemStats.size} item stats`);
