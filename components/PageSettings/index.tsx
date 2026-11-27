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
  getLogoSoundVolume,
  isLogoSoundEnabled,
  playLogoSound,
  setLogoSoundEnabled,
  setLogoSoundVolume,
} from '@/utils/logo-sound';
import { LOGO_THROWS, getLogoThrow, setLogoThrow } from '@/utils/logo-throw';
import { getIsPanelBlurEnabled, setIsPanelBlurEnabled } from '@/utils/panel-blur';
import { getIsPanelScrollbarVisible, setIsPanelScrollbarVisible } from '@/utils/panel-scrollbar';
import {
  ROLL_FLOOR_KINDS,
  getRollFloorKind,
  getRollFloorPercent,
  getSkipEarlierLoadouts,
  getWeightedSum,
  setRollFloorKind,
  setRollFloorPercent,
  setSkipEarlierLoadouts,
  setWeightedSum,
} from '@/utils/pob-import-options';
import classnames from 'classnames';
import { useState } from 'react';
import type { ChangelogData } from '@/components/ChangelogBanner';
import type { LogoThrow } from '@/utils/logo-throw';
import type { RollFloorKind } from '@/utils/pob-import-options';

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
  logoSoundVolumeLabel: string;
  formatVolume: (volume: number) => string;
  pobImportTitle: string;
  pobImportDescription: string;
  rollFloorLabel: string;
  rollFloorOptionLabels: Record<RollFloorKind, string>;
  rollFloorPercentLabel: string;
  weightedSumLabel: string;
  skipEarlierLoadoutsLabel: string;
  pilferingRingTitle: string;
  pilferingRingResetHint: string;
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
  logoSoundVolumeLabel,
  formatVolume,
  pobImportTitle,
  pobImportDescription,
  rollFloorLabel,
  rollFloorOptionLabels,
  rollFloorPercentLabel,
  weightedSumLabel,
  skipEarlierLoadoutsLabel,
  pilferingRingTitle,
  pilferingRingResetHint,
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

  const [isLogoSoundOn, setIsLogoSoundOnState] = useState(isLogoSoundEnabled);
  const [logoSoundVolume, setLogoSoundVolumeState] = useState(getLogoSoundVolume);

  // Turning the sound on plays it, so its volume can be heard right away
  const toggleLogoSound = (isOn: boolean) => {
    setLogoSoundEnabled(isOn);
    setIsLogoSoundOnState(isOn);
    if (isOn) void playLogoSound();
  };

  const changeLogoSoundVolume = (newVolume: number) => {
    setLogoSoundVolume(newVolume);
    setLogoSoundVolumeState(newVolume);
  };

  const [rollFloorKind, setRollFloorKindState] = useState(getRollFloorKind);
  const [rollFloorPercent, setRollFloorPercentState] = useState(getRollFloorPercent);
  const [isWeightedSumOn, setIsWeightedSumOnState] = useState(getWeightedSum);
  const [isSkipEarlierLoadoutsOn, setIsSkipEarlierLoadoutsOnState] = useState(getSkipEarlierLoadouts);

  const changeRollFloorKind = (kind: RollFloorKind) => {
    setRollFloorKind(kind);
    setRollFloorKindState(kind);
  };

  const changeRollFloorPercent = (percent: number) => {
    setRollFloorPercent(percent);
    setRollFloorPercentState(percent);
  };

  const toggleWeightedSum = (isOn: boolean) => {
    setWeightedSum(isOn);
    setIsWeightedSumOnState(isOn);
  };

  const toggleSkipEarlierLoadouts = (isOn: boolean) => {
    setSkipEarlierLoadouts(isOn);
    setIsSkipEarlierLoadoutsOnState(isOn);
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

          {/* Opening bookmarks makes no sound; the volume only matters while the sound is on */}
          {logoThrow !== 'none' && (
            <>
              <FormCheckbox
                className={styles.enhancerCheckbox}
                value={isLogoSoundOn}
                label={logoSoundLabel}
                onChange={toggleLogoSound}
              />

              {isLogoSoundOn && (
                <FormRange
                  className={styles.enhancerCheckbox}
                  label={logoSoundVolumeLabel}
                  value={logoSoundVolume}
                  valueText={formatVolume(logoSoundVolume)}
                  onChange={changeLogoSoundVolume}
                />
              )}
            </>
          )}
        </section>
        <section className={styles.section}>
          <h1 className={styles.sectionTitle}>{pobImportTitle}</h1>

          <p className={styles.sectionDescription}>{pobImportDescription}</p>

          <FormRadioGroup
            className={styles.enhancerCheckbox}
            label={rollFloorLabel}
            options={ROLL_FLOOR_KINDS.map(value => ({ value, label: rollFloorOptionLabels[value] }))}
            value={rollFloorKind}
            onChange={changeRollFloorKind}
          />

          <FormRange
            className={styles.enhancerCheckbox}
            label={rollFloorPercentLabel}
            value={rollFloorPercent}
            step={5}
            valueText={formatVolume(rollFloorPercent)}
            disabled={rollFloorKind !== 'percent'}
            onChange={changeRollFloorPercent}
          />

          <FormCheckbox
            className={styles.enhancerCheckbox}
            value={isWeightedSumOn}
            label={weightedSumLabel}
            onChange={toggleWeightedSum}
          />

          <FormCheckbox
            className={styles.enhancerCheckbox}
            value={isSkipEarlierLoadoutsOn}
            label={skipEarlierLoadoutsLabel}
            onChange={toggleSkipEarlierLoadouts}
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

        <PilferingRing
          className={styles.section}
          titleClassName={styles.sectionTitle}
          title={pilferingRingTitle}
          resetHint={pilferingRingResetHint}
        />
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
