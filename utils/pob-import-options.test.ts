import {
  getPobImportOptions,
  getRollFloorKind,
  getRollFloorPercent,
  getWeightedSum,
  setRollFloorKind,
  setRollFloorPercent,
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

  it('defaults to an 80% Roll Floor and the weighted sum on', () => {
    expect(getRollFloorKind()).toBe('percent');
    expect(getRollFloorPercent()).toBe(80);
    expect(getWeightedSum()).toBe(true);
    expect(getPobImportOptions()).toEqual({ weightedSum: true, rollFloor: { kind: 'percent', percent: 80 } });
  });

  it('passes the stored choices to the import', () => {
    setRollFloorPercent(65);
    setWeightedSum(false);
    expect(getPobImportOptions()).toEqual({ weightedSum: false, rollFloor: { kind: 'percent', percent: 65 } });

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
