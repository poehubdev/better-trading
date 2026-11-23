import { deleteLocalValue, getLocalValue, setLocalValue } from '@/utils/storage';

const STORAGE_KEY = 'pilfering-ring';

/** Drops per currency image path (`/assets/images/currency/poe1/Divine_Orb.png`) */
type CurrencyCounts = Record<string, number>;

const getCurrencyCounts = (): CurrencyCounts => {
  try {
    const parsed: unknown = JSON.parse(getLocalValue(STORAGE_KEY) ?? '{}');
    return parsed && typeof parsed === 'object' ? (parsed as CurrencyCounts) : {};
  } catch {
    return {};
  }
};

const listeners = new Set<() => void>();

/** Counts one drop of the currency with this image path */
const countCurrencyDrop = (path: string): void => {
  const counts = getCurrencyCounts();
  counts[path] = (counts[path] ?? 0) + 1;
  setLocalValue(STORAGE_KEY, JSON.stringify(counts));
  listeners.forEach(listener => listener());
};

/** Sets every counter back to zero */
const resetCurrencyCounts = (): void => {
  deleteLocalValue(STORAGE_KEY);
  listeners.forEach(listener => listener());
};

/** Calls `listener` after every counted drop; returns the unsubscribe function */
const subscribeToCurrencyDrops = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};

export { getCurrencyCounts, countCurrencyDrop, resetCurrencyCounts, subscribeToCurrencyDrops };
export type { CurrencyCounts };
