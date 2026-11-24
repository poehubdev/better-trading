import { getLocalValue, setLocalValue } from '@/utils/storage';
import { parseCurrentPath } from '@/utils/trade-location';
import type { TradeSiteVersion } from '@/types/trade-location';

/** What a click on the header logo throws (easter egg) */
type LogoThrow = 'none' | 'logo' | 'currency';

const LOGO_THROWS: LogoThrow[] = ['none', 'logo', 'currency'];
const STORAGE_KEY = 'logo-throw';
const HELD_CURRENCY_KEY = 'logo-held-currency';
const MIRROR_IMAGE = 'Mirror_of_Kalandra.png';

interface CurrencyImage {
  file: string;
  /** Drops per 10 000 throws; the weights add up to 10 000, so 40 = 0.4%. Hand-tuned, edit freely. */
  weight: number;
}

// Files under public/assets/images/currency/poe<game>/; add a file there, then a line here.
// ponytail: hardcoded list, the content script can't list a folder; generate it if the list gets long
const CURRENCY_IMAGES: Record<TradeSiteVersion, CurrencyImage[]> = {
  '1': [
    { file: 'Divine_Orb.png', weight: 3850 }, // 1 in 2.6
    { file: 'Tainted_Divine_Teardrop.png', weight: 800 },
    { file: 'Veiled_Exalted_Orb.png', weight: 800 },
    { file: 'Tailoring_Orb.png', weight: 800 },
    { file: 'Orb_of_Dominance.png', weight: 600 },
    { file: 'Soul_Core_of_Instability.png', weight: 600 },
    { file: 'Tempering_Orb.png', weight: 500 },
    { file: 'Volatile_Vaal_Orb.png', weight: 500 },
    { file: 'Reflecting_Mist.png', weight: 450 },
    { file: 'Refracting_Fog.png', weight: 450 },
    { file: 'Fracturing_Orb.png', weight: 180 },
    { file: 'Crystallised_Rancour.png', weight: 150 }, // ~1.7 divine
    { file: 'Soul_Core_of_Intellect.png', weight: 90 },
    { file: 'Soul_Core_of_Finesse.png', weight: 90 },
    { file: 'Soul_Core_of_Might.png', weight: 90 },
    { file: 'Mirror_Shard.png', weight: 35 }, // 1 in ~290
    { file: "Hinekora's_Lock.png", weight: 10 }, // 1 in 1000
    { file: 'Mirror_of_Kalandra.png', weight: 5 }, // 1 in 2000
  ],
  '2': [],
};

/** Weighted random pick: each entry's chance is its weight over the total. `random` is in [0, 1). */
const pickWeighted = <T extends { weight: number }>(entries: T[], random = Math.random()): T | undefined => {
  let roll = random * entries.reduce((total, entry) => total + entry.weight, 0);
  return entries.find(entry => (roll -= entry.weight) < 0);
};

const getLogoThrow = (): LogoThrow => {
  const stored = getLocalValue(STORAGE_KEY);
  // Unknown values (e.g. written by a future version) fall back to the default
  return LOGO_THROWS.find(logoThrow => logoThrow === stored) ?? 'logo';
};

const setLogoThrow = (logoThrow: LogoThrow): void => {
  setLocalValue(STORAGE_KEY, logoThrow);
};

/** Path of a random (by drop weight) currency image of the current game, or null while that game has none */
const pickCurrencyImage = (): string | null => {
  const version = parseCurrentPath(window.location.pathname).version;
  const image = pickWeighted(CURRENCY_IMAGES[version]);
  return image ? `/assets/images/currency/poe${version}/${image.file}` : null;
};

/** Paths of every currency image of the current game, most common first */
const getCurrencyImagePaths = (): string[] => {
  const version = parseCurrentPath(window.location.pathname).version;
  return CURRENCY_IMAGES[version].map(({ file }) => `/assets/images/currency/poe${version}/${file}`);
};

/** The currency held in the logo's spot, kept across page loads; null if none or not one of the current game's */
const getHeldCurrency = (): string | null => {
  const stored = getLocalValue(HELD_CURRENCY_KEY);
  return stored && getCurrencyImagePaths().includes(stored) ? stored : null;
};

const setHeldCurrency = (path: string | null): void => {
  if (path) setLocalValue(HELD_CURRENCY_KEY, path);
};

/** 'Soul_Core_of_Might.png' path -> 'Soul Core of Might' */
const getCurrencyName = (path: string): string =>
  (path.split('/').pop() ?? path).replace(/\.png$/, '').replaceAll('_', ' ');

export {
  LOGO_THROWS,
  MIRROR_IMAGE,
  getLogoThrow,
  setLogoThrow,
  pickCurrencyImage,
  getCurrencyImagePaths,
  getCurrencyName,
  getHeldCurrency,
  setHeldCurrency,
  pickWeighted,
};
export type { LogoThrow };
