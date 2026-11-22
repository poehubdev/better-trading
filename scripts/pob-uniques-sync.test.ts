import { merge } from './pob-uniques-sync';
import { expect, test } from 'vitest';

test('applies what APT changed and keeps hand edits', () => {
  const old = new Map([
    ['A', 'a1'],
    ['B', 'b1'],
    ['C', 'c1'],
    ['D', 'd1'],
    ['E', 'e1'],
  ]);
  const next = new Map([
    ['A', 'a1'],
    ['B', 'b2'],
    ['C', 'c2'],
    ['E', 'e2'],
    ['F', 'f1'],
  ]);
  // A: edited here, APT unchanged; B: APT updated; C: edited here and by APT; D: APT removed; E: we already took e2
  const ours = new Map([
    ['A', 'a9'],
    ['B', 'b1'],
    ['C', 'c9'],
    ['D', 'd1'],
    ['E', 'e2'],
    ['H', 'h9'],
  ]);
  const { result, changes } = merge(old, next, ours);
  expect([...result]).toEqual([
    ['A', 'a9'],
    ['B', 'b2'],
    ['C', 'c9'],
    ['E', 'e2'],
    ['H', 'h9'],
    ['F', 'f1'],
  ]);
  expect(changes.map(c => `${c.kind} ${c.name}`)).toEqual(['updated B', 'conflict C', 'removed D', 'added F']);
});
