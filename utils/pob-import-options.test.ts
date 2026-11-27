import {
  getPobImportOptions,
  getRollFloorKind,
  getRollFloorPercent,
  getSkipEarlierLoadouts,
  getWeightedSum,
  setRollFloorKind,
  setRollFloorPercent,
  setSkipEarlierLoadouts,
  setWeightedSum,
} from '@/utils/pob-import-options';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The tests run in Node: stub localStorage
const store = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => void store.set(key, value),
  removeItem: (key: string) => void store.delete(key),
});

describe('PoB import options', () => {
  beforeEach(() => store.clear());

  it('defaults to an 80% Roll Floor, the weighted sum on and earlier Loadouts skipped', () => {
    expect(getRollFloorKind()).toBe('percent');
    expect(getRollFloorPercent()).toBe(80);
    expect(getWeightedSum()).toBe(true);
    expect(getSkipEarlierLoadouts()).toBe(true);
    expect(getPobImportOptions()).toEqual({
      weightedSum: true,
      skipEarlierLoadouts: true,
      rollFloor: { kind: 'percent', percent: 80 },
    });
  });

  it('passes the stored choices to the import', () => {
    setRollFloorPercent(65);
    setWeightedSum(false);
    setSkipEarlierLoadouts(false);
    expect(getPobImportOptions()).toEqual({
      weightedSum: false,
      skipEarlierLoadouts: false,
      rollFloor: { kind: 'percent', percent: 65 },
    });
    // Only the opt-out is stored
    setSkipEarlierLoadouts(true);
    expect(store.has('bt-pob-skip-earlier-loadouts-disabled')).toBe(false);

    setRollFloorKind('exact');
    expect(getPobImportOptions().rollFloor).toEqual({ kind: 'exact' });
    setRollFloorKind('none');
    expect(getPobImportOptions().rollFloor).toEqual({ kind: 'none' });
  });

  it('keeps the percent while another mode is chosen', () => {
    setRollFloorPercent(90);
    setRollFloorKind('exact');
    setRollFloorKind('percent');
    expect(getPobImportOptions().rollFloor).toEqual({ kind: 'percent', percent: 90 });
  });

  it('falls back to the defaults on unknown or broken values', () => {
    store.set('bt-pob-roll-floor', 'future');
    store.set('bt-pob-roll-floor-percent', 'abc');
    expect(getRollFloorKind()).toBe('percent');
    expect(getRollFloorPercent()).toBe(80);
    store.set('bt-pob-roll-floor-percent', '250');
    expect(getRollFloorPercent()).toBe(100);
  });
});
