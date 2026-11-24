import RootPageMenu from './index.tsx';
import { buildMessages } from '@/hooks/useMessages';
import { RootPage } from '@/types/root-page';
import { resolveLocaleValue, defineMessages } from '@/.storybook/locale-utils';
import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * RootPageMenu component provides navigation between root pages.
 */
const meta = {
  component: RootPageMenu,
  title: 'Components/RootPageMenu',
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  args: buildMessages().rootPageMenu,
  argTypes: {
    currentPage: {
      control: { type: 'radio' },
      options: Object.values(RootPage),
      description: 'Currently active page',
    },
    onChange: {
      control: false,
      description: 'Callback when page selection changes',
    },
    labels: {
      control: false,
      description: 'Page labels (provided by render)',
    },
    ariaLabel: {
      control: false,
      description: 'Navigation aria-label (provided by render)',
    },
  },
} satisfies Meta<typeof RootPageMenu>;

type Story = StoryObj<typeof meta>;

const currentPageMessages = defineMessages({
  'en-US': 'Current Page:',
  'fr-FR': 'Page actuelle :',
  'es-ES': 'Página actual:',
  'de-DE': 'Aktuelle Seite:',
  'pt-BR': 'Página atual:',
  'ru-RU': 'Текущая страница:',
  'zh-CN': '当前页面：',
  'ja-JP': '現在のページ：',
  'ko-KR': '현재 페이지:',
  'th-TH': 'หน้าปัจจุบัน:',
});

export const BookmarksActive: Story = {
  name: 'Bookmarks Active',
  args: {
    currentPage: RootPage.BOOKMARKS,
    onChange: () => {},
  },
  render: (args, { globals }) => (
    <RootPageMenu
      currentPage={RootPage.BOOKMARKS}
      onChange={page => console.log('Changed to:', page)}
      {...buildMessages().rootPageMenu}
      data-locale={globals.locale}
    />
  ),
};

export const PinnedItemsActive: Story = {
  name: 'Pinned Items Active',
  args: {
    currentPage: RootPage.PINNED_ITEMS,
    onChange: () => {},
  },
  render: (args, { globals }) => (
    <RootPageMenu
      currentPage={RootPage.PINNED_ITEMS}
      onChange={page => console.log('Changed to:', page)}
      {...buildMessages().rootPageMenu}
      data-locale={globals.locale}
    />
  ),
};

export const HistoryActive: Story = {
  name: 'History Active',
  args: {
    currentPage: RootPage.HISTORY,
    onChange: () => {},
  },
  render: (args, { globals }) => (
    <RootPageMenu
      currentPage={RootPage.HISTORY}
      onChange={page => console.log('Changed to:', page)}
      {...buildMessages().rootPageMenu}
      data-locale={globals.locale}
    />
  ),
};

export const Interactive: Story = {
  name: 'Interactive (Stateful)',
  args: {
    currentPage: RootPage.BOOKMARKS,
    onChange: () => {},
  },
  render: (args, { globals }) => {
    const [currentPage, setCurrentPage] = useState<RootPage>(RootPage.BOOKMARKS);
    const currentPageLabel = resolveLocaleValue(globals.locale as string, currentPageMessages);

    return (
      <div data-locale={globals.locale}>
        <RootPageMenu currentPage={currentPage} onChange={setCurrentPage} {...buildMessages().rootPageMenu} />
        <div style={{ marginTop: 20, padding: 10, backgroundColor: '#1a1a1a', color: '#fff' }}>
          <strong>{currentPageLabel}</strong> {currentPage}
        </div>
      </div>
    );
  },
};

export default meta;
