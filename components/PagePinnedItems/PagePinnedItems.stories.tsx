import PagePinnedItems from './index.tsx';
import { buildMessages } from '@/hooks/useMessages';
import { MockItemResultsProvider, createMockPinnedItem } from '@/.storybook/mock-providers';
import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * PagePinnedItems component displays pinned items from trade searches.
 */
const meta = {
  component: PagePinnedItems,
  title: 'Pages/PagePinnedItems',
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  argTypes: {
    warningMessage: { control: false, description: '(Provided by render)' },
    clearLabel: { control: false, description: '(Provided by render)' },
    formatPinnedCount: { control: false, description: '(Provided by render)' },
    emptyTitle: { control: false, description: '(Provided by render)' },
    emptyHint: { control: false, description: '(Provided by render)' },
    pinButtonLabel: { control: false, description: '(Provided by render)' },
    unpinItemLabel: { control: false, description: '(Provided by render)' },
    scrollToItemLabel: { control: false, description: '(Provided by render)' },
    genericAlertMessage: { control: false, description: '(Provided by render)' },
  },
  args: { ...buildMessages().pagePinnedItems },
} satisfies Meta<typeof PagePinnedItems>;

type Story = StoryObj<typeof meta>;

const mockPinnedItems = [
  createMockPinnedItem('item-1', 'Tabula Rasa', '1 divine', 5),
  createMockPinnedItem('item-2', 'Headhunter', '40 divine', 2),
];

export const Empty: Story = {
  name: 'Empty State',
  render: args => (
    <MockItemResultsProvider>
      <PagePinnedItems {...args} {...buildMessages().pagePinnedItems} />
    </MockItemResultsProvider>
  ),
};

/** Unpin and clear work; "scroll to item" flashes an alert since the results are not on the page */
export const WithPinnedItems: Story = {
  render: args => (
    <MockItemResultsProvider mockPinnedItems={mockPinnedItems}>
      <PagePinnedItems {...args} {...buildMessages().pagePinnedItems} />
    </MockItemResultsProvider>
  ),
};

export default meta;
