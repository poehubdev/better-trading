import Header from './index';
import { buildMessages } from '@/hooks/useMessages';
import { resolveLocaleValue, defineMessages } from '@/.storybook/locale-utils';
import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * Header component displays the Better Trading header with logo, title,
 */
const meta = {
  component: Header,
  title: 'Components/Header',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  args: buildMessages().header,
  argTypes: {
    isOnRootRoute: {
      control: 'boolean',
      description: 'Whether currently on root route (affects toggle icon)',
    },
    onBrandClick: {
      control: false,
      description: 'Callback when brand logo is clicked',
    },
    onToggleClick: {
      control: false,
      description: 'Callback when toggle button is clicked',
    },
  },
} satisfies Meta<typeof Header>;

type Story = StoryObj<typeof meta>;

// Localized alert messages for interaction feedback
const brandClickMessages = defineMessages({
  'en-US': 'Brand clicked! Navigating to home...',
  'fr-FR': "Marque cliquée ! Navigation vers l'accueil...",
  'es-ES': '¡Marca clicada! Navegando a inicio...',
  'de-DE': 'Marke geklickt! Navigiere zur Startseite...',
  'pt-BR': 'Marca clicada! Navegando para início...',
  'ru-RU': 'Клик по бренду! Переход на главную...',
  'zh-CN': '品牌已点击！导航到首页...',
  'ja-JP': 'ブランドをクリックしました！ホームに移動中...',
  'ko-KR': '브랜드 클릭됨! 홈으로 이동 중...',
  'th-TH': 'คลิกแบรนด์แล้ว! กำลังไปยังหน้าแรก...',
});

const toggleClickMessages = defineMessages({
  'en-US': 'Toggle clicked! Switching view...',
  'fr-FR': 'Basculer cliqué ! Changement de vue...',
  'es-ES': '¡Alternar clicado! Cambiando vista...',
  'de-DE': 'Umschalten geklickt! Ansicht wird gewechselt...',
  'pt-BR': 'Alternar clicado! Mudando visualização...',
  'ru-RU': 'Клик по переключателю! Смена вида...',
  'zh-CN': '切换已点击！切换视图...',
  'ja-JP': 'トグルをクリックしました！ビューを切り替え中...',
  'ko-KR': '토글 클릭됨! 보기 전환 중...',
  'th-TH': 'คลิกสลับแล้ว! กำลังเปลี่ยนมุมมอง...',
});

/**
 * Default header on root route (shows info icon)
 */
export const OnRootRoute: Story = {
  args: {
    isOnRootRoute: true,
  },
  render: (args, context) => {
    const { globals } = context;
    const locale = globals.locale as string;
    const brandClickMessage = resolveLocaleValue(locale, brandClickMessages);
    const toggleClickMessage = resolveLocaleValue(locale, toggleClickMessages);

    return (
      <Header
        {...args}
        {...buildMessages().header}
        isOnRootRoute={true}
        onBrandClick={() => alert(brandClickMessage)}
        onToggleClick={() => alert(toggleClickMessage)}
      />
    );
  },
};

/**
 * Header on sub-route (shows close icon)
 */
export const OnSubRoute: Story = {
  args: {
    isOnRootRoute: false,
  },
  render: (args, context) => {
    const { globals } = context;
    const locale = globals.locale as string;
    const brandClickMessage = resolveLocaleValue(locale, brandClickMessages);
    const toggleClickMessage = resolveLocaleValue(locale, toggleClickMessages);

    return (
      <Header
        {...args}
        {...buildMessages().header}
        isOnRootRoute={false}
        onBrandClick={() => alert(brandClickMessage)}
        onToggleClick={() => alert(toggleClickMessage)}
      />
    );
  },
};

export default meta;
