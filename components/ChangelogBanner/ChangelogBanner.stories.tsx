import ChangelogBanner from './index.tsx';
import { buildMessages } from '@/hooks/useMessages';
import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * ChangelogBanner displays a notification about new changelog entries.
 * It can be dismissed and shows a modal with the full changelog when clicked.
 *
 * NOTE: This component uses localStorage for persistence. In Storybook, dismissing
 * the banner will persist across page reloads until localStorage is cleared.
 */
// Version substituted into the notice templates below (not a component prop)
const storyVersion = '2.0.0';

const meta = {
  component: ChangelogBanner,
  title: 'Components/ChangelogBanner',
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  argTypes: {
    changelog: {
      control: 'object',
      description: 'Changelog data object with slug and markdown content',
    },
  },
  args: {
    ...buildMessages().changelogBanner(storyVersion),
    changelog: {
      slug: '2.0.0',
      markdown: `
        <h3>What's New</h3>
        <ul>
          <li><strong>New Feature:</strong> Added React 19 support</li>
          <li><strong>Improvement:</strong> Better performance and stability</li>
          <li><strong>Bug Fix:</strong> Fixed various UI issues</li>
        </ul>
      `,
    },
  },
} satisfies Meta<typeof ChangelogBanner>;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args, { globals }) => (
    <ChangelogBanner {...args} {...buildMessages().changelogBanner(storyVersion)} data-locale={globals.locale} />
  ),
};

export const NoChangelog: Story = {
  name: 'No Changelog (Hidden)',
  args: {
    changelog: undefined,
  },
  render: (args, { globals }) => (
    <div>
      <p style={{ marginBottom: 16, fontStyle: 'italic', color: '#666' }}>
        The banner is hidden when no changelog is provided.
      </p>
      <ChangelogBanner {...args} {...buildMessages().changelogBanner(storyVersion)} data-locale={globals.locale} />
    </div>
  ),
};

export const LongChangelog: Story = {
  name: 'Long Changelog Content',
  args: {
    changelog: {
      slug: '2.0.0-long',
      markdown: `
        <h3>Major Release: Version 2.0.0</h3>
        <h4>New Features</h4>
        <ul>
          <li><strong>React 19 Migration:</strong> Complete rewrite using React 19</li>
          <li><strong>TypeScript Support:</strong> Full type safety across the codebase</li>
          <li><strong>Performance:</strong> 50% faster load times</li>
          <li><strong>New UI Components:</strong> Redesigned interface with modern components</li>
          <li><strong>Dark Mode:</strong> Full dark mode support</li>
        </ul>
        <h4>Improvements</h4>
        <ul>
          <li>Better error handling and user feedback</li>
          <li>Improved accessibility (WCAG 2.1 AA compliant)</li>
          <li>Enhanced search functionality</li>
          <li>More responsive layout</li>
          <li>Reduced bundle size</li>
        </ul>
        <h4>Bug Fixes</h4>
        <ul>
          <li>Fixed crash when opening bookmarks</li>
          <li>Resolved layout issues on small screens</li>
          <li>Fixed memory leaks in background processes</li>
          <li>Corrected translation errors</li>
          <li>Fixed race conditions in data loading</li>
        </ul>
      `,
    },
  },
  render: (args, { globals }) => (
    <ChangelogBanner {...args} {...buildMessages().changelogBanner(storyVersion)} data-locale={globals.locale} />
  ),
};

export default meta;
