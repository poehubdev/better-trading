import PageSettings from './index.tsx';
import { BookmarksProvider } from '@/contexts/BookmarksContext';
import { resolveLocaleValue, defineMessages } from '@/.storybook/locale-utils';
import { MockItemResultsProvider } from '@/.storybook/mock-providers';
import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * PageSettings component displays the settings page with changelog, enhancers, backup tools, links and credits.
 */
const meta = {
  component: PageSettings,
  title: 'Pages/PageSettings',
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  // Strings come from the locale in each story's render
  args: {
    backupTitle: '',
    backupDescription: '',
    generateBackupLabel: '',
    restoreBackupLabel: '',
    restoreBackupErrorMessage: '',
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
      description: 'Enhancer title lookup by slug (provided by render)',
    },
  },
} satisfies Meta<typeof PageSettings>;

type Story = StoryObj<typeof meta>;

// Localized messages
const enhancersTitleMessages = defineMessages({
  'en-US': 'Item Result Enhancers',
  'fr-FR': 'Améliorations des résultats',
  'es-ES': 'Mejoras de resultados',
  'de-DE': 'Ergebnis-Verbesserungen',
  'pt-BR': 'Melhorias de resultados',
  'ru-RU': 'Улучшения результатов',
  'zh-CN': '结果增强器',
  'ja-JP': '結果エンハンサー',
  'ko-KR': '결과 향상 기능',
  'th-TH': 'ตัวปรับปรุงผลลัพธ์',
});

const enhancerTitleMessages: Record<string, Record<string, string>> = {
  'equivalent-pricings': defineMessages({
    'en-US': 'Equivalent pricings (powered by poe.ninja)',
    'fr-FR': 'Prix équivalents (via poe.ninja)',
    'es-ES': 'Precios equivalentes (con poe.ninja)',
    'de-DE': 'Äquivalente Preise (von poe.ninja)',
    'pt-BR': 'Preços equivalentes (via poe.ninja)',
    'ru-RU': 'Эквивалентные цены (на основе poe.ninja)',
    'zh-CN': '等价价格（由 poe.ninja 提供）',
    'ja-JP': '同等価格（poe.ninja 提供）',
    'ko-KR': '동등 가격 (poe.ninja 제공)',
    'th-TH': 'ราคาเทียบเท่า (จาก poe.ninja)',
  }),
  'highlight-stat-filters': defineMessages({
    'en-US': 'Highlight searched mods',
    'fr-FR': 'Surligner les modificateurs recherchés',
    'es-ES': 'Resaltar los modificadores buscados',
    'de-DE': 'Gesuchte Modifikatoren hervorheben',
    'pt-BR': 'Destacar modificadores pesquisados',
    'ru-RU': 'Подсвечивать искомые свойства',
    'zh-CN': '高亮搜索的词缀',
    'ja-JP': '検索した Mod をハイライト',
    'ko-KR': '검색한 모드 강조',
    'th-TH': 'ไฮไลต์ม็อดที่ค้นหา',
  }),
  'maximum-sockets': defineMessages({
    'en-US': 'Warning for armors that cannot be 6-socketed',
    'fr-FR': 'Avertissement pour les armures qui ne peuvent pas avoir 6 châsses',
    'es-ES': 'Aviso para armaduras que no pueden tener 6 engarces',
    'de-DE': 'Warnung für Rüstungen, die keine 6 Fassungen haben können',
    'pt-BR': 'Aviso para armaduras que não podem ter 6 engastes',
    'ru-RU': 'Предупреждение для брони, в которой нельзя сделать 6 гнезд',
    'zh-CN': '无法拥有 6 孔的护甲警告',
    'ja-JP': '6 ソケットにできない防具の警告',
    'ko-KR': '6소켓이 불가능한 방어구 경고',
    'th-TH': 'คำเตือนสำหรับเกราะที่ไม่สามารถมี 6 ช่องได้',
  }),
  'regroup-similars': defineMessages({
    'en-US': 'Regroup similar results',
    'fr-FR': 'Regrouper les résultats similaires',
    'es-ES': 'Reagrupar resultados similares',
    'de-DE': 'Ähnliche Ergebnisse gruppieren',
    'pt-BR': 'Reagrupar resultados semelhantes',
    'ru-RU': 'Группировать похожие результаты',
    'zh-CN': '合并相似结果',
    'ja-JP': '類似した結果をまとめる',
    'ko-KR': '비슷한 결과 묶기',
    'th-TH': 'จัดกลุ่มผลลัพธ์ที่คล้ายกัน',
  }),
};

const githubTitleMessages = defineMessages({
  'en-US': 'Open Source',
  'fr-FR': 'Open Source',
  'es-ES': 'Código abierto',
  'de-DE': 'Open Source',
  'pt-BR': 'Código aberto',
  'ru-RU': 'Открытый исходный код',
  'zh-CN': '开源',
  'ja-JP': 'オープンソース',
  'ko-KR': '오픈 소스',
  'th-TH': 'โอเพ่นซอร์ส',
});

const githubDescriptionMessages = defineMessages({
  'en-US':
    'Better Trading is an open-source project. You can contribute, report issues, or view the source code on GitHub.',
  'fr-FR':
    'Better Trading est un projet open source. Vous pouvez contribuer, signaler des problèmes ou consulter le code source sur GitHub.',
  'es-ES':
    'Better Trading es un proyecto de código abierto. Puedes contribuir, reportar problemas o ver el código fuente en GitHub.',
  'de-DE':
    'Better Trading ist ein Open-Source-Projekt. Sie können beitragen, Probleme melden oder den Quellcode auf GitHub einsehen.',
  'pt-BR':
    'Better Trading é um projeto de código aberto. Você pode contribuir, reportar problemas ou visualizar o código-fonte no GitHub.',
  'ru-RU':
    'Better Trading — это проект с открытым исходным кодом. Вы можете внести свой вклад, сообщить о проблемах или просмотреть исходный код на GitHub.',
  'zh-CN': 'Better Trading 是一个开源项目。您可以在 GitHub 上贡献代码、报告问题或查看源代码。',
  'ja-JP':
    'Better Trading はオープンソースプロジェクトです。GitHub で貢献、問題の報告、またはソースコードの表示ができます。',
  'ko-KR':
    'Better Trading은 오픈 소스 프로젝트입니다. GitHub에서 기여하거나, 문제를 보고하거나, 소스 코드를 볼 수 있습니다.',
  'th-TH': 'Better Trading เป็นโครงการโอเพนซอร์ส คุณสามารถมีส่วนร่วม รายงานปัญหา หรือดูโค้ดต้นฉบับบน GitHub',
});

const githubButtonMessages = defineMessages({
  'en-US': 'View on GitHub',
  'fr-FR': 'Voir sur GitHub',
  'es-ES': 'Ver en GitHub',
  'de-DE': 'Auf GitHub ansehen',
  'pt-BR': 'Ver no GitHub',
  'ru-RU': 'Посмотреть на GitHub',
  'zh-CN': '在 GitHub 上查看',
  'ja-JP': 'GitHub で表示',
  'ko-KR': 'GitHub에서 보기',
  'th-TH': 'ดูบน GitHub',
});

const creditsTitleMessages = defineMessages({
  'en-US': 'Credits',
  'fr-FR': 'Crédits',
  'es-ES': 'Créditos',
  'de-DE': 'Danksagungen',
  'pt-BR': 'Créditos',
  'ru-RU': 'Благодарности',
  'zh-CN': '鸣谢',
  'ja-JP': 'クレジット',
  'ko-KR': '크레딧',
  'th-TH': 'เครดิต',
});

const creditsDescriptionMessages = defineMessages({
  'en-US':
    'Thanks to <strong>Path of Exile</strong> and <strong>Grinding Gear Games</strong> for creating an amazing game.',
  'fr-FR':
    'Merci à <strong>Path of Exile</strong> et <strong>Grinding Gear Games</strong> pour avoir créé un jeu incroyable.',
  'es-ES':
    'Gracias a <strong>Path of Exile</strong> y <strong>Grinding Gear Games</strong> por crear un juego increíble.',
  'de-DE':
    'Danke an <strong>Path of Exile</strong> und <strong>Grinding Gear Games</strong> für die Schaffung eines großartigen Spiels.',
  'pt-BR':
    'Obrigado a <strong>Path of Exile</strong> e <strong>Grinding Gear Games</strong> por criar um jogo incrível.',
  'ru-RU':
    'Спасибо <strong>Path of Exile</strong> и <strong>Grinding Gear Games</strong> за создание удивительной игры.',
  'zh-CN': '感谢 <strong>Path of Exile</strong> 和 <strong>Grinding Gear Games</strong> 创造了一款精彩的游戏。',
  'ja-JP':
    '<strong>Path of Exile</strong> と <strong>Grinding Gear Games</strong> が素晴らしいゲームを作成してくれたことに感謝します。',
  'ko-KR': '멋진 게임을 만들어준 <strong>Path of Exile</strong>과 <strong>Grinding Gear Games</strong>에 감사드립니다.',
  'th-TH': 'ขอบคุณ <strong>Path of Exile</strong> และ <strong>Grinding Gear Games</strong> ที่สร้างเกมที่ยอดเยี่ยม',
});

const disclaimerMessages = defineMessages({
  'en-US': 'This extension is not affiliated with or endorsed by Grinding Gear Games.',
  'fr-FR': "Cette extension n'est pas affiliée à ou approuvée par Grinding Gear Games.",
  'es-ES': 'Esta extensión no está afiliada ni respaldada por Grinding Gear Games.',
  'de-DE': 'Diese Erweiterung ist nicht mit Grinding Gear Games verbunden oder von ihnen unterstützt.',
  'pt-BR': 'Esta extensão não é afiliada ou endossada pela Grinding Gear Games.',
  'ru-RU': 'Это расширение не связано с Grinding Gear Games и не одобрено ими.',
  'zh-CN': '此扩展程序未与 Grinding Gear Games 关联或获得其认可。',
  'ja-JP': 'この拡張機能は Grinding Gear Games と提携または承認されていません。',
  'ko-KR': '이 확장 프로그램은 Grinding Gear Games와 제휴하거나 승인하지 않습니다.',
  'th-TH': 'ส่วนขยายนี้ไม่ได้เกี่ยวข้องหรือได้รับการรับรองโดย Grinding Gear Games',
});

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

const backupTitleMessages = defineMessages({
  'en-US': 'Backup & Restore',
  'fr-FR': 'Sauvegarde et restauration',
  'es-ES': 'Copia de seguridad y restauración',
  'de-DE': 'Sicherung & Wiederherstellung',
  'pt-BR': 'Backup e restauração',
  'ru-RU': 'Резервное копирование и восстановление',
  'zh-CN': '备份与恢复',
  'ja-JP': 'バックアップと復元',
  'ko-KR': '백업 및 복원',
  'th-TH': 'สำรองและกู้คืน',
});

const backupDescriptionMessages = defineMessages({
  'en-US': 'Save all your bookmarks to a file, or restore them from one.',
  'fr-FR': 'Enregistrez tous vos favoris dans un fichier ou restaurez-les depuis un fichier.',
  'es-ES': 'Guarda todos tus marcadores en un archivo o restáuralos desde uno.',
  'de-DE': 'Alle Lesezeichen in einer Datei sichern oder aus einer Datei wiederherstellen.',
  'pt-BR': 'Salve todos os seus favoritos em um arquivo ou restaure-os a partir de um.',
  'ru-RU': 'Сохраните все закладки в файл или восстановите их из файла.',
  'zh-CN': '将所有书签保存到文件，或从文件恢复。',
  'ja-JP': 'すべてのブックマークをファイルに保存、またはファイルから復元します。',
  'ko-KR': '모든 북마크를 파일로 저장하거나 파일에서 복원합니다.',
  'th-TH': 'บันทึกบุ๊กมาร์กทั้งหมดลงไฟล์ หรือกู้คืนจากไฟล์',
});

const generateBackupMessages = defineMessages({
  'en-US': 'Export Backup',
  'fr-FR': 'Exporter la sauvegarde',
  'es-ES': 'Exportar copia',
  'de-DE': 'Sicherung exportieren',
  'pt-BR': 'Exportar backup',
  'ru-RU': 'Экспортировать резервную копию',
  'zh-CN': '导出备份',
  'ja-JP': 'バックアップをエクスポート',
  'ko-KR': '백업 내보내기',
  'th-TH': 'ส่งออกการสำรอง',
});

const restoreBackupMessages = defineMessages({
  'en-US': 'Restore Backup',
  'fr-FR': 'Restaurer la sauvegarde',
  'es-ES': 'Restaurar copia',
  'de-DE': 'Sicherung wiederherstellen',
  'pt-BR': 'Restaurar backup',
  'ru-RU': 'Восстановить резервную копию',
  'zh-CN': '恢复备份',
  'ja-JP': 'バックアップを復元',
  'ko-KR': '백업 복원',
  'th-TH': 'กู้คืนการสำรอง',
});

const restoreBackupErrorMessages = defineMessages({
  'en-US': 'Failed to restore backup. The file may be corrupted.',
  'fr-FR': 'Échec de la restauration de la sauvegarde. Le fichier peut être corrompu.',
  'es-ES': 'Error al restaurar la copia. El archivo puede estar dañado.',
  'de-DE': 'Sicherung konnte nicht wiederhergestellt werden. Die Datei ist möglicherweise beschädigt.',
  'pt-BR': 'Falha ao restaurar backup. O arquivo pode estar corrompido.',
  'ru-RU': 'Не удалось восстановить резервную копию. Файл может быть поврежден.',
  'zh-CN': '恢复备份失败。文件可能已损坏。',
  'ja-JP': 'バックアップの復元に失敗しました。ファイルが破損している可能性があります。',
  'ko-KR': '백업 복원에 실패했습니다. 파일이 손상되었을 수 있습니다.',
  'th-TH': 'การกู้คืนการสำรองล้มเหลว ไฟล์อาจเสียหาย',
});

const getMessages = (locale: string) => ({
  enhancersTitle: resolveLocaleValue(locale, enhancersTitleMessages),
  getEnhancerTitle: (slug: string) =>
    enhancerTitleMessages[slug] ? resolveLocaleValue(locale, enhancerTitleMessages[slug]) : slug,
  githubTitle: resolveLocaleValue(locale, githubTitleMessages),
  githubDescription: resolveLocaleValue(locale, githubDescriptionMessages),
  githubButtonLabel: resolveLocaleValue(locale, githubButtonMessages),
  creditsTitle: resolveLocaleValue(locale, creditsTitleMessages),
  creditsDescription: resolveLocaleValue(locale, creditsDescriptionMessages),
  disclaimer: resolveLocaleValue(locale, disclaimerMessages),
  backupTitle: resolveLocaleValue(locale, backupTitleMessages),
  backupDescription: resolveLocaleValue(locale, backupDescriptionMessages),
  generateBackupLabel: resolveLocaleValue(locale, generateBackupMessages),
  restoreBackupLabel: resolveLocaleValue(locale, restoreBackupMessages),
  restoreBackupErrorMessage: resolveLocaleValue(locale, restoreBackupErrorMessages),
});

export const Default: Story = {
  name: 'Default (No Changelog)',
  args: {
    appVersion: '',
    githubUrl: '',
    enhancersTitle: '',
    getEnhancerTitle: slug => slug,
    githubTitle: '',
    githubDescription: '',
    githubButtonLabel: '',
    creditsTitle: '',
    creditsDescription: '',
    disclaimer: '',
  },
  render: (args, { globals }) => {
    const messages = getMessages(globals.locale as string);

    return (
      <PageSettings
        appVersion="2.5.3"
        githubUrl="https://github.com/exile-center/better-trading"
        {...messages}
        data-locale={globals.locale}
      />
    );
  },
};

export const WithChangelog: Story = {
  name: 'With Changelog',
  args: {
    appVersion: '',
    githubUrl: '',
    enhancersTitle: '',
    getEnhancerTitle: slug => slug,
    githubTitle: '',
    githubDescription: '',
    githubButtonLabel: '',
    creditsTitle: '',
    creditsDescription: '',
    disclaimer: '',
  },
  render: (args, { globals }) => {
    const messages = getMessages(globals.locale as string);
    const changelogMarkdown = resolveLocaleValue(globals.locale as string, changelogMarkdownMessages);

    return (
      <PageSettings
        appVersion="2.5.3"
        githubUrl="https://github.com/exile-center/better-trading"
        currentChangelog={{
          slug: '2.0.0',
          markdown: changelogMarkdown,
        }}
        {...messages}
        data-locale={globals.locale}
      />
    );
  },
};

export const Complete: Story = {
  name: 'Complete Example',
  args: {
    appVersion: '',
    githubUrl: '',
    enhancersTitle: '',
    getEnhancerTitle: slug => slug,
    githubTitle: '',
    githubDescription: '',
    githubButtonLabel: '',
    creditsTitle: '',
    creditsDescription: '',
    disclaimer: '',
  },
  render: (args, { globals }) => {
    const messages = getMessages(globals.locale as string);
    const changelogMarkdown = resolveLocaleValue(globals.locale as string, changelogMarkdownMessages);

    return (
      <PageSettings
        appVersion="2.5.3"
        githubUrl="https://github.com/exile-center/better-trading"
        discordUrl="https://discord.gg/example"
        chaosRecipeOverlayUrl="https://example.com"
        currentChangelog={{
          slug: '2.0.0',
          markdown: changelogMarkdown,
        }}
        {...messages}
        data-locale={globals.locale}
      />
    );
  },
};

export default meta;
