// React version of the former Ember `header` component.
// Migrated from: old-extension/app/pods/components/header
// Responsibilities:
//  - Display the Better Trading header with logo and title
//  - Trigger collapse of the side panel
//  - Provide navigation buttons (settings/close)

import styles from './styles.module.scss';
import AngleRightIcon from '@/assets/icons/filled/angle-right.svg?react';
import CloseIcon from '@/assets/icons/filled/close.svg?react';
import SettingsIcon from '@/assets/icons/filled/settings-gear-6.svg?react';
import { throwBall } from '@/utils/ball-throw';
import { getExtensionUrl } from '@/utils/extension-url';
import { playLogoSound, prepareLogoSound } from '@/utils/logo-sound';
import { MIRROR_IMAGE, getHeldCurrency, getLogoThrow, pickCurrencyImage, setHeldCurrency } from '@/utils/logo-throw';
import { countCurrencyDrop } from '@/utils/pilfering-ring';
import { collapseSidePanel, initializeSidePanelCollapse } from '@/utils/side-panel-collapse';
import { useCallback, useEffect, useState } from 'react';
import type { FC, MouseEvent } from 'react';

// Pop played by the original logo when it "launches" the clone. One is picked at random per click.
// Each is a list of WAAPI keyframes; they are added on top of the hover rotation (`composite: 'add'`), so the logo
// doesn't snap back to 0° under the cursor.
const LOGO_POPS: Keyframe[][] = [
  // Pop: squeezed by the launch, then overshoots
  [
    { transform: 'scale(1)' },
    { transform: 'scale(0.7)', offset: 0.25 },
    { transform: 'scale(1.2)', offset: 0.6 },
    { transform: 'scale(1)' },
  ],
  // Jelly: squash and stretch
  [
    { transform: 'scale(1, 1)' },
    { transform: 'scale(1.3, 0.7)', offset: 0.2 },
    { transform: 'scale(0.85, 1.2)', offset: 0.5 },
    { transform: 'scale(1.05, 0.95)', offset: 0.75 },
    { transform: 'scale(1, 1)' },
  ],
  // Wobble: a damped swing
  [
    { transform: 'rotate(0)' },
    { transform: 'rotate(-25deg)', offset: 0.2 },
    { transform: 'rotate(18deg)', offset: 0.45 },
    { transform: 'rotate(-10deg)', offset: 0.7 },
    { transform: 'rotate(0)' },
  ],
];

/**
 * Easter egg: the logo "launches" a ball out of the header (see `throwBall`).
 * `power` (0..1) scales the throw speed. `src` swaps the ball's image (a currency), keeping the logo's size and spot.
 */
const dropLogoBall = (logo: HTMLImageElement, power: number, src?: string) => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  logo.animate(LOGO_POPS[Math.floor(Math.random() * LOGO_POPS.length)] ?? [], {
    duration: 450,
    easing: 'ease-out',
    composite: 'add',
  });
  throwBall({ src: src ?? logo.src, from: logo.getBoundingClientRect(), power });
};

// Click-rate sensitivity for the easter egg: each click that follows the previous one within CLICK_COOLDOWN_DOUBLING ms
// extends a streak, and a longer streak throws harder. Idle time cools the streak down like a falling object: slowly
// at first, then faster, the levels lost doubling every CLICK_COOLDOWN_DOUBLING ms, so a lone click after a long
// pause is a weak throw.
// Module-level because there is a single header and the streak should survive re-renders.
// Cooldown curve: 1 level lost after this many ms idle, 3 after twice that, 7, 14... (full cooldown in 4 steps)
const CLICK_COOLDOWN_DOUBLING = 500;
// Streak length at which the throw reaches full power: 15 levels, from a lone click (0) to 14 quick follow-ups
const CLICK_STREAK_MAX = 14;
let clickStreak = 0;
let lastClickAt = 0;

// Levels lost after `idle` ms without clicks: 2^(idle / doubling) - 1, rounded down
const cooledLevels = (idle: number) => Math.floor(2 ** (idle / CLICK_COOLDOWN_DOUBLING) - 1);
// Streak left after cooling down since the last click; -1 means fully cooled, so the next click lands on 0
const cooledStreak = (now: number) => Math.max(clickStreak - cooledLevels(now - lastClickAt), -1);

const nextThrowPower = () => {
  const now = performance.now();
  clickStreak = Math.min(cooledStreak(now) + 1, CLICK_STREAK_MAX);
  lastClickAt = now;
  return clickStreak / CLICK_STREAK_MAX;
};

interface HeaderProps {
  /** The title to display in the header */
  title: string;
  /** Alt text of the logo */
  logoAlt: string;
  /** Aria label of the collapse button */
  collapseLabel: string;
  /** Aria label of the toggle button while on the root route */
  showSettingsLabel: string;
  /** Aria label of the toggle button while on a sub route */
  showMainLabel: string;
  /** Whether the current route is the root route */
  isOnRootRoute?: boolean;
  /** Callback when the brand logo is clicked while the logo throw is off (it then acts as the home button) */
  onBrandClick?: () => void;
  /** Callback when toggle button is clicked */
  onToggleClick?: () => void;
}

/**
 * Header component with collapse/expand functionality and navigation
 */
const Header: FC<HeaderProps> = ({
  title,
  logoAlt,
  collapseLabel,
  showSettingsLabel,
  showMainLabel,
  isOnRootRoute = true,
  onBrandClick,
  onToggleClick,
}) => {
  // Currency mode: the currency sitting in the logo's spot, thrown by the next click. Null until the first click;
  // remembered across page loads.
  const [heldCurrency, setHeldCurrencyState] = useState<string | null>(getHeldCurrency);

  useEffect(() => {
    initializeSidePanelCollapse();
  }, []);

  const handleCollapse = useCallback(() => {
    collapseSidePanel();
  }, []);

  const handleBrandClick = useCallback(
    async (event: MouseEvent<HTMLButtonElement>) => {
      const logo = event.currentTarget.querySelector('img');
      const logoThrow = getLogoThrow();
      // Easter egg off: the logo is a plain "home" button, no throw, no sound
      if (logoThrow === 'none') {
        onBrandClick?.();
        return;
      }
      const power = nextThrowPower();
      // Throws the held currency (a fresh pick while the logo still shows). A game without currency images yet falls
      // back to the logo.
      const currency = logoThrow === 'currency' ? (heldCurrency ?? pickCurrencyImage()) : null;
      const isMirror = !!currency?.endsWith(`/${MIRROR_IMAGE}`);
      // Cold audio context: wait for it before the animation, otherwise the sound lags and its start is clipped
      await prepareLogoSound(isMirror);
      if (logo) {
        dropLogoBall(logo, power, currency ? getExtensionUrl(currency) : undefined);
        // Exile's Pilfering Ring in the settings counts what dropped
        if (currency) countCurrencyDrop(currency);
      }
      // The next currency takes the thrown one's spot (after the clone above was made from it)
      if (currency) {
        const next = pickCurrencyImage();
        setHeldCurrency(next);
        setHeldCurrencyState(next);
      }
      void playLogoSound(power, isMirror);
    },
    [heldCurrency, onBrandClick],
  );

  // Back to the logo once the throw is switched off currency in the settings
  const logoUrl = getExtensionUrl(
    heldCurrency && getLogoThrow() === 'currency' ? heldCurrency : '/assets/images/logo.svg',
  );

  return (
    <div className={styles.container}>
      <div>
        <button onClick={handleCollapse} type="button" className={styles.headerButton} aria-label={collapseLabel}>
          <AngleRightIcon className={styles.collapseIcon} />
        </button>

        <button onClick={handleBrandClick} className={styles.brand} type="button">
          <img className={styles.logo} src={logoUrl} alt={logoAlt} />
          <div className={styles.title}>{title}</div>
        </button>

        <button
          onClick={onToggleClick}
          type="button"
          className={styles.headerButton}
          aria-label={isOnRootRoute ? showSettingsLabel : showMainLabel}>
          {isOnRootRoute ? <SettingsIcon className={styles.settingsIcon} /> : <CloseIcon />}
        </button>
      </div>
    </div>
  );
};

export default Header;
export type { HeaderProps };
