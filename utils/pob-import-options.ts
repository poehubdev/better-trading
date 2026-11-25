import { deleteLocalValue, getLocalValue, setLocalValue } from '@/utils/storage';
import type { ImportOptions, RollFloor } from '@/services/pob';

type RollFloorKind = RollFloor['kind'];

const ROLL_FLOOR_KINDS: RollFloorKind[] = ['exact', 'percent', 'none'];
const ROLL_FLOOR_KEY = 'pob-roll-floor';
// Kept apart from the mode, so switching to Exact and back restores the percent
const ROLL_FLOOR_PERCENT_KEY = 'pob-roll-floor-percent';
// The weighted sum is the default, so only the opt-out is stored
const WEIGHTED_SUM_DISABLED_KEY = 'pob-weighted-sum-disabled';
const DEFAULT_PERCENT = 80;

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

/** The import's options from the settings; read when the player imports a build */
const getPobImportOptions = (): Required<ImportOptions> => {
  const kind = getRollFloorKind();
  return {
    weightedSum: getWeightedSum(),
    rollFloor: kind === 'percent' ? { kind, percent: getRollFloorPercent() } : { kind },
  };
};

export {
  ROLL_FLOOR_KINDS,
  getPobImportOptions,
  getRollFloorKind,
  getRollFloorPercent,
  getWeightedSum,
  setRollFloorKind,
  setRollFloorPercent,
  setWeightedSum,
};
export type { RollFloorKind };
