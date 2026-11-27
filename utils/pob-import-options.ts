import { deleteLocalValue, getLocalValue, setLocalValue } from '@/utils/storage';
import type { FolderLayout, ImportOptions, RollFloor } from '@/services/pob';

type RollFloorKind = RollFloor['kind'];

const ROLL_FLOOR_KINDS: RollFloorKind[] = ['exact', 'percent', 'none'];
const ROLL_FLOOR_KEY = 'pob-roll-floor';
// Kept apart from the mode, so switching to Exact and back restores the percent
const ROLL_FLOOR_PERCENT_KEY = 'pob-roll-floor-percent';
// The weighted sum is the default, so only the opt-out is stored
const WEIGHTED_SUM_DISABLED_KEY = 'pob-weighted-sum-disabled';
// Skipping earlier Loadouts' Trades is the default too
const SKIP_EARLIER_LOADOUTS_DISABLED_KEY = 'pob-skip-earlier-loadouts-disabled';
const DEFAULT_PERCENT = 80;
const FOLDER_LAYOUTS: FolderLayout[] = ['single', 'perLoadout'];
// One Folder is the default, so only the per-Loadout choice is stored
const FOLDER_LAYOUT_KEY = 'pob-folder-layout';

const getRollFloorKind = (): RollFloorKind => {
  const stored = getLocalValue(ROLL_FLOOR_KEY);
  return ROLL_FLOOR_KINDS.find(kind => kind === stored) ?? 'percent';
};

const setRollFloorKind = (kind: RollFloorKind): void => setLocalValue(ROLL_FLOOR_KEY, kind);

/** Percent of the build item's roll, 0..100 */
const getRollFloorPercent = (): number => {
  const stored = Number(getLocalValue(ROLL_FLOOR_PERCENT_KEY) ?? DEFAULT_PERCENT);
  return Number.isFinite(stored) ? Math.min(Math.max(stored, 0), 100) : DEFAULT_PERCENT;
};

const setRollFloorPercent = (percent: number): void => setLocalValue(ROLL_FLOOR_PERCENT_KEY, String(percent));

const getWeightedSum = (): boolean => !getLocalValue(WEIGHTED_SUM_DISABLED_KEY);

const setWeightedSum = (isOn: boolean): void => {
  if (isOn) deleteLocalValue(WEIGHTED_SUM_DISABLED_KEY);
  else setLocalValue(WEIGHTED_SUM_DISABLED_KEY, 'true');
};

const getSkipEarlierLoadouts = (): boolean => !getLocalValue(SKIP_EARLIER_LOADOUTS_DISABLED_KEY);

const setSkipEarlierLoadouts = (isOn: boolean): void => {
  if (isOn) deleteLocalValue(SKIP_EARLIER_LOADOUTS_DISABLED_KEY);
  else setLocalValue(SKIP_EARLIER_LOADOUTS_DISABLED_KEY, 'true');
};

const getFolderLayout = (): FolderLayout =>
  getLocalValue(FOLDER_LAYOUT_KEY) === 'perLoadout' ? 'perLoadout' : 'single';

const setFolderLayout = (layout: FolderLayout): void => {
  if (layout === 'single') deleteLocalValue(FOLDER_LAYOUT_KEY);
  else setLocalValue(FOLDER_LAYOUT_KEY, layout);
};

/** The import's options from the settings; read when the player imports a build */
const getPobImportOptions = (): Required<ImportOptions> => {
  const kind = getRollFloorKind();
  return {
    weightedSum: getWeightedSum(),
    skipEarlierLoadouts: getSkipEarlierLoadouts(),
    rollFloor: kind === 'percent' ? { kind, percent: getRollFloorPercent() } : { kind },
    folders: getFolderLayout(),
  };
};

export {
  FOLDER_LAYOUTS,
  ROLL_FLOOR_KINDS,
  getFolderLayout,
  getPobImportOptions,
  getRollFloorKind,
  getRollFloorPercent,
  getSkipEarlierLoadouts,
  getWeightedSum,
  setFolderLayout,
  setRollFloorKind,
  setRollFloorPercent,
  setSkipEarlierLoadouts,
  setWeightedSum,
};
export type { RollFloorKind };
