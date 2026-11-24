import PageHistory from './index';
import { buildMessages } from '@/hooks/useMessages';
import { formatRelativeTime } from '@/utils/format-relative-time';
import { MockTradeHistoryProvider, createMockHistoryEntry } from '@/.storybook/mock-providers';
import type { TradeLocationHistoryStruct } from '@/types/trade-location';
import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * PageHistory displays a list of previously visited trade searches,
 * allowing users to quickly return to their search history.
 */
const meta = {
  component: PageHistory,
  title: 'Pages/PageHistory',
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  args: { ...buildMessages().pageHistory },
  argTypes: {
    clearButtonLabel: {
      control: 'text',
      description: 'Label for the clear history button',
    },
    emptyMessage: {
      control: 'text',
      description: 'Message shown when history is empty',
    },
    clearSuccessMessage: {
      control: 'text',
      description: 'Success message after clearing history',
    },
    genericAlertMessage: {
      control: 'text',
      description: 'Generic alert message for errors',
    },
    formatCreatedAt: {
      control: false,
      description: "Formats an entry's ISO creation date relative to now",
    },
  },
} satisfies Meta<typeof PageHistory>;

type Story = StoryObj<typeof meta>;

// Args are filled from locales/ (see buildMessages); render rebuilds them so the toolbar locale applies
const renderWithEntries =
  (buildEntries: () => TradeLocationHistoryStruct[]): Story['render'] =>
  // eslint-disable-next-line react/display-name -- a story render function returned by a factory, not a component, so it needs no display name
  (args, { globals }) => {
    const locale = globals.locale as string;

    return (
      <MockTradeHistoryProvider mockHistoryEntries={buildEntries()}>
        <div data-locale={locale}>
          <PageHistory
            {...args}
            {...buildMessages().pageHistory}
            formatCreatedAt={createdAt => formatRelativeTime(createdAt, locale)}
          />
        </div>
      </MockTradeHistoryProvider>
    );
  };

export const WithHistory: Story = {
  name: 'With History',
  render: renderWithEntries(() => [
    createMockHistoryEntry('1', 'Exalted Orb', 'exalted-orb', 'search', 'Crucible', 2),
    createMockHistoryEntry('2', 'Enlighten Support', 'enlighten-support', 'search', 'Crucible', 5),
    createMockHistoryEntry('3', 'Headhunter', 'headhunter', 'search', 'Crucible', 12),
    createMockHistoryEntry('4', 'Mageblood', 'mageblood', 'search', 'Crucible', 24),
  ]),
};

export const EmptyHistory: Story = {
  name: 'Empty History',
  render: renderWithEntries(() => []),
};

export const SingleEntry: Story = {
  name: 'Single Entry',
  render: renderWithEntries(() => [
    createMockHistoryEntry('1', "Atziri's Promise", 'atziris-promise', 'search', 'Crucible', 1),
  ]),
};

export const ManyEntries: Story = {
  name: 'Many Entries',
  render: renderWithEntries(() => [
    createMockHistoryEntry('1', 'Exalted Orb', 'exalted-orb', 'search', 'Crucible', 1),
    createMockHistoryEntry('2', 'Divine Orb', 'divine-orb', 'search', 'Crucible', 2),
    createMockHistoryEntry('3', 'Mirror of Kalandra', 'mirror-of-kalandra', 'search', 'Crucible', 3),
    createMockHistoryEntry('4', 'Enlighten Support', 'enlighten-support', 'search', 'Crucible', 4),
    createMockHistoryEntry('5', 'Empower Support', 'empower-support', 'search', 'Crucible', 6),
    createMockHistoryEntry('6', 'Headhunter', 'headhunter', 'search', 'Crucible', 8),
    createMockHistoryEntry('7', 'Mageblood', 'mageblood', 'search', 'Crucible', 10),
    createMockHistoryEntry('8', 'Awakened Gems', 'awakened-gems', 'search', 'Crucible', 12),
    createMockHistoryEntry('9', 'Forbidden Flame', 'forbidden-flame', 'search', 'Crucible', 18),
    createMockHistoryEntry('10', 'Forbidden Flesh', 'forbidden-flesh', 'search', 'Crucible', 24),
  ]),
};

export const LongTitles: Story = {
  name: 'Long Titles',
  render: renderWithEntries(() => [
    createMockHistoryEntry(
      '1',
      'Rare Jewel with 7% Maximum Life, 14% Critical Strike Multiplier, and 12% Cold Resistance',
      'rare-jewel-complex-search',
      'search',
      'Crucible',
      1,
    ),
    createMockHistoryEntry(
      '2',
      'Unique Body Armour with High Energy Shield, Spell Suppression, and Life Regeneration',
      'unique-body-armour-search',
      'search',
      'Crucible',
      3,
    ),
    createMockHistoryEntry(
      '3',
      'This is an extremely long title that should be truncated with ellipsis when displayed in the history list',
      'very-long-search-query',
      'search',
      'Crucible',
      6,
    ),
  ]),
};

export default meta;
