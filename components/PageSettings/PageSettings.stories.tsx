import PageSettings from './index.tsx';
import { BookmarksProvider } from '@/contexts/BookmarksContext';
import { logoAltMessages, modalCloseMessages } from '@/.storybook/common-messages';
import { resolveLocaleValue, defineMessages } from '@/.storybook/locale-utils';
import { MockItemResultsProvider } from '@/.storybook/mock-providers';
import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * PageSettings component displays settings first, then a footer with links, changelog and credits.
 */
const meta = {
  component: PageSettings,
  title: 'Pages/PageSettings',
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  // Strings come from the locale in each story's render
  args: {
    appearanceTitle: '',
    panelBlurLabel: '',
    panelScrollbarLabel: '',
    logoThrowLabel: '',
    logoThrowOptionLabels: { none: '', logo: '', currency: '' },
    logoSoundLabel: '',
    logoSoundVolumeLabel: '',
    formatVolume: volume => `${volume}%`,
    pilferingRingTitle: '',
    pilferingRingResetLabel: '',
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

const changelogLabelMessages = defineMessages({
  'en-US': 'Changelog',
  'fr-FR': 'Notes de version',
  'es-ES': 'Novedades',
  'de-DE': 'Änderungsprotokoll',
  'pt-BR': 'Novidades',
  'ru-RU': 'Список изменений',
  'zh-CN': '更新日志',
  'ja-JP': '変更履歴',
  'ko-KR': '변경 사항',
  'th-TH': 'บันทึกการเปลี่ยนแปลง',
});

const maintainerMessages = defineMessages({
  'en-US': 'Maintained by <strong>Message</strong> (<a href="https://github.com/message">@message</a>)',
  'fr-FR': 'Maintenu par <strong>Message</strong> (<a href="https://github.com/message">@message</a>)',
  'es-ES': 'Mantenido por <strong>Message</strong> (<a href="https://github.com/message">@message</a>)',
  'de-DE': 'Gepflegt von <strong>Message</strong> (<a href="https://github.com/message">@message</a>)',
  'pt-BR': 'Mantido por <strong>Message</strong> (<a href="https://github.com/message">@message</a>)',
  'ru-RU': 'Поддерживается <strong>Message</strong> (<a href="https://github.com/message">@message</a>)',
  'zh-CN': '维护者：<strong>Message</strong>（<a href="https://github.com/message">@message</a>）',
  'ja-JP': 'メンテナー：<strong>Message</strong>（<a href="https://github.com/message">@message</a>）',
  'ko-KR': '관리자: <strong>Message</strong> (<a href="https://github.com/message">@message</a>)',
  'th-TH': 'ดูแลโดย <strong>Message</strong> (<a href="https://github.com/message">@message</a>)',
});

const originalAuthors =
  '<strong>InfaMc</strong> (<a href="https://github.com/pboutin">@pboutin</a>) & <strong>brosmike</strong> (<a href="https://github.com/dbjorge">@dbjorge</a>)';
const originalProject = '<a href="https://github.com/exile-center/better-trading">Better Trading</a>';

const creditsMessages = defineMessages({
  'en-US': `Based on ${originalProject} by ${originalAuthors}`,
  'fr-FR': `Basé sur ${originalProject} de ${originalAuthors}`,
  'es-ES': `Basado en ${originalProject} de ${originalAuthors}`,
  'de-DE': `Basiert auf ${originalProject} von ${originalAuthors}`,
  'pt-BR': `Baseado em ${originalProject} de ${originalAuthors}`,
  'ru-RU': `Основано на ${originalProject} от ${originalAuthors}`,
  'zh-CN': `基于 ${originalAuthors} 的 ${originalProject}`,
  'ja-JP': `${originalAuthors} による ${originalProject} をベースにしています`,
  'ko-KR': `${originalAuthors}의 ${originalProject} 기반`,
  'th-TH': `อิงจาก ${originalProject} โดย ${originalAuthors}`,
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

const appearanceTitleMessages = defineMessages({
  'en-US': 'Appearance',
  'fr-FR': 'Apparence',
  'es-ES': 'Apariencia',
  'de-DE': 'Darstellung',
  'pt-BR': 'Aparência',
  'ru-RU': 'Внешний вид',
  'zh-CN': '外观',
  'ja-JP': '外観',
  'ko-KR': '모양',
  'th-TH': 'รูปลักษณ์',
});

const panelScrollbarMessages = defineMessages({
  'en-US': 'Show the panel scrollbar',
  'fr-FR': 'Afficher la barre de défilement du panneau',
  'es-ES': 'Mostrar la barra de desplazamiento del panel',
  'de-DE': 'Bildlaufleiste des Panels anzeigen',
  'pt-BR': 'Mostrar a barra de rolagem do painel',
  'ru-RU': 'Показывать полосу прокрутки панели',
  'zh-CN': '显示面板滚动条',
  'ja-JP': 'パネルのスクロールバーを表示する',
  'ko-KR': '패널 스크롤바 표시',
  'th-TH': 'แสดงแถบเลื่อนของแผง',
});

const panelBlurMessages = defineMessages({
  'en-US': 'Blur the page behind the panel',
  'fr-FR': 'Flouter la page derrière le panneau',
  'es-ES': 'Desenfocar la página detrás del panel',
  'de-DE': 'Seite hinter dem Panel weichzeichnen',
  'pt-BR': 'Desfocar a página atrás do painel',
  'ru-RU': 'Размывать страницу под панелью',
  'zh-CN': '模糊面板后方的页面',
  'ja-JP': 'パネルの背後のページをぼかす',
  'ko-KR': '패널 뒤 페이지 흐리게 하기',
  'th-TH': 'เบลอหน้าเว็บด้านหลังแผง',
});

const logoThrowMessages = defineMessages({
  'en-US': 'Logo click',
  'fr-FR': 'Clic sur le logo',
  'es-ES': 'Clic en el logo',
  'de-DE': 'Klick aufs Logo',
  'pt-BR': 'Clique no logo',
  'ru-RU': 'Клик по логотипу',
  'zh-CN': '点击标志',
  'ja-JP': 'ロゴのクリック',
  'ko-KR': '로고 클릭',
  'th-TH': 'คลิกโลโก้',
});

const logoThrowNoneMessages = defineMessages({
  'en-US': 'Bookmarks',
  'fr-FR': 'Favoris',
  'es-ES': 'Marcadores',
  'de-DE': 'Lesezeichen',
  'pt-BR': 'Favoritos',
  'ru-RU': 'Закладки',
  'zh-CN': '书签',
  'ja-JP': 'ブックマーク',
  'ko-KR': '북마크',
  'th-TH': 'บุ๊กมาร์ก',
});

const logoThrowLogoMessages = defineMessages({
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

const logoThrowCurrencyMessages = defineMessages({
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

const logoSoundMessages = defineMessages({
  'en-US': 'Play a sound',
  'fr-FR': 'Jouer un son',
  'es-ES': 'Reproducir un sonido',
  'de-DE': 'Ton abspielen',
  'pt-BR': 'Tocar um som',
  'ru-RU': 'Воспроизводить звук',
  'zh-CN': '播放音效',
  'ja-JP': '効果音を鳴らす',
  'ko-KR': '소리 재생',
  'th-TH': 'เล่นเสียง',
});

const logoSoundVolumeMessages = defineMessages({
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
  githubLinkLabel: 'GitHub',
  changelogLabel: resolveLocaleValue(locale, changelogLabelMessages),
  modalCloseLabel: resolveLocaleValue(locale, modalCloseMessages),
  logoAlt: resolveLocaleValue(locale, logoAltMessages),
  maintainer: resolveLocaleValue(locale, maintainerMessages),
  credits: resolveLocaleValue(locale, creditsMessages),
  disclaimer: resolveLocaleValue(locale, disclaimerMessages),
  appearanceTitle: resolveLocaleValue(locale, appearanceTitleMessages),
  panelBlurLabel: resolveLocaleValue(locale, panelBlurMessages),
  panelScrollbarLabel: resolveLocaleValue(locale, panelScrollbarMessages),
  logoThrowLabel: resolveLocaleValue(locale, logoThrowMessages),
  logoThrowOptionLabels: {
    none: resolveLocaleValue(locale, logoThrowNoneMessages),
    logo: resolveLocaleValue(locale, logoThrowLogoMessages),
    currency: resolveLocaleValue(locale, logoThrowCurrencyMessages),
  },
  logoSoundLabel: resolveLocaleValue(locale, logoSoundMessages),
  logoSoundVolumeLabel: resolveLocaleValue(locale, logoSoundVolumeMessages),
  formatVolume: (volume: number) => `${volume}%`,
  // ponytail: English only, like githubLinkLabel; add locale maps when the strings are translated
  pilferingRingTitle: "Exile's Pilfering Ring",
  pilferingRingResetLabel: 'Reset',
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
    githubLinkLabel: '',
    changelogLabel: '',
    modalCloseLabel: '',
    logoAlt: '',
    maintainer: '',
    credits: '',
    disclaimer: '',
  },
  render: (args, { globals }) => {
    const messages = getMessages(globals.locale as string);

    return (
      <PageSettings
        appVersion="2.5.3"
        githubUrl="https://github.com/poehubdev/better-trading"
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
    githubLinkLabel: '',
    changelogLabel: '',
    modalCloseLabel: '',
    logoAlt: '',
    maintainer: '',
    credits: '',
    disclaimer: '',
  },
  render: (args, { globals }) => {
    const messages = getMessages(globals.locale as string);
    const changelogMarkdown = resolveLocaleValue(globals.locale as string, changelogMarkdownMessages);

    return (
      <PageSettings
        appVersion="2.5.3"
        githubUrl="https://github.com/poehubdev/better-trading"
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
    githubLinkLabel: '',
    changelogLabel: '',
    modalCloseLabel: '',
    logoAlt: '',
    maintainer: '',
    credits: '',
    disclaimer: '',
  },
  render: (args, { globals }) => {
    const messages = getMessages(globals.locale as string);
    const changelogMarkdown = resolveLocaleValue(globals.locale as string, changelogMarkdownMessages);

    return (
      <PageSettings
        appVersion="2.5.3"
        githubUrl="https://github.com/poehubdev/better-trading"
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
