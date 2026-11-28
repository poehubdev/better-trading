// Generates the base table of the PoB import (base name -> the item type PoB writes, e.g. "One Hand Sword") from Path
// of Building's base definitions (src/Data/Bases/*.lua):
//   pnpm pob-bases poe2 [PoB 2 checkout, default ~/www/PathOfBuilding-PoE2]   → services/pob/bases-poe2.json
//   pnpm pob-bases poe1 [PoB checkout, default ~/www/PathOfBuilding]          → services/pob/bases.json
// Fetch and fast-forward the checkout first, then pnpm test and commit the regenerated file. Run it when PoB adds bases.
// PoE 2 types are refined where the trade site has a category of its own: "Buckler" (a Shield tagged buckler), "Warstaff"
// (a Staff of that sub type), "Life Flask" and "Mana Flask")
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const GAMES = {
  poe1: { checkout: 'www/PathOfBuilding', out: 'bases.json' },
  poe2: { checkout: 'www/PathOfBuilding-PoE2', out: 'bases-poe2.json' },
};

const game = process.argv[2] as keyof typeof GAMES;
if (!Object.hasOwn(GAMES, game)) throw new Error('Usage: pnpm pob-bases <poe1|poe2> [PoB checkout]');
const dir = join(process.argv[3] ?? join(homedir(), GAMES[game].checkout), 'src/Data/Bases');

const poe2Type = (type: string, body: string) => {
  const subType = /^\s*subType = "(.+?)"/m.exec(body)?.[1];
  if (type === 'Shield' && /\bbuckler = true/.test(body)) return 'Buckler';
  if (type === 'Staff' && subType === 'Warstaff') return 'Warstaff';
  if (type === 'Flask' && subType) return `${subType} Flask`;
  return type;
};

const bases: Record<string, string> = {};
for (const file of (await readdir(dir)).filter(name => name.endsWith('.lua')).sort()) {
  const lua = await readFile(join(dir, file), 'utf8');
  for (const [, name, body] of lua.matchAll(/^itemBases\["(.+?)"\] = \{\n([\s\S]*?)\n\}/gm)) {
    const type = /^\s*type = "(.+?)"/m.exec(body!)?.[1];
    if (type) bases[name!] = game === 'poe2' ? poe2Type(type, body!) : type;
  }
}

const out = join(import.meta.dirname, '../services/pob', GAMES[game].out);
await writeFile(out, JSON.stringify(bases, null, 2) + '\n');
console.log(`wrote ${out}: ${Object.keys(bases).length} bases`);
