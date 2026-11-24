import FormRange from './index';
import { buildMessages } from '@/hooks/useMessages';
import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'Components/FormRange',
  component: FormRange,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof FormRange>;

type Story = StoryObj<typeof meta>;

const VolumeWrapper = ({ disabled }: { disabled?: boolean }) => {
  const [value, setValue] = useState(60);
  return (
    <div style={{ width: 300 }}>
      <FormRange
        label={buildMessages().pageSettings.logoSoundVolumeLabel}
        value={value}
        valueText={`${value}%`}
        onChange={setValue}
        disabled={disabled}
      />
    </div>
  );
};

export const Volume: Story = {
  args: {} as never,
  render: () => <VolumeWrapper />,
};

export const Disabled: Story = {
  args: {} as never,
  render: () => <VolumeWrapper disabled />,
};

export default meta;
