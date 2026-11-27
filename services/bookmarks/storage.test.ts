import { bookmarksStorage } from './storage';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import type { BookmarksTradeStruct } from '@/types/bookmarks';

const trade = (id: string): BookmarksTradeStruct => ({
  id,
  title: id,
  completedAt: null,
  location: { version: '1', type: 'search', slug: id },
});

describe('bookmarksStorage.moveTrade', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    vi.stubGlobal('chrome', fakeBrowser);
  });

  it('moves the Trade to the end of the other Folder', async () => {
    await bookmarksStorage.persistTrades([trade('a'), trade('b')], 'from');
    await bookmarksStorage.persistTrades([trade('c')], 'to');

    await bookmarksStorage.moveTrade(trade('a'), 'from', 'to');

    expect((await bookmarksStorage.fetchTradesByFolderId('from')).map(t => t.id)).toEqual(['b']);
    expect((await bookmarksStorage.fetchTradesByFolderId('to')).map(t => t.id)).toEqual(['c', 'a']);
  });

  it('moves the Trade before the given Trade of the other Folder', async () => {
    await bookmarksStorage.persistTrades([trade('a')], 'from');
    await bookmarksStorage.persistTrades([trade('b'), trade('c')], 'to');

    await bookmarksStorage.moveTrade(trade('a'), 'from', 'to', 'c');

    expect((await bookmarksStorage.fetchTradesByFolderId('to')).map(t => t.id)).toEqual(['b', 'a', 'c']);
  });

  it('leaves the Folder alone when moving into itself', async () => {
    await bookmarksStorage.persistTrades([trade('a'), trade('b')], 'from');

    await bookmarksStorage.moveTrade(trade('a'), 'from', 'from');

    expect((await bookmarksStorage.fetchTradesByFolderId('from')).map(t => t.id)).toEqual(['a', 'b']);
  });
});
