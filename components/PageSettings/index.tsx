import Backup from './Backup';
import PilferingRing from './PilferingRing';
import styles from './styles.module.scss';
import FormCheckbox from '@/components/FormCheckbox';
import FormRadioGroup from '@/components/FormRadioGroup';
import FormRange from '@/components/FormRange';
import MarkdownChangelog from '@/components/MarkdownChangelog';
import Modal from '@/components/Modal';
import { useItemResults } from '@/hooks/useItemResults';
import {
  LOGO_SOUNDS,
  getLogoSound,
  getLogoSoundVolume,
  playLogoSound,
  setLogoSound,
  setLogoSoundVolume,
} from '@/utils/logo-sound';
import { LOGO_THROWS, getLogoThrow, setLogoThrow } from '@/utils/logo-throw';
import { getIsPanelBlurEnabled, setIsPanelBlurEnabled } from '@/utils/panel-blur';
import { getIsPanelScrollbarVisible, setIsPanelScrollbarVisible } from '@/utils/panel-scrollbar';
import classnames from 'classnames';
import { useState } from 'react';
import type { ChangelogData } from '@/components/ChangelogBanner';
import type { LogoSound } from '@/utils/logo-sound';
import type { LogoThrow } from '@/utils/logo-throw';

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
  logoThrowLabel: string;
  logoThrowOptionLabels: Record<LogoThrow, string>;
  logoSoundLabel: string;
  logoSoundOptionLabels: Record<LogoSound, string>;
  logoSoundVolumeLabel: string;
  formatVolume: (volume: number) => string;
  pilferingRingTitle: string;
  pilferingRingDescription: string;
  pilferingRingResetLabel: string;
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
  logoThrowLabel,
  logoThrowOptionLabels,
  logoSoundLabel,
  logoSoundOptionLabels,
  logoSoundVolumeLabel,
  formatVolume,
  pilferingRingTitle,
  pilferingRingDescription,
  pilferingRingResetLabel,
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

  const [logoThrow, setLogoThrowState] = useState(getLogoThrow);

  const changeLogoThrow = (newLogoThrow: LogoThrow) => {
    setLogoThrow(newLogoThrow);
    setLogoThrowState(newLogoThrow);
  };

  const [logoSound, setLogoSoundState] = useState(getLogoSound);
  const [logoSoundVolume, setLogoSoundVolumeState] = useState(getLogoSoundVolume);

  // Changing the sound plays it, so the choice can be heard right away
  const changeLogoSound = (newLogoSound: LogoSound) => {
    setLogoSound(newLogoSound);
    setLogoSoundState(newLogoSound);
    void playLogoSound();
  };

  const changeLogoSoundVolume = (newVolume: number) => {
    setLogoSoundVolume(newVolume);
    setLogoSoundVolumeState(newVolume);
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

          <FormRadioGroup
            className={styles.enhancerCheckbox}
            label={logoThrowLabel}
            options={LOGO_THROWS.map(value => ({ value, label: logoThrowOptionLabels[value] }))}
            value={logoThrow}
            onChange={changeLogoThrow}
          />

          <FormRadioGroup
            className={styles.enhancerCheckbox}
            label={logoSoundLabel}
            options={LOGO_SOUNDS.map(value => ({ value, label: logoSoundOptionLabels[value] }))}
            value={logoSound}
            onChange={changeLogoSound}
          />

          <FormRange
            className={styles.enhancerCheckbox}
            label={logoSoundVolumeLabel}
            value={logoSoundVolume}
            valueText={formatVolume(logoSoundVolume)}
            disabled={logoSound === 'none'}
            onChange={changeLogoSoundVolume}
          />
        </section>

        <PilferingRing
          className={styles.section}
          titleClassName={styles.sectionTitle}
          title={pilferingRingTitle}
          description={pilferingRingDescription}
          resetLabel={pilferingRingResetLabel}
        />

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
