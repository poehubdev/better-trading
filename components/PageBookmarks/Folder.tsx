import styles from './Folder.module.scss';
import AngleDownIcon from '@/assets/icons/filled/angle-down.svg?react';
import DragVerticalIcon from '@/assets/icons/filled/drag-vertical.svg?react';
import CheckIcon from '@/assets/icons/solid/check.svg?react';
import BookmarkFolderIcon from '@/components/BookmarkFolderIcon';
import Button from '@/components/Button';
import ContextualMenu from '@/components/ContextualMenu';
import LoadingContainer from '@/components/LoadingContainer';
import { TAKES_ITEM, usePreviewOrder, useSortable, useSortableZone } from '@/hooks/useSortable';
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { reorder } from '@atlaskit/pragmatic-drag-and-drop/utils/reorder';
import classnames from 'classnames';
import { Fragment, useState, useCallback, useEffect, useId, useLayoutEffect, useRef } from 'react';
import type { BookmarksFolderStruct, BookmarksTradeStruct } from '@/types/bookmarks';
import type { FolderSearchMatch } from '@/utils/bookmarks-search';
import type React from 'react';

/** `text` with the characters at `indices` marked as search matches */
const highlight = (text: string, indices: number[] | undefined) => {
  if (!indices?.length) return text;
  const matched = new Set(indices);
  const parts: React.ReactNode[] = [];
  let start = 0;
  for (let index = 1; index <= text.length; index++) {
    if (index < text.length && matched.has(index) === matched.has(start)) continue;
    const part = text.slice(start, index);
    parts.push(matched.has(start) ? <mark key={start}>{part}</mark> : part);
    start = index;
  }
  return parts;
};

interface SortableTradeProps {
  listId: string;
  /** Drag data, read by the other Folders to move the Trade there */
  data: TradeDragData;
  index: number;
  count: number;
  reorderLabel: string;
  onMove: (fromIndex: number, toIndex: number) => void;
  onPreview: (fromIndex: number, toIndex: number) => void;
  onCancel: () => void;
  /** The Trade link */
  children: React.ReactNode;
  /** The Trade contextual menu, shown before the drag handle */
  menu: React.ReactNode;
}

/** How long a dragged Trade hovers a collapsed Folder before it opens, in ms */
const EXPAND_ON_HOVER_DELAY = 600;

/** Marks the row previewing a Trade dragged in from another Folder */
const INCOMING = 'data-incoming';

/** What a dragged Trade carries */
interface TradeDragData extends Record<string, unknown> {
  trade: BookmarksTradeStruct;
  folderId: string;
}

const SortableTrade: React.FC<SortableTradeProps> = ({
  listId,
  data,
  index,
  count,
  reorderLabel,
  onMove,
  onPreview,
  onCancel,
  children,
  menu,
}) => {
  const { itemRef, handleProps, isDragging } = useSortable<HTMLLIElement, HTMLButtonElement>({
    listId,
    index,
    count,
    onMove,
    onPreview,
    onCancel,
    handleOnly: false,
    data,
  });

  return (
    <li ref={itemRef} className={classnames(styles.trade, isDragging && styles.isDragging)}>
      {children}

      <div className={styles.tradeActions}>
        {menu}

        <button
          {...handleProps}
          type="button"
          className={classnames(styles.tradeAction, styles.handle)}
          title={reorderLabel}
          aria-label={reorderLabel}>
          <DragVerticalIcon className={styles.handleIcon} />
        </button>
      </div>
    </li>
  );
};

interface FolderProps {
  folder: BookmarksFolderStruct & { id: string };
  /** Position among the displayed Folders, for reordering */
  index: number;
  count: number;
  listId: string;
  isExpanded: boolean;
  isArchived: boolean;
  /** While searching: what matched. The Folder shows only the matching Trades and can't be reordered or collapsed */
  search?: FolderSearchMatch;
  league: string | null;
  editFolderLabel: string;
  archiveFolderLabel: string;
  restoreFolderLabel: string;
  deleteFolderLabel: string;
  exportFolderLabel: string;
  createTradeLabel: string;
  copyTradeLabel: string;
  openLiveTradeLabel: string;
  updateTradeLocationLabel: string;
  completeTradeLabel: string;
  uncompleteTradeLabel: string;
  editTradeLabel: string;
  deleteTradeLabel: string;
  reorderLabel: string;
  onMove: (fromIndex: number, toIndex: number) => void;
  onPreview: (fromIndex: number, toIndex: number) => void;
  onCancel: () => void;
  onReorderTrades: (trades: BookmarksTradeStruct[]) => Promise<void>;
  /** A Trade of another Folder was dropped on this Folder, before the Trade `beforeTradeId` (none: at the end) */
  onMoveTradeHere: (trade: BookmarksTradeStruct, fromFolderId: string, beforeTradeId?: string) => void;
  onExpansionToggle: () => void;
  onEdit: () => void;
  onArchiveToggle: () => Promise<void>;
  onDelete: () => Promise<void>;
  onFetchTrades: (folderId: string) => Promise<BookmarksTradeStruct[]>;
  onCreateTrade: () => void;
  onEditTrade: (trade: BookmarksTradeStruct) => void;
  onDeleteTrade: (trade: BookmarksTradeStruct) => void;
  onCopyTradeToClipboard: (trade: BookmarksTradeStruct) => void;
  onUpdateTradeLocation: (trade: BookmarksTradeStruct) => Promise<void>;
  onToggleTradeCompletion: (trade: BookmarksTradeStruct) => Promise<void>;
  onExportFolder: () => void;
  getTradeUrl: (trade: BookmarksTradeStruct, league: string | null) => string;
}

const Folder: React.FC<FolderProps> = ({
  folder,
  index,
  count,
  listId,
  isExpanded,
  isArchived,
  search,
  league,
  editFolderLabel,
  archiveFolderLabel,
  restoreFolderLabel,
  deleteFolderLabel,
  exportFolderLabel,
  createTradeLabel,
  copyTradeLabel,
  openLiveTradeLabel,
  updateTradeLocationLabel,
  completeTradeLabel,
  uncompleteTradeLabel,
  editTradeLabel,
  deleteTradeLabel,
  reorderLabel,
  onMove,
  onPreview,
  onCancel,
  onReorderTrades,
  onMoveTradeHere,
  onExpansionToggle,
  onEdit,
  onArchiveToggle,
  onDelete,
  onFetchTrades,
  onCreateTrade,
  onEditTrade,
  onDeleteTrade,
  onCopyTradeToClipboard,
  onUpdateTradeLocation,
  onToggleTradeCompletion,
  onExportFolder,
  getTradeUrl,
}) => {
  const [trades, setTrades] = useState<BookmarksTradeStruct[]>([]);

  // Run by the LoadingContainer below, which only mounts while the folder is expanded
  // Only the latest fetch may set the trades: quick successive mutations can resolve out of order
  const latestFetchRef = useRef(0);
  const loadTrades = useCallback(async () => {
    const fetchId = ++latestFetchRef.current;
    const fetchedTrades = await onFetchTrades(folder.id);
    if (fetchId === latestFetchRef.current) setTrades(fetchedTrades);
  }, [folder.id, onFetchTrades]);

  // Every Bookmarks mutation (and the window-focus refetch) refreshes the folders with fresh objects: reload the
  // trades then, without the spinner. ponytail: reloads every expanded folder, scope it if storage reads get slow.
  const previousFolderRef = useRef(folder);
  useEffect(() => {
    if (previousFolderRef.current === folder) return;
    previousFolderRef.current = folder;
    if (isExpanded) void loadTrades();
  }, [folder, isExpanded, loadTrades]);

  const { itemRef, handleProps, isDragging } = useSortable<HTMLDivElement, HTMLButtonElement>({
    listId,
    index,
    count,
    onMove,
    onPreview,
    onCancel,
  });

  const { items: orderedTrades, preview: previewTrade, cancel: cancelTradePreview } = usePreviewOrder(trades);

  // Show the new order right away; persisting it refreshes the Folders, which reloads the trades from storage
  const tradesListId = useId();
  const tradesListRef = useRef<HTMLUListElement>(null);
  useSortableZone({
    listId: tradesListId,
    listRef: tradesListRef,
    onPreview: previewTrade,
  });
  const displayedTrades = search ? orderedTrades.filter(trade => search.trades.has(trade.id ?? '')) : orderedTrades;

  const handleMoveTrade = (fromIndex: number, toIndex: number) => {
    // A fetch already in flight read the old order: let it resolve without overwriting the new one
    latestFetchRef.current++;
    const reorderedTrades = reorder({ list: trades, startIndex: fromIndex, finishIndex: toIndex });
    setTrades(reorderedTrades);
    cancelTradePreview();
    void onReorderTrades(reorderedTrades);
  };

  // The whole Folder (header and Trades) takes Trades dragged from other Folders. While one hovers, it shows in the
  // list where the pointer is (past the middle of the Trades above it), and is moved there on drop; a collapsed
  // Folder takes it at the end. An inner element: the Folder element is the drop target for reordering the Folders.
  const tradeDropRef = useRef<HTMLDivElement>(null);
  const [incomingTrade, setIncomingTrade] = useState<{ trade: BookmarksTradeStruct; index: number } | null>(null);
  const latestDropRef = useRef({ onMoveTradeHere, onExpansionToggle, displayedTrades, isExpanded });
  useLayoutEffect(() => {
    latestDropRef.current = { onMoveTradeHere, onExpansionToggle, displayedTrades, isExpanded };
  });

  // A Trade hovering a collapsed Folder opens it after a moment, so it can be dropped among its Trades. It stays open.
  const isTradeHovering = incomingTrade !== null;
  useEffect(() => {
    if (!isTradeHovering || isExpanded || isArchived) return;
    const timer = setTimeout(() => latestDropRef.current.onExpansionToggle(), EXPAND_ON_HOVER_DELAY);
    return () => clearTimeout(timer);
  }, [isTradeHovering, isExpanded, isArchived]);
  useEffect(() => {
    const element = tradeDropRef.current;
    if (!element) return;
    // Among the displayed Trades, not counting the incoming one's row
    const indexAt = (clientY: number) =>
      Array.from(tradesListRef.current?.children ?? []).filter(item => {
        if (item.hasAttribute(INCOMING)) return false;
        const { top, height } = item.getBoundingClientRect();
        return clientY - top > height / 2;
      }).length;
    const track = (trade: BookmarksTradeStruct, clientY: number) => {
      const index = indexAt(clientY);
      setIncomingTrade(current => (current?.index === index ? current : { trade, index }));
    };
    return dropTargetForElements({
      element,
      canDrop: ({ source }) => Boolean(source.data.trade) && source.data.folderId !== folder.id,
      getData: () => ({ [TAKES_ITEM]: true }),
      onDragEnter: ({ source, location }) =>
        track((source.data as TradeDragData).trade, location.current.input.clientY),
      onDrag: ({ source, location }) => track((source.data as TradeDragData).trade, location.current.input.clientY),
      onDragLeave: () => setIncomingTrade(null),
      onDrop: ({ source, location }) => {
        setIncomingTrade(null);
        const { trade, folderId } = source.data as TradeDragData;
        const { onMoveTradeHere, displayedTrades, isExpanded } = latestDropRef.current;
        if (!isExpanded) return onMoveTradeHere(trade, folderId);
        // The index counts the displayed Trades only (searching filters them): place it relative to one of them
        const beforeTradeId = displayedTrades[indexAt(location.current.input.clientY)]?.id;
        // Show it right away; persisting refreshes the Folders, which reloads the Trades from storage
        latestFetchRef.current++;
        setTrades(current => {
          const next = current.filter(t => t.id !== trade.id);
          const at = next.findIndex(t => t.id === beforeTradeId);
          next.splice(at === -1 ? next.length : at, 0, trade);
          return next;
        });
        onMoveTradeHere(trade, folderId, beforeTradeId);
      },
    });
  }, [folder.id]);

  // Where the Trade dragged from another Folder would land, dimmed like a dragged Trade
  const incomingRow = incomingTrade && (
    <li {...{ [INCOMING]: '' }} className={classnames(styles.trade, styles.isDragging)}>
      <span className={styles.tradeLink}>{incomingTrade.trade.title}</span>
      <div className={styles.tradeActions}>
        <span className={classnames(styles.tradeAction, styles.handle)}>
          <DragVerticalIcon className={styles.handleIcon} />
        </span>
      </div>
    </li>
  );

  return (
    <div
      ref={itemRef}
      className={classnames(
        styles.folder,
        isExpanded && styles.isExpanded,
        isArchived && styles.isArchived,
        isDragging && styles.isDragging,
        search && styles.isFiltered,
      )}>
      <div ref={tradeDropRef}>
        <div className={classnames(styles.header, incomingTrade && styles.isTradeDropTarget)}>
          <div
            className={styles.expansionWrapper}
            onClick={onExpansionToggle}
            onKeyDown={e => e.key === 'Enter' && onExpansionToggle()}
            role="button"
            tabIndex={0}>
            {folder.icon && <BookmarkFolderIcon icon={folder.icon} className={styles.headerIcon} />}
            <div className={styles.headerLabel}>{highlight(folder.title, search?.titleIndices)}</div>
            {!isArchived && <AngleDownIcon className={styles.expansionIndicator} />}
          </div>

          <div className={styles.headerActions}>
            <ContextualMenu
              className={styles.headerAction}
              items={[
                ...(!isArchived ? [{ label: editFolderLabel, onClick: onEdit }] : []),
                { label: isArchived ? restoreFolderLabel : archiveFolderLabel, onClick: onArchiveToggle },
                ...(isArchived ? [{ label: deleteFolderLabel, onClick: onDelete }] : []),
                { label: exportFolderLabel, onClick: onExportFolder },
              ]}
            />

            <button
              {...handleProps}
              type="button"
              className={classnames(styles.headerAction, styles.handle)}
              title={reorderLabel}
              aria-label={reorderLabel}>
              <DragVerticalIcon className={styles.handleIcon} />
            </button>
          </div>
        </div>

        {isExpanded && (
          <LoadingContainer task={loadTrades} size="small">
            <ul ref={tradesListRef} className={styles.trades}>
              {displayedTrades.map((trade, tradeIndex) => (
                <Fragment key={trade.id}>
                  {incomingTrade?.index === tradeIndex && incomingRow}
                  <SortableTrade
                    listId={tradesListId}
                    data={{ trade, folderId: folder.id }}
                    index={tradeIndex}
                    count={displayedTrades.length}
                    reorderLabel={reorderLabel}
                    onMove={handleMoveTrade}
                    onPreview={previewTrade}
                    onCancel={cancelTradePreview}
                    menu={
                      <ContextualMenu
                        className={styles.tradeAction}
                        items={[
                          { label: copyTradeLabel, onClick: () => onCopyTradeToClipboard(trade) },
                          ...(trade.location.type === 'search'
                            ? [{ label: openLiveTradeLabel, href: `${getTradeUrl(trade, league)}/live` }]
                            : []),
                          { label: updateTradeLocationLabel, onClick: () => onUpdateTradeLocation(trade) },
                          {
                            label: trade.completedAt ? uncompleteTradeLabel : completeTradeLabel,
                            onClick: () => onToggleTradeCompletion(trade),
                          },
                          { label: editTradeLabel, onClick: () => onEditTrade(trade) },
                          { label: deleteTradeLabel, onClick: () => onDeleteTrade(trade) },
                        ]}
                      />
                    }>
                    <a href={getTradeUrl(trade, league)} className={styles.tradeLink} draggable={false}>
                      {trade.completedAt && (
                        <span className={styles.tradeLinkCompleted}>
                          <CheckIcon />
                        </span>
                      )}
                      {highlight(trade.title, search?.trades.get(trade.id ?? ''))}
                    </a>
                  </SortableTrade>
                </Fragment>
              ))}
              {incomingTrade && incomingTrade.index >= displayedTrades.length && incomingRow}
            </ul>

            <div className={styles.folderActions}>
              <Button
                type="button"
                className={styles.folderActionsNewTrade}
                theme="gold"
                label={createTradeLabel}
                onClick={onCreateTrade}
              />
            </div>
          </LoadingContainer>
        )}
      </div>
    </div>
  );
};

export default Folder;
