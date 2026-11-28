import { toExportString } from '@/services/pob';
import { buildGame } from '@/services/pob/build';
import { loadStats } from '@/services/pob/mods';
import { loadPools } from '@/services/pob/pools';
import type { ImportOptions } from '@/services/pob';
import type { TradeSiteVersion } from '@/types/trade-location';
import type { PublicPath } from 'wxt/browser';

interface PoeNinjaMessage {
  query: 'poe-ninja';
  resource: string;
}

interface PobImportMessage {
  query: 'pob-import';
  buildCode: string;
  options?: ImportOptions;
}

type MessageRequest = PoeNinjaMessage | PobImportMessage;

const POE_NINJA_ORIGIN = 'https://poe.ninja';

const handlePoeNinjaRequest = async (resource: string): Promise<unknown> => {
  try {
    // Only poe.ninja: the manifest grants nothing else, and a crafted resource must not reach another host
    const url = new URL(resource, POE_NINJA_ORIGIN);
    if (url.origin !== POE_NINJA_ORIGIN) throw new Error(`Not a poe.ninja resource: ${resource}`);

    const response = await fetch(url);

    if (!response.ok) {
      console.error(`[poe-ninja] Failed to fetch resource: ${resource}`, response.status);
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[poe-ninja] Fetch error:', error);
    throw error;
  }
};

// Each game's data files
const POB_DATA: Record<TradeSiteVersion, { stats: PublicPath; pools: PublicPath }> = {
  '1': { stats: '/pob-stats.ndjson', pools: '/pob-pools.json' },
  '2': { stats: '/pob-stats-poe2.ndjson', pools: '/pob-pools-poe2.json' },
};
// A game's stat data and Mod Pools, loaded on its first import only; a failed load is retried on the next one
const pobData = new Map<TradeSiteVersion, Promise<void>>();

const loadPobData = (game: TradeSiteVersion) => {
  const { stats, pools } = POB_DATA[game];
  const loading =
    pobData.get(game) ??
    Promise.all([
      fetch(browser.runtime.getURL(stats))
        .then(response => response.text())
        .then(ndjson => loadStats(ndjson, game)),
      // Without Mod Pools the import still works, unchecked
      fetch(browser.runtime.getURL(pools))
        .then(response => response.json())
        .then(json => loadPools(json, game))
        .catch(error => console.warn('[pob-import] Mod Pools not loaded', error)),
    ])
      .then(() => {})
      .catch(error => {
        pobData.delete(game);
        throw error;
      });
  pobData.set(game, loading);
  return loading;
};

/** Path of Building Build Code to Export Strings, one per Folder; null when the code is not a build */
const handlePobImport = async (buildCode: string, options?: ImportOptions): Promise<string[] | null> => {
  try {
    // Only the files of the Build Code's game are loaded
    await loadPobData(await buildGame(buildCode));
    return (await toExportString(buildCode, options)).exportStrings;
  } catch (error) {
    console.error('[pob-import] Conversion error:', error);
    return null;
  }
};

export default defineBackground(() => {
  console.log('Better Trading background service started', { id: browser.runtime.id });

  // Handle messages from content scripts
  browser.runtime.onMessage.addListener((request: MessageRequest, _sender, sendResponse) => {
    if (request.query === 'poe-ninja') {
      handlePoeNinjaRequest(request.resource)
        .then(sendResponse)
        .catch(() => sendResponse(null));

      // Return true to indicate we will send a response asynchronously
      return true;
    }

    if (request.query === 'pob-import') {
      handlePobImport(request.buildCode, request.options).then(sendResponse);
      return true;
    }

    return false;
  });
});
