import { formatRelativeTime } from '@/utils/format-relative-time';
import { i18n } from '#i18n';
import { useMemo } from 'react';
import type { GeneratedI18nStructure } from '#i18n';

type EnhancerTitleKey = Extract<keyof GeneratedI18nStructure, `pageSettingsEnhancers${string}`>;

// 'equivalent-pricings' -> 'EquivalentPricings'
const slugToPascalCase = (slug: string) =>
  slug
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

// Falls back to the slug itself for enhancers without a title (the key is unknown at type level)
const getEnhancerTitle = (slug: string): string =>
  i18n.t(`pageSettingsEnhancers${slugToPascalCase(slug)}` as EnhancerTitleKey) || slug;

const buildMessages = () => ({
  genericAlertMessage: i18n.t('genericAlertFlash'),

  header: {
    title: i18n.t('generalTitle'),
    logoAlt: i18n.t('logoAlt'),
    collapseLabel: i18n.t('headerCollapse'),
    showSettingsLabel: i18n.t('headerShowSettings'),
    showMainLabel: i18n.t('headerShowMain'),
  },

  expandButton: {
    logoAlt: i18n.t('logoAlt'),
    expandLabel: i18n.t('headerExpand'),
  },

  rootPageMenu: {
    ariaLabel: i18n.t('rootPageMenuLabel'),
    labels: {
      bookmarks: i18n.t('rootPageMenuBookmarks'),
      pinnedItems: i18n.t('rootPageMenuPinnedItems'),
      history: i18n.t('rootPageMenuHistory'),
    },
  },

  /** Modal strings, for callers that render a Modal outside of a Page* component */
  modal: {
    closeLabel: i18n.t('modalClose'),
    logoAlt: i18n.t('logoAlt'),
  },

  /** Depends on the version, so it is a function: `<ChangelogBanner {...messages.changelogBanner(version)} />` */
  changelogBanner: (version: string) => ({
    noticeText: i18n.t('changelogBannerNotice', [version]),
    modalTitle: i18n.t('changelogBannerModalTitle', [version]),
    modalButtonLabel: i18n.t('changelogBannerModalButton'),
    dismissButtonLabel: i18n.t('changelogBannerDismissButton'),
    modalCloseLabel: i18n.t('modalClose'),
    logoAlt: i18n.t('logoAlt'),
  }),

  pageSettings: {
    enhancersTitle: i18n.t('pageSettingsEnhancersTitle'),
    getEnhancerTitle,
    githubLinkLabel: i18n.t('pageSettingsGithubLink'),
    changelogLabel: i18n.t('changelogBannerModalButton'),
    modalCloseLabel: i18n.t('modalClose'),
    logoAlt: i18n.t('logoAlt'),
    maintainer: i18n.t('pageSettingsMaintainer'),
    credits: i18n.t('pageSettingsCredits'),
    disclaimer: i18n.t('pageSettingsDisclaimer'),
    appearanceTitle: i18n.t('pageSettingsAppearanceTitle'),
    panelBlurLabel: i18n.t('pageSettingsPanelBlur'),
    panelScrollbarLabel: i18n.t('pageSettingsPanelScrollbar'),
    logoThrowLabel: i18n.t('pageSettingsLogoThrow'),
    logoThrowOptionLabels: {
      none: i18n.t('pageSettingsLogoThrowNone'),
      logo: i18n.t('pageSettingsLogoThrowLogo'),
      currency: i18n.t('pageSettingsLogoThrowCurrency'),
    },
    logoSoundLabel: i18n.t('pageSettingsLogoSound'),
    logoSoundVolumeLabel: i18n.t('pageSettingsLogoSoundVolume'),
    // ponytail: plain "60%"; use Intl percent formatting when locales/ grows
    formatVolume: (volume: number) => `${volume}%`,
    pilferingRingTitle: i18n.t('pageSettingsPilferingRingTitle'),
    pilferingRingResetLabel: i18n.t('pageSettingsPilferingRingReset'),
    backupTitle: i18n.t('pageSettingsBackupTitle'),
    backupDescription: i18n.t('pageSettingsBackupDescription'),
    generateBackupLabel: i18n.t('pageSettingsBackupGenerateButton'),
    restoreBackupLabel: i18n.t('pageSettingsBackupRestoreButton'),
    restoreBackupErrorMessage: i18n.t('pageSettingsBackupRestoreErrorFlash'),
  },

  pagePinnedItems: {
    warningMessage: i18n.t('pagePinnedItemsWarning'),
    clearLabel: i18n.t('pagePinnedItemsClear'),
    formatPinnedCount: (count: number) => i18n.t('pagePinnedItemsCount', count),
    emptyTitle: i18n.t('pagePinnedItemsEmptyTitle'),
    emptyHint: i18n.t('pagePinnedItemsEmptyHint', { pin: '{pin}' }),
    pinButtonLabel: i18n.t('itemResultsPinnablePin'),
    unpinItemLabel: i18n.t('pagePinnedItemsUnpinItem'),
    scrollToItemLabel: i18n.t('pagePinnedItemsScrollToItem'),
    genericAlertMessage: i18n.t('genericAlertFlash'),
  },

  pageHistory: {
    clearButtonLabel: i18n.t('pageHistoryClear'),
    emptyMessage: i18n.t('pageHistoryEmpty'),
    clearSuccessMessage: i18n.t('pageHistoryClearSuccessFlash'),
    genericAlertMessage: i18n.t('genericAlertFlash'),
    // ponytail: 'en' matches the only shipped locale; pass the i18n UI language when locales/ grows
    formatCreatedAt: (createdAt: string) => formatRelativeTime(createdAt, 'en'),
  },

  pageBookmarks: {
    collapseAllLabel: i18n.t('pageBookmarksCollapseAll'),
    searchLabel: i18n.t('pageBookmarksSearch'),
    clearSearchLabel: i18n.t('pageBookmarksClearSearch'),
    noMatchesMessage: (query: string) => i18n.t('pageBookmarksNoMatches', [query]),
    showArchivedLabel: i18n.t('pageBookmarksShowArchivedFolders'),
    showUnarchivedLabel: i18n.t('pageBookmarksShowUnarchivedFolders'),
    createFolderLabel: i18n.t('pageBookmarksCreateFolder'),
    importFolderLabel: i18n.t('pageBookmarksImportFolder'),
    importPobLabel: i18n.t('pageBookmarksImportPob'),
    importFolderHint: i18n.t('pageBookmarksImportFolderHint'),
    importPobHint: i18n.t('pageBookmarksImportPobHint'),
    emptyTitle: i18n.t('pageBookmarksEmptyTitle'),
    emptyHint: i18n.t('pageBookmarksEmptyHint'),
    foldersWarningMessage: i18n.t('pageBookmarksFoldersWarning'),
    folderModalTitle: i18n.t('pageBookmarksFolderEditionModalTitle'),
    folderTitleLabel: i18n.t('pageBookmarksFolderEditionTitleLabel'),
    folderIconLabel: i18n.t('pageBookmarksFolderEditionIconLabel'),
    saveLabel: i18n.t('pageBookmarksFolderEditionSave'),
    importModalTitle: i18n.t('pageBookmarksFolderImportModalTitle'),
    importCodeLabel: i18n.t('pageBookmarksFolderImportImportCodeLabel'),
    importPreviewLabel: (name: string, tradesCount: number) =>
      i18n.t('pageBookmarksFolderImportPreview', tradesCount, [name, String(tradesCount)]),
    invalidCodeMessage: i18n.t('pageBookmarksFolderImportInvalidCode'),
    importPobModalTitle: i18n.t('pageBookmarksPobImportModalTitle'),
    importPobCodeLabel: i18n.t('pageBookmarksPobImportCodeLabel'),
    invalidPobCodeMessage: i18n.t('pageBookmarksPobImportInvalidCode'),
    exportModalTitle: i18n.t('pageBookmarksFolderFolderExportModalTitle'),
    exportCodeLabel: i18n.t('pageBookmarksFolderFolderExportExportCode'),
    exportCodeHelper: i18n.t('pageBookmarksFolderFolderExportExportCodeHelper'),
    exportCloseLabel: i18n.t('pageBookmarksFolderFolderExportClose'),
    copyToClipboardLabel: i18n.t('clipboardTextareaButton'),
    copiedToClipboardLabel: i18n.t('clipboardTextareaButtonCopied'),
    editFolderLabel: i18n.t('pageBookmarksFolderEditFolder'),
    archiveFolderLabel: i18n.t('pageBookmarksFolderArchiveFolder'),
    restoreFolderLabel: i18n.t('pageBookmarksFolderRestoreFolder'),
    deleteFolderLabel: i18n.t('pageBookmarksFolderDeleteFolder'),
    exportFolderLabel: i18n.t('pageBookmarksFolderExportFolder'),
    createTradeLabel: i18n.t('pageBookmarksFolderCreateTrade'),
    copyTradeLabel: i18n.t('pageBookmarksFolderCopyTradeToClipboard'),
    openLiveTradeLabel: i18n.t('pageBookmarksFolderOpenLiveTrade'),
    updateTradeLocationLabel: i18n.t('pageBookmarksFolderUpdateTradeLocation'),
    completeTradeLabel: i18n.t('pageBookmarksFolderCompleteTrade'),
    uncompleteTradeLabel: i18n.t('pageBookmarksFolderUncompleteTrade'),
    editTradeLabel: i18n.t('pageBookmarksFolderEditTrade'),
    deleteTradeLabel: i18n.t('pageBookmarksFolderDeleteTrade'),
    reorderLabel: i18n.t('pageBookmarksFolderReorder'),
    tradeModalTitle: i18n.t('pageBookmarksFolderTradeEditionModalTitle'),
    tradeTitleLabel: i18n.t('pageBookmarksFolderTradeEditionTitleLabel'),
    tradeDeletionModalTitle: i18n.t('pageBookmarksFolderTradeDeletionModalTitle'),
    tradeDeletionConfirmation: (title: string) => i18n.t('pageBookmarksFolderTradeDeletionConfirmation', [title]),
    tradeDeletionDeleteLabel: i18n.t('pageBookmarksFolderTradeDeletionDelete'),
    tradeDeletionCancelLabel: i18n.t('pageBookmarksFolderTradeDeletionCancel'),
    createTradeSuccessMessage: (title: string) => i18n.t('pageBookmarksFolderCreateTradeSuccessFlash', [title]),
    updateTradeSuccessMessage: (title: string) => i18n.t('pageBookmarksFolderUpdateTradeSuccessFlash', [title]),
    deleteTradeSuccessMessage: (title: string) => i18n.t('pageBookmarksFolderDeleteTradeSuccessFlash', [title]),
    updateTradeLocationSuccessMessage: (title: string) =>
      i18n.t('pageBookmarksFolderPersistTradeLocationSuccessFlash', [title]),
    deleteFolderSuccessMessage: (title: string) => i18n.t('pageBookmarksDeleteFolderSuccessFlash', [title]),
    createFolderSuccessMessage: (title: string) => i18n.t('pageBookmarksCreateFolderSuccessFlash', [title]),
    updateFolderSuccessMessage: (title: string) => i18n.t('pageBookmarksUpdateFolderSuccessFlash', [title]),
    importFolderSuccessMessage: (title: string) => i18n.t('pageBookmarksImportFolderSuccessFlash', [title]),
    copyTradeSuccessMessage: (title: string) => i18n.t('pageBookmarksFolderCopyTradeToClipboardSuccessFlash', [title]),
    genericAlertMessage: i18n.t('genericAlertFlash'),
    modalCloseLabel: i18n.t('modalClose'),
    logoAlt: i18n.t('logoAlt'),
  },

  /** For the item results enhancer services (not React components) */
  itemResults: {
    pinLabel: i18n.t('itemResultsPinnablePin'),
    unpinLabel: i18n.t('itemResultsPinnableUnpin'),
    maximumSocketsWarning: (maximum: number) => i18n.t('itemResultsMaximumSocketsWarning', [maximum]),
    regroupSimilarsLabel: (count: number) => i18n.t('itemResultsRegroupSimilarsButton', count),
    genericAlertMessage: i18n.t('genericAlertFlash'),
  },
});

type Messages = ReturnType<typeof buildMessages>;

const useMessages = (): Messages => useMemo(() => buildMessages(), []);

export { useMessages, buildMessages, getEnhancerTitle };
export type { Messages };
