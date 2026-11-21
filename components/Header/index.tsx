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
import { getExtensionUrl } from '@/utils/extension-url';
import { collapseSidePanel, initializeSidePanelCollapse } from '@/utils/side-panel-collapse';
import { useCallback, useEffect } from 'react';
import type { FC, MouseEvent } from 'react';

// Easter egg: a clone of the logo drops to the bottom of the viewport, bounces and fades out
const dropLogoBall = (logo: HTMLImageElement) => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const rect = logo.getBoundingClientRect();
  const ball = logo.cloneNode() as HTMLImageElement;
  ball.className = styles.ball ?? '';
  Object.assign(ball.style, {
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  });
  document.body.append(ball);

  const random = (min: number, max: number) => min + Math.random() * (max - min);
  const minX = -rect.left;
  const maxX = window.innerWidth - rect.right;
  const floor = window.innerHeight - rect.bottom;
  const radius = rect.width / 2;

  // Simple ballistic simulation (px, px/s): gravity, lossy bounces on the floor and the viewport sides
  const gravity = 4200;
  const restitution = 0.5;
  let x = 0;
  let y = 0;
  let angle = 0;
  // Thrown left or right fast enough to cross the whole viewport; the side walls bounce it back
  let vx = (Math.random() < 0.5 ? -1 : 1) * window.innerWidth * random(0.5, 0.8);
  let vy = -random(500, 1000);
  let settled = false;
  let last = performance.now();

  const step = (now: number) => {
    if (!ball.isConnected) return;
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;

    vy += gravity * dt;
    x += vx * dt;
    y += vy * dt;

    if (y >= floor) {
      y = floor;
      vy = -vy * restitution;
      vx *= 0.85;
      if (Math.abs(vy) < 150) vy = 0;
    }
    if (x <= minX || x >= maxX) {
      x = Math.min(Math.max(x, minX), maxX);
      vx = -vx * 0.6;
    }
    if (y === floor && vy === 0) vx *= 1 - 3 * dt;

    // Rolls with its horizontal speed, as a ball would
    angle += (vx * dt) / radius;
    ball.style.transform = `translate(${x}px, ${y}px) rotate(${angle}rad)`;

    if (!settled && y === floor && vy === 0) {
      settled = true;
      ball
        .animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, delay: 150, fill: 'forwards' })
        .finished.finally(() => ball.remove());
    }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
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
  /** Callback when brand logo is clicked */
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
  useEffect(() => {
    initializeSidePanelCollapse();
  }, []);

  const handleCollapse = useCallback(() => {
    collapseSidePanel();
  }, []);

  const handleBrandClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const logo = event.currentTarget.querySelector('img');
      if (logo) dropLogoBall(logo);
      onBrandClick?.();
    },
    [onBrandClick],
  );

  const logoUrl = getExtensionUrl('/assets/images/logo.svg');

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
