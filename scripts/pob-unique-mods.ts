// Generates scripts/pob-unique-mods.ndjson from Path of Building's unique definitions (src/Data/Uniques/*.lua):
//   pnpm pob-unique-mods [PoB checkout, default ~/www/PathOfBuilding]
// then pnpm pob-stats, pnpm test, and commit both files. Run it when PoB adds or changes uniques.
// One `{ unique, fixed }` line per unique: the trade stat numbers of every explicit line in its definition, in any
// variant. A mod a copy has beyond those (Paradoxica's crafted rolls) is searched as random. The game files don't
// say which mods a unique has, so PoB's hand-kept definitions are the source. Uniques PoB builds in code
// (Special/: Skin of the Lords, Forbidden Shako, Watcher's Eye) are not here; their lines come from APT.
// eslint-disable-next-line no-restricted-imports -- node runs this script as is, without the @/ alias
import { loadStats, matchedMods } from '../services/pob/mods.ts';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const pob = process.argv[2] ?? join(homedir(), 'www/PathOfBuilding');
const dir = join(pob, 'src/Data/Uniques');
loadStats(await readFile(join(import.meta.dirname, '../public/pob-stats.ndjson'), 'utf8'));

/** Stat numbers of a definition's explicit lines: those after its implicits, or after its spec lines without any */
const fixedStats = (lines: string[]) => {
  const at = lines.findIndex(line => line.startsWith('Implicits: '));
  // Spec lines ("League: Heist", "Requires Level 68") follow name and base; a mod may read alike ("Left Ring slot: ")
  const spec = (line: string) => /^[A-Z][\w ]*: |^Requires /.test(line);
  const start =
    at >= 0
      ? at + 1 + Number(lines[at]!.slice('Implicits: '.length))
      : lines.findIndex((line, i) => i > 1 && !spec(line));
  const explicits = start < 0 ? [] : lines.slice(start);
  const mods = explicits.map(line => ({
    // Tags ({variant:1,2}{range:0.5}) off, each (min-max) range read as its max (a min may be negative: "+(-25-50)%")
    text: line.replace(/^(?:\{[^}]*\})+/, '').replace(/\((-?[\d.]+)-(-?[\d.]+)\)/g, '$2'),
    implicit: false,
    enchant: false,
    mutated: false,
    crafted: false,
    fractured: false,
  }));
  // Joined like the import joins a copy's lines. ponytail: lines that match no trade stat (Has no Sockets, PoB-only
  // wording) are left out; a copy's line of that text is then searched as random, so check unmatched lines on new data
  const ids = [...matchedMods(mods, () => {})].flatMap(({ match }) => match.ids.map(id => id.split('.')[1]!));
  return [...new Set(ids)].sort();
};

const fixed = new Map<string, Set<string>>();
for (const file of (await readdir(dir)).filter(name => name.endsWith('.lua')).sort()) {
  const lua = await readFile(join(dir, file), 'utf8');
  for (const [, block] of lua.matchAll(/\[\[([\s\S]*?)\]\]/g)) {
    const lines = block!
      .trim()
      .split('\n')
      .map(line => line.trim());
    const ids = fixedStats(lines);
    // A name defined twice (a Replica, a legacy copy) gets the stats of both
    fixed.set(lines[0]!, new Set([...(fixed.get(lines[0]!) ?? []), ...ids]));
  }
}

const out = join(import.meta.dirname, 'pob-unique-mods.ndjson');
const lines = [...fixed]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([unique, ids]) => JSON.stringify({ unique, fixed: [...ids].sort() }));
await writeFile(out, lines.join('\n') + '\n');
console.log(`wrote ${out}: ${lines.length} uniques`);
