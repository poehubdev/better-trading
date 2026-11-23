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
import { playLogoSound, prepareLogoSound } from '@/utils/logo-sound';
import { MIRROR_IMAGE, getLogoThrow, pickCurrencyImage } from '@/utils/logo-throw';
import { countCurrencyDrop } from '@/utils/pilfering-ring';
import { collapseSidePanel, initializeSidePanelCollapse } from '@/utils/side-panel-collapse';
import { useCallback, useEffect } from 'react';
import type { FC, MouseEvent } from 'react';

/**
 * Easter egg: throws a clone of the logo out of the header like a ball. It flies in a random upward direction,
 * falls under gravity, bounces off the bottom and the sides of the viewport, rolls along the bottom until friction
 * stops it, then fades out and removes itself.
 *
 * The physics is a tiny hand-rolled simulation stepped once per animation frame. All units are CSS pixels and
 * seconds (speeds in px/s, accelerations in px/s²). The y axis points down, as in the DOM.
 *
 * `power` (0..1) scales the throw speed: 0 is a weak hop, 1 a throw that crosses the whole viewport.
 * `src` swaps the clone's image (a currency), keeping the logo's size and starting spot.
 */
const dropLogoBall = (logo: HTMLImageElement, power: number, src?: string) => {
  // Purely decorative motion: respect the OS "reduce motion" setting and do nothing
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Clone the logo and pin it exactly over the original, so the ball appears to pop out of the header.
  // `.ball` is `position: fixed` (viewport coordinates, unaffected by page scroll) and ignores the pointer.
  const rect = logo.getBoundingClientRect();
  const ball = logo.cloneNode() as HTMLImageElement;
  if (src) ball.src = src;
  ball.className = styles.ball ?? '';
  Object.assign(ball.style, {
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  });
  // Appended to <body> rather than the header, so the side panel's overflow and transforms can't clip it
  document.body.append(ball);

  const random = (min: number, max: number) => min + Math.random() * (max - min);

  // The ball is moved with `transform: translate(x, y)`, so x/y are offsets from its starting spot, not absolute
  // coordinates. The bounds below are therefore expressed relative to that spot too:
  //  - minX: offset at which the ball's left edge touches the left side of the viewport
  //  - maxX: offset at which its right edge touches the right side
  //  - floor: offset at which its bottom edge touches the bottom of the viewport
  //  - ceiling: offset at which its top edge touches the top of the viewport. The header sits at the top, so without
  //    it a strong throw would vanish off-screen for a second or more.
  const minX = -rect.left;
  const maxX = window.innerWidth - rect.right;
  const floor = window.innerHeight - rect.bottom;
  const ceiling = -rect.top;
  const radius = rect.width / 2;

  // Tuning knobs. They're exaggerated compared to real-world physics so the whole show lasts about a second or two.
  const gravity = 4200; // downward acceleration, px/s²
  const restitution = 0.55; // share of vertical speed kept after a floor bounce (1 = perfectly elastic)

  // State: position offset (px), rotation (rad) and velocity (px/s)
  let x = 0;
  let y = 0;
  let angle = 0;
  // Initial throw: a random direction anywhere in the upper half-plane, from flat left (π) through straight up (π/2)
  // to flat right (0). Speed grows linearly with `power`, with ±15% jitter so throws of equal power still differ.
  // vy is negated because "up" is negative y on screen.
  const throwAngle = random(0, Math.PI);
  const speed = (600 + power * 2000) * random(0.85, 1.15);
  let vx = Math.cos(throwAngle) * speed;
  let vy = -Math.sin(throwAngle) * speed;
  let settled = false; // set once the ball has stopped and the fade-out has started
  let last = performance.now(); // timestamp of the previous frame, for the time step

  const step = (now: number) => {
    // The ball gets removed after its fade-out. That ends the loop.
    if (!ball.isConnected) return;

    // Seconds elapsed since the previous frame. Capped at 1/30 s so that a long pause (a background tab, a jank
    // spike) doesn't produce one huge step that would tunnel the ball through the floor or a wall.
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;

    // Semi-implicit Euler integration: update velocity from acceleration first, then position from the new velocity.
    // Stable enough for this, and much simpler than anything more accurate.
    vy += gravity * dt;
    x += vx * dt;
    y += vy * dt;

    // Floor hit: snap back onto the floor and reflect the vertical speed, losing energy (restitution).
    // Each impact also scrubs off some horizontal speed (friction during contact).
    // Small bounces would go on forever with exponentially shrinking heights, so below 150 px/s the ball stops
    // bouncing and stays on the floor (vy = 0). From then on it can only roll.
    if (y >= floor) {
      y = floor;
      vy = -vy * restitution;
      vx *= 0.85;
      if (Math.abs(vy) < 150) vy = 0;
    }

    // Ceiling hit: clamp and send it back down, keeping 60% of the speed like the side walls
    if (y <= ceiling) {
      y = ceiling;
      vy = -vy * 0.6;
    }

    // Side wall hit: clamp inside the viewport and reflect the horizontal speed, keeping 60% of it
    if (x <= minX || x >= maxX) {
      x = Math.min(Math.max(x, minX), maxX);
      vx = -vx * 0.6;
    }

    // Rolling resistance while resting on the floor: a constant deceleration (1500 px/s²) toward zero, never past it.
    // Unlike a percentage decay, which only approaches zero, this brings the ball to a real, finite stop.
    if (y === floor && vy === 0) vx = Math.sign(vx) * Math.max(0, Math.abs(vx) - 1500 * dt);

    // Spin with the horizontal speed as if rolling without slipping: arc length = radius × angle, so the angle
    // changes by distance / radius. This also gives it a believable spin in the air.
    angle += (vx * dt) / radius;
    ball.style.transform = `translate(${x}px, ${y}px) rotate(${angle}rad)`;

    // Fully at rest on the floor: no bounce, no roll. Fade out after a short beat, then remove the element, which
    // also stops this loop (see the isConnected check above). `settled` makes sure the fade is started only once.
    if (!settled && y === floor && vy === 0 && vx === 0) {
      settled = true;
      ball
        .animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, delay: 150, fill: 'forwards' })
        .finished.finally(() => ball.remove());
    }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
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
      // A game without currency images yet falls back to the logo
      const currency = logoThrow === 'currency' ? pickCurrencyImage() : null;
      const isMirror = !!currency?.endsWith(`/${MIRROR_IMAGE}`);
      // Cold audio context: wait for it before the animation, otherwise the sound lags and its start is clipped
      await prepareLogoSound(isMirror);
      if (logo) {
        dropLogoBall(logo, power, currency ? getExtensionUrl(currency) : undefined);
        // Exile's Pilfering Ring in the settings counts what dropped
        if (currency) countCurrencyDrop(currency);
      }
      void playLogoSound(power, isMirror);
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
