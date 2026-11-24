import FormRadioGroup from './index';
import { buildMessages } from '@/hooks/useMessages';
import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'Components/FormRadioGroup',
  component: FormRadioGroup,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof FormRadioGroup>;

type Story = StoryObj<typeof meta>;

const LogoThrowWrapper = () => {
  const [value, setValue] = useState('logo');
  const { logoThrowLabel, logoThrowOptionLabels } = buildMessages().pageSettings;
  const options = [
    { value: 'none', label: logoThrowOptionLabels.none },
    { value: 'logo', label: logoThrowOptionLabels.logo },
    { value: 'currency', label: logoThrowOptionLabels.currency },
  ];
  return <FormRadioGroup label={logoThrowLabel} options={options} value={value} onChange={setValue} />;
};

export const LogoThrow: Story = {
  args: {} as never,
  render: () => <LogoThrowWrapper />,
};

export default meta;
