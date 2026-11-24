import PageBookmarks from './index';
import folderStyles from './Folder.module.scss';
import { BookmarksProvider } from '@/contexts/BookmarksContext';
import { buildMessages } from '@/hooks/useMessages';
import { bookmarksStorage } from '@/services/bookmarks/storage';
import { setLocalValue } from '@/utils/storage';
import { seedChromeStorage } from '@/.storybook/chrome-storage-mock';
import { expect, fireEvent, userEvent, waitFor, within } from 'storybook/test';
import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * PageBookmarks component manages bookmark folders for Path of Exile trade searches.
 * Features:
 * - Create, edit, archive, and delete bookmark folders
 * - Organize trades within folders
 * - Import/export individual folders
 * - Toggle between active and archived folders
 */
const meta = {
  component: PageBookmarks,
  title: 'Pages/PageBookmarks',
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  // Every story starts from the same Bookmarks with all Folders collapsed (stories below reorder them)
  beforeEach: () => {
    seedChromeStorage(seed);
    setLocalValue('bookmark-folders-expansion', '');
  },
  decorators: [
    // Flash messages come from the global decorator in .storybook/preview.tsx
    Story => (
      <BookmarksProvider>
        <Story />
      </BookmarksProvider>
    ),
  ],
  args: buildMessages().pageBookmarks,
  // Strings come from `locales/*.yml` in the toolbar locale (see `.storybook/i18n-mock.ts`)
  render: args => <PageBookmarks {...args} {...buildMessages().pageBookmarks} />,
} satisfies Meta<typeof PageBookmarks>;

type Story = StoryObj<typeof meta>;

// Stored exactly as 1.9.1 does. The PoE 2 folder is hidden on this (PoE 1) page.
const seed = {
  'bookmark-folders': [
    { id: 'f-chaos', title: 'Chaos recipe', version: '1', icon: 'chaos', archivedAt: null },
    { id: 'f-jugg', title: 'Juggernaut gear', version: '1', icon: 'juggernaut', archivedAt: null },
    { id: 'f-misc', title: 'Miscellaneous searches without an icon', version: '1', icon: null, archivedAt: null },
    { id: 'f-old', title: 'Last league', version: '1', icon: 'map', archivedAt: 'Mon, 01 Sep 2025 10:00:00 GMT' },
    { id: 'f-titan', title: 'Titan', version: '2', icon: 'poe2-titan', archivedAt: null },
  ],
  'bookmark-trades--f-jugg': [
    { id: 't-1', title: 'Kaom boots', location: { version: '1', type: 'search', slug: 'abc123' }, completedAt: null },
    {
      id: 't-2',
      title: 'Life chest',
      location: { version: '1', type: 'search', slug: 'def456' },
      completedAt: 'Mon, 01 Sep 2025 10:00:00 GMT',
    },
    // Saved by an old release, before the Game Version was stored
    {
      id: 't-3',
      title: 'Legacy exchange (no version)',
      location: { type: 'exchange', slug: 'xyz999' },
      completedAt: null,
    },
  ],
};

// Reordering helpers. Folders and Trades are the elements Pragmatic Drag and Drop marks `draggable`.
const findDraggable = async (canvasElement: HTMLElement, title: string) =>
  (await within(canvasElement).findByText(title)).closest<HTMLElement>('[draggable="true"]')!;

// A Folder's own handle comes before the handles of its Trades
const getHandle = (draggableElement: HTMLElement) =>
  within(draggableElement).getAllByRole('button', { name: buildMessages().pageBookmarks.reorderLabel })[0]!;

const getFolderTitles = (canvasElement: HTMLElement) =>
  Array.from(canvasElement.querySelectorAll(`.${folderStyles.headerLabel}`), element => element.textContent);

const centerOf = (element: Element) => {
  const { left, top, width, height } = element.getBoundingClientRect();
  return { clientX: left + width / 2, clientY: top + height / 2 };
};

/**
 * Starts a native drag from the handle of `source` and holds it past the middle of `target`, seen from `source`. No
 * drop follows, so the story stays in the drag state with the list previewing the new order.
 */
const holdDragOver = async (source: HTMLElement, handle: HTMLElement, target: HTMLElement) => {
  const dataTransfer = new DataTransfer();
  // Pragmatic Drag and Drop only starts the drag when the pointer is over the handle
  fireEvent.dragStart(source, { ...centerOf(handle), dataTransfer });
  await new Promise(requestAnimationFrame);
  const { left, width, top, bottom } = target.getBoundingClientRect();
  const isTargetAfterSource = Boolean(source.compareDocumentPosition(target) & Node.DOCUMENT_POSITION_FOLLOWING);
  const position = { clientX: left + width / 2, clientY: isTargetAfterSource ? bottom - 3 : top + 3, dataTransfer };
  fireEvent.dragEnter(target, position);
  fireEvent.dragOver(target, position);
  // The list reorders live: `source` jumped to the other side of `target`
  await waitFor(() =>
    expect(source.compareDocumentPosition(target) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      isTargetAfterSource ? 0 : Node.DOCUMENT_POSITION_FOLLOWING,
    ),
  );
};

export const Default: Story = {
  name: 'Bookmarks Page',
};

/** Moving Folders and Trades with ArrowUp / ArrowDown on their focused handle; the new order is persisted */
export const KeyboardReorder: Story = {
  ...Default,
  name: 'Reorder by Keyboard',
  beforeEach: () => setLocalValue('bookmark-folders-expansion', 'f-jugg'),
  play: async ({ canvasElement }) => {
    const folderHandle = getHandle(await findDraggable(canvasElement, 'Chaos recipe'));
    folderHandle.focus();
    await userEvent.keyboard('{ArrowDown}');
    await waitFor(() =>
      expect(getFolderTitles(canvasElement)).toEqual([
        'Juggernaut gear',
        'Chaos recipe',
        'Miscellaneous searches without an icon',
      ]),
    );
    await expect(folderHandle).toHaveFocus();
    // The archived and the PoE 2 Folders keep their slots
    const folders = await bookmarksStorage.fetchFolders();
    await expect(folders.map(folder => folder.id)).toEqual(['f-jugg', 'f-chaos', 'f-misc', 'f-old', 'f-titan']);

    const tradeHandle = getHandle(await findDraggable(canvasElement, 'Life chest'));
    tradeHandle.focus();
    await userEvent.keyboard('{ArrowUp}');
    await waitFor(async () => {
      const trades = await bookmarksStorage.fetchTradesByFolderId('f-jugg');
      await expect(trades.map(trade => trade.id)).toEqual(['t-2', 't-1', 't-3']);
    });
    await expect(tradeHandle).toHaveFocus();
  },
};

/** "jugg boots": only the Juggernaut Folder, expanded, with only its boots; matched characters highlighted */
export const Search: Story = {
  ...Default,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('searchbox', { name: buildMessages().pageBookmarks.searchLabel });

    await userEvent.type(input, 'boots');
    await waitFor(() => expect(canvas.getByRole('link', { name: 'Kaom boots' })).toBeVisible());
    await expect(canvas.queryByText('Life chest')).toBeNull();

    await userEvent.clear(input);
    await userEvent.type(input, 'xyz');
    await waitFor(() => expect(getFolderTitles(canvasElement)).toEqual([]));

    await userEvent.clear(input);
    await userEvent.type(input, 'jugg boots');
    await waitFor(() => expect(getFolderTitles(canvasElement)).toEqual(['Juggernaut gear']));
    await waitFor(() => expect(canvas.getByRole('link', { name: 'Kaom boots' })).toBeVisible());
    await expect(canvas.queryByText('Life chest')).toBeNull();
  },
};

/** "Chaos recipe" dragged by its handle: dimmed, already moved above "Juggernaut gear" (live preview) */
export const DraggingFolder: Story = {
  ...Default,
  name: 'Dragging a Folder',
  play: async ({ canvasElement }) => {
    const source = await findDraggable(canvasElement, 'Chaos recipe');
    const target = await findDraggable(canvasElement, 'Juggernaut gear');
    await holdDragOver(source, getHandle(source), target);
    await waitFor(() => expect(source).toHaveClass(folderStyles.isDragging!));
  },
};

/** "Kaom boots" dragged within its Folder: dimmed, already moved below "Life chest" (live preview) */
export const DraggingTrade: Story = {
  ...Default,
  name: 'Dragging a Trade',
  beforeEach: () => setLocalValue('bookmark-folders-expansion', 'f-jugg'),
  play: async ({ canvasElement }) => {
    const source = await findDraggable(canvasElement, 'Kaom boots');
    const target = await findDraggable(canvasElement, 'Life chest');
    await holdDragOver(source, getHandle(source), target);
    await waitFor(() => expect(source).toHaveClass(folderStyles.isDragging!));
  },
};

/** Enough Folders to overflow: dragging one near the top or bottom edge scrolls the page */
export const ManyFolders: Story = {
  ...Default,
  name: 'Many Folders (auto-scroll)',
  beforeEach: () =>
    seedChromeStorage({
      'bookmark-folders': Array.from({ length: 30 }, (_, index) => ({
        id: `f-${index + 1}`,
        title: `Folder ${index + 1}`,
        version: '1',
        icon: null,
        archivedAt: null,
      })),
    }),
};

/** No Folders for this Game Version: the adding actions spelled out, with what each import expects */
export const Empty: Story = {
  ...Default,
  beforeEach: () => seedChromeStorage({ 'bookmark-folders': [] }),
};

/** Empty on a PoE 2 page: no Path of Building import (PoE 1 only) */
export const EmptyPoe2: Story = {
  ...Default,
  name: 'Empty (PoE 2)',
  beforeEach: () => {
    seedChromeStorage({ 'bookmark-folders': [] });
    // The Game Version comes from the page path, as on the trade site
    const { href } = window.location;
    window.history.replaceState(null, '', `/trade2/search/poe2/Standard${window.location.search}`);
    return () => window.history.replaceState(null, '', href);
  },
};

/** Only archived Folders: the empty state, and the archive toggle stays in the toolbar */
export const EmptyWithArchive: Story = {
  ...Default,
  name: 'Empty with archived Folders',
  beforeEach: () =>
    seedChromeStorage({
      'bookmark-folders': [seed['bookmark-folders'][3]!],
    }),
};

export default meta;
