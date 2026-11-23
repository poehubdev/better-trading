import { pickWeighted } from '@/utils/logo-throw';
import { describe, expect, it } from 'vitest';

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
