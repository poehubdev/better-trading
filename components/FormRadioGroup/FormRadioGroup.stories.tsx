import FormRadioGroup from './index';
import { defineMessages, resolveLocaleValue } from '@/.storybook/locale-utils';
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

const legendLabels = defineMessages({
  'en-US': 'Clicking the logo throws',
  'fr-FR': 'Cliquer sur le logo lance',
  'es-ES': 'Al hacer clic en el logo se lanza',
  'de-DE': 'Klick auf das Logo wirft',
  'pt-BR': 'Clicar no logo lança',
  'ru-RU': 'Клик по логотипу бросает',
  'zh-CN': '点击标志时抛出',
  'ja-JP': 'ロゴをクリックすると投げるもの',
  'ko-KR': '로고 클릭 시 던지기',
  'th-TH': 'คลิกโลโก้เพื่อโยน',
});

const noneLabels = defineMessages({
  'en-US': 'Nothing',
  'fr-FR': 'Rien',
  'es-ES': 'Nada',
  'de-DE': 'Nichts',
  'pt-BR': 'Nada',
  'ru-RU': 'Ничего',
  'zh-CN': '无',
  'ja-JP': 'なし',
  'ko-KR': '없음',
  'th-TH': 'ไม่มี',
});

const logoLabels = defineMessages({
  'en-US': 'Logo',
  'fr-FR': 'Logo',
  'es-ES': 'Logo',
  'de-DE': 'Logo',
  'pt-BR': 'Logo',
  'ru-RU': 'Логотип',
  'zh-CN': '标志',
  'ja-JP': 'ロゴ',
  'ko-KR': '로고',
  'th-TH': 'โลโก้',
});

const currencyLabels = defineMessages({
  'en-US': 'Currency',
  'fr-FR': 'Monnaie',
  'es-ES': 'Moneda',
  'de-DE': 'Währung',
  'pt-BR': 'Moeda',
  'ru-RU': 'Валюта',
  'zh-CN': '通货',
  'ja-JP': 'カレンシー',
  'ko-KR': '화폐',
  'th-TH': 'สกุลเงิน',
});

const LogoThrowWrapper = ({ locale }: { locale: string }) => {
  const [value, setValue] = useState('logo');
  const options = [
    { value: 'none', label: resolveLocaleValue(locale, noneLabels) },
    { value: 'logo', label: resolveLocaleValue(locale, logoLabels) },
    { value: 'currency', label: resolveLocaleValue(locale, currencyLabels) },
  ];
  return (
    <FormRadioGroup
      label={resolveLocaleValue(locale, legendLabels)}
      options={options}
      value={value}
      onChange={setValue}
    />
  );
};

export const LogoThrow: Story = {
  args: {} as never,
  render: (args, { globals }) => <LogoThrowWrapper locale={globals.locale as string} />,
};

export default meta;
