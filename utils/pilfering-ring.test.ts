import {
  countCurrencyDrop,
  getCurrencyCounts,
  resetCurrencyCounts,
  subscribeToCurrencyDrops,
} from '@/utils/pilfering-ring';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The tests run in Node; utils/storage reads globalThis.localStorage lazily, so a Map-backed stub is enough
const store = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => void store.set(key, value),
  removeItem: (key: string) => void store.delete(key),
});

describe('pilfering ring counter', () => {
  beforeEach(() => store.clear());

  it('counts drops per currency', () => {
    countCurrencyDrop('/a.png');
    countCurrencyDrop('/a.png');
    countCurrencyDrop('/b.png');
    expect(getCurrencyCounts()).toEqual({ '/a.png': 2, '/b.png': 1 });
  });

  it('resets every counter and tells listeners', () => {
    countCurrencyDrop('/a.png');
    let calls = 0;
    const unsubscribe = subscribeToCurrencyDrops(() => calls++);
    resetCurrencyCounts();
    unsubscribe();
    expect(getCurrencyCounts()).toEqual({});
    expect(calls).toBe(1);
  });

  it('starts over from garbage in storage', () => {
    store.set('bt-pilfering-ring', 'not json');
    expect(getCurrencyCounts()).toEqual({});
    countCurrencyDrop('/a.png');
    expect(getCurrencyCounts()).toEqual({ '/a.png': 1 });
  });
});

describe('pilfering ring subscription', () => {
  it('notifies listeners of each drop until unsubscribed', () => {
    let calls = 0;
    const unsubscribe = subscribeToCurrencyDrops(() => calls++);
    countCurrencyDrop('/a.png');
    unsubscribe();
    countCurrencyDrop('/a.png');
    expect(calls).toBe(1);
  });
});
