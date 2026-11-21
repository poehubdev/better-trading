import Backup from './Backup';
import styles from './styles.module.scss';
import FormCheckbox from '@/components/FormCheckbox';
import MarkdownChangelog from '@/components/MarkdownChangelog';
import Modal from '@/components/Modal';
import { useItemResults } from '@/hooks/useItemResults';
import { getIsPanelBlurEnabled, setIsPanelBlurEnabled } from '@/utils/panel-blur';
import { getIsPanelScrollbarVisible, setIsPanelScrollbarVisible } from '@/utils/panel-scrollbar';
import classnames from 'classnames';
import { useState } from 'react';
import type { ChangelogData } from '@/components/ChangelogBanner';

interface Enhancer {
  slug: string;
  isEnabled: boolean;
}

interface PageSettingsProps {
  appVersion: string;
  githubUrl: string;
  discordUrl?: string;
  chaosRecipeOverlayUrl?: string;
  currentChangelog?: ChangelogData;
  enhancersTitle: string;
  /** Resolves the display title of an enhancer from its slug */
  getEnhancerTitle: (slug: string) => string;
  githubLinkLabel: string;
  /** Footer link label and changelog modal title */
  changelogLabel: string;
  modalCloseLabel: string;
  logoAlt: string;
  /** Trusted static HTML: the current maintainer */
  maintainer: string;
  /** Trusted static HTML: tribute to the original authors */
  credits: string;
  disclaimer: string;
  appearanceTitle: string;
  panelBlurLabel: string;
  panelScrollbarLabel: string;
  backupTitle: string;
  backupDescription: string;
  generateBackupLabel: string;
  restoreBackupLabel: string;
  restoreBackupErrorMessage: string;
  className?: string;
}

const useEnhancers = () => {
  const { disabledEnhancerSlugs, setDisabledEnhancerSlugs, enhancerSlugs } = useItemResults();

  const enhancers: Enhancer[] = enhancerSlugs.map(slug => ({
    slug,
    isEnabled: !disabledEnhancerSlugs.includes(slug),
  }));

  const toggleDisabledEnhancerSlug = (slug: string, isEnabled: boolean) => {
    let updatedDisabledEnhancerSlugs = [...disabledEnhancerSlugs];

    if (isEnabled) {
      updatedDisabledEnhancerSlugs = updatedDisabledEnhancerSlugs.filter(disabledSlug => disabledSlug !== slug);
    } else {
      updatedDisabledEnhancerSlugs.push(slug);
    }

    setDisabledEnhancerSlugs(updatedDisabledEnhancerSlugs);
  };

  return { enhancers, toggleDisabledEnhancerSlug };
};

/**
 * PageSettings component - settings (enhancers, backup) first, then a quiet footer with links, changelog and credits
 * Migrated from old-extension/app/pods/components/page/about
 */
const PageSettings = ({
  appVersion,
  githubUrl,
  currentChangelog,
  enhancersTitle,
  getEnhancerTitle,
  githubLinkLabel,
  changelogLabel,
  modalCloseLabel,
  logoAlt,
  maintainer,
  credits,
  disclaimer,
  appearanceTitle,
  panelBlurLabel,
  panelScrollbarLabel,
  backupTitle,
  backupDescription,
  generateBackupLabel,
  restoreBackupLabel,
  restoreBackupErrorMessage,
  className,
}: PageSettingsProps) => {
  const { enhancers, toggleDisabledEnhancerSlug } = useEnhancers();
  const [changelogIsOpen, setChangelogIsOpen] = useState(false);
  const [isPanelBlurEnabled, setIsPanelBlurEnabledState] = useState(getIsPanelBlurEnabled);

  const togglePanelBlur = (isEnabled: boolean) => {
    setIsPanelBlurEnabled(isEnabled);
    setIsPanelBlurEnabledState(isEnabled);
  };

  const [isPanelScrollbarVisible, setIsPanelScrollbarVisibleState] = useState(getIsPanelScrollbarVisible);

  const togglePanelScrollbar = (isVisible: boolean) => {
    setIsPanelScrollbarVisible(isVisible);
    setIsPanelScrollbarVisibleState(isVisible);
  };

  return (
    <div className={classnames(className)}>
      <div className={styles.sections}>
        <section className={styles.section}>
          <h1 className={styles.sectionTitle}>{enhancersTitle}</h1>

          {enhancers.map(enhancer => (
            <FormCheckbox
              key={enhancer.slug}
              className={styles.enhancerCheckbox}
              value={enhancer.isEnabled}
              label={getEnhancerTitle(enhancer.slug)}
              onChange={newValue => toggleDisabledEnhancerSlug(enhancer.slug, newValue)}
            />
          ))}
        </section>

        <section className={styles.section}>
          <h1 className={styles.sectionTitle}>{appearanceTitle}</h1>

          <FormCheckbox
            className={styles.enhancerCheckbox}
            value={isPanelBlurEnabled}
            label={panelBlurLabel}
            onChange={togglePanelBlur}
          />

          <FormCheckbox
            className={styles.enhancerCheckbox}
            value={isPanelScrollbarVisible}
            label={panelScrollbarLabel}
            onChange={togglePanelScrollbar}
          />
        </section>

        <section className={styles.section}>
          <h1 className={styles.sectionTitle}>{backupTitle}</h1>

          <p className={styles.sectionDescription}>{backupDescription}</p>

          <Backup
            generateButtonLabel={generateBackupLabel}
            restoreButtonLabel={restoreBackupLabel}
            restoreErrorMessage={restoreBackupErrorMessage}
          />
        </section>
      </div>

      <footer className={styles.footer}>
        <p className={styles.footerLinks}>
          <a href={githubUrl} target="_blank" rel="noopener noreferrer">
            {githubLinkLabel}
          </a>
          <span className={styles.version}>{appVersion}</span>
          {currentChangelog && (
            <button type="button" className={styles.linkButton} onClick={() => setChangelogIsOpen(true)}>
              {changelogLabel}
            </button>
          )}
        </p>

        <p className={styles.maintainer} dangerouslySetInnerHTML={{ __html: maintainer }} />
        <p className={styles.credits} dangerouslySetInnerHTML={{ __html: credits }} />
        <p className={styles.disclaimer}>{disclaimer}</p>
      </footer>

      {currentChangelog && (
        <Modal
          title={changelogLabel}
          closeLabel={modalCloseLabel}
          logoAlt={logoAlt}
          isOpen={changelogIsOpen}
          onClose={() => setChangelogIsOpen(false)}>
          <MarkdownChangelog markdown={currentChangelog.markdown} />
        </Modal>
      )}
    </div>
  );
};

export default PageSettings;
export type { PageSettingsProps, Enhancer };
