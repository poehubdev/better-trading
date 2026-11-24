import ExpandButton from './index';
import { buildMessages } from '@/hooks/useMessages';
import { collapseSidePanel, expandSidePanel } from '@/utils/side-panel-collapse';
import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * ExpandButton restores the side panel after it has been collapsed elsewhere.
 */
const meta = {
  component: ExpandButton,
  title: 'Components/ExpandButton',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof ExpandButton>;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: buildMessages().expandButton,
  render: args => {
    const CollapsedPreview = () => {
      useEffect(() => {
        collapseSidePanel();
        return () => {
          expandSidePanel();
        };
      }, []);

      return <ExpandButton {...args} {...buildMessages().expandButton} />;
    };

    return <CollapsedPreview />;
  },
};

export default meta;
