/** Indices of the matched characters in each title, for highlighting */
interface FolderSearchMatch {
  titleIndices: number[];
  /** The Trades to show, by id */
  trades: Map<string, number[]>;
}

interface SearchableFolder {
  id: string;
  title: string;
  trades: { id?: string; title: string }[];
}

// One UTF-16 unit per unit, so indices in the folded text are indices in the original
const fold = (text: string) =>
  Array.from(text.split(''), char => char.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase()[0] ?? char).join(
    '',
  );

const isWordStart = (text: string, index: number) => index === 0 || !/[\p{L}\p{N}]/u.test(text[index - 1]!);

/**
 * Where `word` appears in `text`: as a substring, or else as runs of characters where every run after
 * the first starts a word ("lifres" in "Life and Resistance"). Letters scattered inside words don't match.
 */
const matchWord = (word: string, text: string): number[] | null => {
  const folded = fold(text);
  const target = fold(word);
  const at = folded.indexOf(target);
  if (at >= 0) return Array.from(target, (_, offset) => at + offset);

  const walk = (wordIndex: number, previous: number): number[] | null => {
    if (wordIndex === target.length) return [];
    for (let index = previous + 1; index < folded.length; index++) {
      const continuesRun = index === previous + 1 && wordIndex > 0;
      if (folded[index] !== target[wordIndex] || !(wordIndex === 0 || continuesRun || isWordStart(folded, index)))
        continue;
      const rest = walk(wordIndex + 1, index);
      if (rest) return [index, ...rest];
    }
    return null;
  };
  return walk(0, -1);
};

const union = (indices: (number[] | null)[]) =>
  [...new Set(indices.flatMap(match => match ?? []))].sort((a, b) => a - b);

/**
 * Filters Folders and their Trades by `query`. A Trade is kept when every word of the query matches its title or its
 * Folder's title; a Folder whose title matches every word keeps all its Trades. Returns the matching Folders in their
 * order, or null when the query has no word of 2+ characters (nothing to filter by).
 */
const searchBookmarks = (query: string, folders: SearchableFolder[]): Map<string, FolderSearchMatch> | null => {
  // ponytail: single characters match almost everything, so they are ignored
  const words = query.split(/\s+/).filter(word => word.length >= 2);
  if (words.length === 0) return null;

  const result = new Map<string, FolderSearchMatch>();
  for (const folder of folders) {
    const titleMatches = words.map(word => matchWord(word, folder.title));
    const titleMatchesAll = titleMatches.every(Boolean);

    const trades = new Map<string, number[]>();
    for (const trade of folder.trades) {
      const tradeMatches = words.map(word => matchWord(word, trade.title));
      if (titleMatchesAll || tradeMatches.every((match, index) => match ?? titleMatches[index]))
        trades.set(trade.id ?? '', union(tradeMatches));
    }

    if (titleMatchesAll || trades.size > 0) result.set(folder.id, { titleIndices: union(titleMatches), trades });
  }
  return result;
};

export { matchWord, searchBookmarks };
export type { FolderSearchMatch };
