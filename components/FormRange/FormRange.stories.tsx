import FormRange from './index';
import { defineMessages, resolveLocaleValue } from '@/.storybook/locale-utils';
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

const volumeLabels = defineMessages({
  'en-US': 'Volume',
  'fr-FR': 'Volume',
  'es-ES': 'Volumen',
  'de-DE': 'Lautstärke',
  'pt-BR': 'Volume',
  'ru-RU': 'Громкость',
  'zh-CN': '音量',
  'ja-JP': '音量',
  'ko-KR': '음량',
  'th-TH': 'ระดับเสียง',
});

const VolumeWrapper = ({ locale, disabled }: { locale: string; disabled?: boolean }) => {
  const [value, setValue] = useState(60);
  return (
    <div style={{ width: 300 }}>
      <FormRange
        label={resolveLocaleValue(locale, volumeLabels)}
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
  render: (args, { globals }) => <VolumeWrapper locale={globals.locale as string} />,
};

export const Disabled: Story = {
  args: {} as never,
  render: (args, { globals }) => <VolumeWrapper locale={globals.locale as string} disabled />,
};

export default meta;
