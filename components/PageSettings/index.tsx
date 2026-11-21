import Backup from './Backup';
import styles from './styles.module.scss';
import GithubIcon from '@/assets/icons/brands/github.svg?react';
import Button from '@/components/Button';
import FormCheckbox from '@/components/FormCheckbox';
import MarkdownChangelog from '@/components/MarkdownChangelog';
import { useItemResults } from '@/hooks/useItemResults';
import classnames from 'classnames';
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
  githubTitle: string;
  githubDescription: string;
  githubButtonLabel: string;
  creditsTitle: string;
  /** Trusted static HTML */
  creditsDescription: string;
  disclaimer: string;
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
 * PageSettings component - settings page with changelog, enhancers, backup tools, links and credits
 * Migrated from old-extension/app/pods/components/page/about
 */
const PageSettings = ({
  appVersion,
  githubUrl,
  currentChangelog,
  enhancersTitle,
  getEnhancerTitle,
  githubTitle,
  githubDescription,
  githubButtonLabel,
  creditsTitle,
  creditsDescription,
  disclaimer,
  backupTitle,
  backupDescription,
  generateBackupLabel,
  restoreBackupLabel,
  restoreBackupErrorMessage,
  className,
}: PageSettingsProps) => {
  const { enhancers, toggleDisabledEnhancerSlug } = useEnhancers();

  return (
    <div className={classnames(className)}>
      <div className={styles.sections}>
        {currentChangelog && (
          <section className={styles.section}>
            <MarkdownChangelog markdown={currentChangelog.markdown} />
          </section>
        )}

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
          <h1 className={styles.sectionTitle}>{backupTitle}</h1>

          <p className={styles.sectionDescription}>{backupDescription}</p>

          <Backup
            generateButtonLabel={generateBackupLabel}
            restoreButtonLabel={restoreBackupLabel}
            restoreErrorMessage={restoreBackupErrorMessage}
          />
        </section>

        <section className={styles.section}>
          <h1 className={styles.sectionTitle}>{githubTitle}</h1>

          <p className={styles.sectionDescription}>{githubDescription}</p>

          <Button href={githubUrl} theme="blue" icon={GithubIcon} label={githubButtonLabel} />
        </section>

        <section className={styles.section}>
          <h1 className={styles.sectionTitle}>{creditsTitle}</h1>

          <p className={styles.sectionDescription} dangerouslySetInnerHTML={{ __html: creditsDescription }} />
        </section>
      </div>

      <p className={styles.disclaimer}>{disclaimer}</p>

      <p className={styles.version}>{appVersion}</p>
    </div>
  );
};

export default PageSettings;
export type { PageSettingsProps, Enhancer };
