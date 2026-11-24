import { getHeldCurrency, pickWeighted, setHeldCurrency } from '@/utils/logo-throw';
import { describe, expect, it, vi } from 'vitest';

// The tests run in Node: stub what the held currency reads (the URL for the game, localStorage)
const store = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => void store.set(key, value),
  removeItem: (key: string) => void store.delete(key),
});
const location = { pathname: '' };
vi.stubGlobal('window', { location });

describe('pickWeighted', () => {
  const entries = [
    { name: 'common', weight: 3 },
    { name: 'rare', weight: 1 },
  ];

  it('maps the roll onto cumulative weights', () => {
    expect(pickWeighted(entries, 0)?.name).toBe('common');
    expect(pickWeighted(entries, 0.74)?.name).toBe('common');
    expect(pickWeighted(entries, 0.75)?.name).toBe('rare');
    expect(pickWeighted(entries, 0.999)?.name).toBe('rare');
  });

  it('returns undefined for an empty list', () => {
    expect(pickWeighted([], 0.5)).toBeUndefined();
  });
});

describe('held currency', () => {
  const divine = '/assets/images/currency/poe1/Divine_Orb.png';

  it('survives a reload within the same game only', () => {
    location.pathname = '/trade/search/Standard';
    setHeldCurrency(divine);
    expect(getHeldCurrency()).toBe(divine);
    location.pathname = '/trade2/search/poe2/Standard';
    expect(getHeldCurrency()).toBeNull();
  });
});
