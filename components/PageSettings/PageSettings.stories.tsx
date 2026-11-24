import PageSettings from './index.tsx';
import { BookmarksProvider } from '@/contexts/BookmarksContext';
import { buildMessages } from '@/hooks/useMessages';
import { resolveLocaleValue, defineMessages } from '@/.storybook/locale-utils';
import { MockItemResultsProvider } from '@/.storybook/mock-providers';
import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * PageSettings component displays settings first, then a footer with links, changelog and credits.
 * Strings come from `locales/*.yml` in the toolbar locale (see `.storybook/i18n-mock.ts`).
 */
const meta = {
  component: PageSettings,
  title: 'Pages/PageSettings',
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  args: {
    appVersion: '2.5.3',
    githubUrl: 'https://github.com/poehubdev/better-trading',
    ...buildMessages().pageSettings,
  },
  decorators: [
    Story => (
      <BookmarksProvider>
        <MockItemResultsProvider>
          <Story />
        </MockItemResultsProvider>
      </BookmarksProvider>
    ),
  ],
  argTypes: {
    appVersion: {
      control: 'text',
      description: 'Application version number',
    },
    githubUrl: {
      control: 'text',
      description: 'GitHub repository URL',
    },
    getEnhancerTitle: {
      control: false,
      description: 'Enhancer title lookup by slug',
    },
  },
  // Messages are rebuilt on each render so the toolbar locale applies
  render: (args, { globals }) => (
    <PageSettings
      {...args}
      {...buildMessages().pageSettings}
      currentChangelog={
        args.currentChangelog && {
          ...args.currentChangelog,
          markdown: resolveLocaleValue(globals.locale as string, changelogMarkdownMessages),
        }
      }
    />
  ),
} satisfies Meta<typeof PageSettings>;

type Story = StoryObj<typeof meta>;

// Sample changelog content, not a UI string
const changelogMarkdownMessages = defineMessages({
  'en-US': `# Version 2.0.0 Release

## New Features
- Complete UI overhaul
- Enhanced performance
- Better accessibility

## Bug Fixes
- Fixed search issues
- Resolved pricing bugs`,
  'fr-FR': `# Version 2.0.0

## Nouvelles fonctionnalités
- Refonte complète de l'interface
- Performances améliorées
- Meilleure accessibilité

## Corrections de bugs
- Problèmes de recherche corrigés
- Bugs de tarification résolus`,
  'es-ES': `# Versión 2.0.0

## Nuevas características
- Renovación completa de la UI
- Rendimiento mejorado
- Mejor accesibilidad

## Correcciones de errores
- Problemas de búsqueda corregidos
- Errores de precios resueltos`,
  'de-DE': `# Version 2.0.0

## Neue Funktionen
- Komplette UI-Überarbeitung
- Verbesserte Leistung
- Bessere Barrierefreiheit

## Fehlerbehebungen
- Suchprobleme behoben
- Preisfehler behoben`,
  'pt-BR': `# Versão 2.0.0

## Novos recursos
- Reformulação completa da UI
- Desempenho aprimorado
- Melhor acessibilidade

## Correções de bugs
- Problemas de pesquisa corrigidos
- Bugs de preços resolvidos`,
  'ru-RU': `# Версия 2.0.0

## Новые функции
- Полное обновление интерфейса
- Улучшенная производительность
- Лучшая доступность

## Исправления ошибок
- Исправлены проблемы с поиском
- Устранены ошибки ценообразования`,
  'zh-CN': `# 版本 2.0.0

## 新功能
- 完整的界面改版
- 性能增强
- 更好的可访问性

## 错误修复
- 修复了搜索问题
- 解决了定价错误`,
  'ja-JP': `# バージョン 2.0.0

## 新機能
- UI の完全刷新
- パフォーマンスの向上
- アクセシビリティの改善

## バグ修正
- 検索の問題を修正
- 価格のバグを解決`,
  'ko-KR': `# 버전 2.0.0

## 새로운 기능
- 전체 UI 개편
- 향상된 성능
- 더 나은 접근성

## 버그 수정
- 검색 문제 수정
- 가격 버그 해결`,
  'th-TH': `# เวอร์ชัน 2.0.0

## คุณสมบัติใหม่
- ปรับปรุง UI ทั้งหมด
- ประสิทธิภาพที่ดีขึ้น
- การเข้าถึงที่ดีขึ้น

## การแก้ไขบั๊ก
- แก้ไขปัญหาการค้นหา
- แก้ไขบั๊กราคา`,
});

export const Default: Story = {
  name: 'Default (No Changelog)',
};

export const WithChangelog: Story = {
  args: {
    currentChangelog: { slug: '2.0.0', markdown: '' },
  },
};

export const Complete: Story = {
  name: 'Complete Example',
  args: {
    discordUrl: 'https://discord.gg/example',
    chaosRecipeOverlayUrl: 'https://example.com',
    currentChangelog: { slug: '2.0.0', markdown: '' },
  },
};

export default meta;
