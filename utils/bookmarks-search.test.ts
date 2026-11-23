import { matchWord, searchBookmarks } from './bookmarks-search';
import { describe, expect, it } from 'vitest';

const folder = (id: string, title: string, tradeTitles: string[]) => ({
  id,
  title,
  trades: tradeTitles.map((tradeTitle, index) => ({ id: `${id}-${index}`, title: tradeTitle })),
});

describe('matchWord', () => {
  it('matches a substring, case and accent insensitive', () => {
    expect(matchWord('jugg', 'Juggernaut gear')).toEqual([0, 1, 2, 3]);
    expect(matchWord('elem', 'Élémentaliste')).toEqual([0, 1, 2, 3]);
  });

  it('matches a word continued at the start of a later word', () => {
    // "lif" in Life, "res" at the start of Resistance
    expect(matchWord('lifres', 'Life and Resistance')).toEqual([0, 1, 2, 9, 10, 11]);
  });

  it('ignores letters scattered inside words', () => {
    expect(matchWord('bots', 'Abyss jewel to sell')).toBeNull();
  });
});

describe('searchBookmarks', () => {
  const folders = [
    folder('f-jugg', 'Juggernaut gear', ['Kaom boots', 'Life chest']),
    folder('f-chaos', 'Chaos recipe', ['Boots', 'Rings']),
    folder('f-misc', 'Misc', ['Tabula']),
  ];

  it('keeps every Trade of a Folder whose title matches the whole query', () => {
    const result = searchBookmarks('jugg', folders)!;
    expect([...result.keys()]).toEqual(['f-jugg']);
    expect([...result.get('f-jugg')!.trades.keys()]).toEqual(['f-jugg-0', 'f-jugg-1']);
  });

  it('keeps only matching Trades across Folders', () => {
    const result = searchBookmarks('boots', folders)!;
    expect([...result.keys()]).toEqual(['f-jugg', 'f-chaos']);
    expect([...result.get('f-jugg')!.trades.keys()]).toEqual(['f-jugg-0']);
    expect(result.get('f-jugg')!.titleIndices).toEqual([]);
  });

  it('narrows to one Folder when a word matches its title', () => {
    const result = searchBookmarks('jugg boots', folders)!;
    expect([...result.keys()]).toEqual(['f-jugg']);
    expect([...result.get('f-jugg')!.trades.entries()]).toEqual([['f-jugg-0', [5, 6, 7, 8, 9]]]);
    expect(result.get('f-jugg')!.titleIndices).toEqual([0, 1, 2, 3]);
  });

  it('returns nothing on no match, and null when the query has no word of 2+ characters', () => {
    expect(searchBookmarks('xyz', folders)!.size).toBe(0);
    expect(searchBookmarks(' a ', folders)).toBeNull();
  });
});
