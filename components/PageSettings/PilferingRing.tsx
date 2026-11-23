import styles from './PilferingRing.module.scss';
import Button from '@/components/Button';
import { getExtensionUrl } from '@/utils/extension-url';
import { getCurrencyImagePaths, getCurrencyName } from '@/utils/logo-throw';
import { getCurrencyCounts, resetCurrencyCounts, subscribeToCurrencyDrops } from '@/utils/pilfering-ring';
import classnames from 'classnames';
import { useEffect, useState } from 'react';

interface PilferingRingProps {
  title: string;
  resetLabel: string;
  /** Section and title classes of the settings page, so the block looks like its siblings */
  className?: string;
  titleClassName?: string;
}

/**
 * PilferingRing component - the Exile's Pilfering Ring easter egg: how many of each currency
 * the logo has thrown so far. Hidden for games without currency images.
 */
const PilferingRing = ({ title, resetLabel, className, titleClassName }: PilferingRingProps) => {
  // The settings stay open while the logo is thrown, so follow the drops live
  const [counts, setCounts] = useState(getCurrencyCounts);
  useEffect(() => subscribeToCurrencyDrops(() => setCounts(getCurrencyCounts())), []);
  const paths = getCurrencyImagePaths();

  if (paths.length === 0) return null;

  return (
    <section className={className}>
      <div className={styles.header}>
        <img className={styles.ring} src={getExtensionUrl('/assets/images/pilfering-ring.png')} alt="" />
        <h1 className={classnames(titleClassName, styles.title)}>{title}</h1>
      </div>

      <ul className={styles.grid}>
        {paths.map(path => (
          <li key={path} className={styles.cell} title={getCurrencyName(path)}>
            <img className={styles.icon} src={getExtensionUrl(path)} alt={getCurrencyName(path)} />
            <span className={styles.count}>{counts[path] ?? 0}</span>
          </li>
        ))}
      </ul>

      {Object.values(counts).some(count => count > 0) && (
        <Button className={styles.reset} theme="gold" label={resetLabel} onClick={resetCurrencyCounts} />
      )}
    </section>
  );
};

export default PilferingRing;
export type { PilferingRingProps };
