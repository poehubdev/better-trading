// Test helpers for the PoB import, ported from pob2bt (test/decode.ts). Importing this loads the stat data and Mod Pools
// of both games and selects PoE 1's, which helpers called outside an import (matchMod, modPool) then read
import { loadStats, selectStats } from './mods';
import { loadPools, selectPools } from './pools';
import { Base64 } from 'js-base64';
import { readFile } from 'node:fs/promises';

interface DecodedTrade {
  title: string;
  // Search Queries are free-form trade site JSON
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: Record<string, any>;
}

interface DecodedFolder {
  icon: string | null;
  title: string;
  version: string;
  trades: DecodedTrade[];
}

const asset = (name: string) => readFile(new URL(`../../public/${name}`, import.meta.url), 'utf8');
loadStats(await asset('pob-stats.ndjson'), '1');
loadStats(await asset('pob-stats-poe2.ndjson'), '2');
// ponytail: no PoE 2 Mod Pools yet, so PoE 2 imports are unchecked
loadPools(JSON.parse(await asset('pob-pools.json')), '1');
selectStats('1');
selectPools('1');

/**
 * Decodes a format 3 Export String back into its Folder and each Trade's Search Query; every Trade's location must have
 * the Folder's Game Version
 */
const decodeExportString = (exportString: string): DecodedFolder => {
  if (!exportString.startsWith('3:')) throw new Error(`Not a format 3 Export String: ${exportString.slice(0, 10)}`);
  const folder = JSON.parse(Base64.decode(exportString.slice(2)));
  return {
    icon: folder.icn,
    title: folder.tit,
    version: folder.ver,
    trades: folder.trs.map(({ tit, loc }: { tit: string; loc: string }) => {
      const [version, type, slug] = loc.split(':');
      if (version !== folder.ver || type !== 'search' || !slug) throw new Error(`Unexpected location: ${loc}`);
      return { title: tit, query: JSON.parse(decodeURIComponent(slug.replace(/^\?q=/, ''))).query };
    }),
  };
};

/** Build Code of a fixture in ./fixtures/<game> */
const fixture = async (name: string, game: 'poe1' | 'poe2' = 'poe1') =>
  (await readFile(new URL(`fixtures/${game}/${name}`, import.meta.url), 'utf8')).trim();

export type { DecodedFolder, DecodedTrade };
export { decodeExportString, fixture };
