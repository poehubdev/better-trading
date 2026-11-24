import styles from './PilferingRing.module.scss';
import { throwBall } from '@/utils/ball-throw';
import { getExtensionUrl } from '@/utils/extension-url';
import { playLogoSound } from '@/utils/logo-sound';
import { getCurrencyImagePaths, getCurrencyName } from '@/utils/logo-throw';
import { getCurrencyCounts, resetCurrencyCounts, subscribeToCurrencyDrops } from '@/utils/pilfering-ring';
import classnames from 'classnames';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CurrencyCounts } from '@/utils/pilfering-ring';
import type React from 'react';

// Hold time of a full reset cast
const CAST_MS = 2000;
// Time to fall from a full channel back to nothing when released early
const DECAY_MS = 700;
// Same size as the header logo (`.logo` height), so the currency flies out as big as the logo throws it
const BALL_SIZE = 30;
// Time over which the thrown currency leaves the button, first to last
const THROW_SPREAD_MS = 100;
const MAX_SOUNDS = 6;
// Channel progress at which the first icon tears off, the spread of the rest, and how long each flies. They all hold
// on until the very end and go nearly together: the last lands at 0.9 + 0.04 + 0.05 = 0.99, right before the burst
const DETACH_FROM = 0.9;
const DETACH_SPREAD = 0.04;
const FLIGHT = 0.05;

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);
// Hold time (0..1) to channel progress: speeds up the longer you hold, from 0.4× to 1.6× the average rate.
// Partly linear so the start still moves, partly quadratic for the build-up.
const accelerate = (time: number) => 0.4 * time + 0.6 * time * time;
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const center = (element: Element) => {
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
};

/**
 * Hold-to-cast: progress (0..1) rises while the pointer or Space/Enter is held, decays when released, and fires
 * `onComplete` once it reaches 1. Driven by requestAnimationFrame, so the visuals can follow it frame by frame.
 */
const useChannel = (onComplete: () => void) => {
  const [progress, setProgress] = useState(0);
  const [held, setHeld] = useState(false);
  const timeRef = useRef(0);
  const completeRef = useRef(onComplete);
  useEffect(() => {
    completeRef.current = onComplete;
  });
  const active = held || progress > 0;

  useEffect(() => {
    if (!active) return;
    let last = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      let next = clamp01(timeRef.current + (held ? dt / CAST_MS : -dt / DECAY_MS));
      if (held && next >= 1) {
        next = 0;
        setHeld(false);
        completeRef.current();
      }
      timeRef.current = next;
      setProgress(accelerate(next));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, held]);

  const release = () => setHeld(false);
  const bind = {
    onPointerDown: (event: React.PointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      // Captured, so sliding off the button doesn't cancel the cast
      event.currentTarget.setPointerCapture(event.pointerId);
      setHeld(true);
    },
    onPointerUp: release,
    onPointerCancel: release,
    onLostPointerCapture: release,
    onKeyDown: (event: React.KeyboardEvent) => {
      if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
        event.preventDefault();
        setHeld(true);
      }
    },
    onKeyUp: release,
    onBlur: release,
    onContextMenu: (event: React.MouseEvent) => event.preventDefault(),
  };

  return { progress, held, bind };
};

/** Throws one of each counted currency out of `from` with the logo's physics, the first hit loudest */
const throwCurrency = (from: Element, counts: CurrencyCounts) => {
  const paths = Object.keys(counts)
    .filter(path => (counts[path] ?? 0) > 0)
    .sort(() => Math.random() - 0.5);
  const origin = center(from);
  const rect = new DOMRect(origin.x - BALL_SIZE / 2, origin.y - BALL_SIZE / 2, BALL_SIZE, BALL_SIZE);
  const soundEvery = Math.ceil(paths.length / MAX_SOUNDS);
  paths.forEach((path, index) => {
    // Front-loaded: most leave early, the rest trickle out
    setTimeout(
      () => {
        const ball = throwBall({
          src: getExtensionUrl(path),
          from: rect,
          // Past the header's top level (a full 15-click streak): slung out of the well faster than they fell in.
          // throwBall adds its own ±15% speed jitter, so they still spread.
          power: 1.1,
          // Up and mostly left: the panel hugs the right edge
          angle: [Math.PI * 0.45, Math.PI * 0.85],
        });
        // Pops out of the siphon point: from the squeezed size, past full, then settles
        ball?.animate([{ scale: 0.2 }, { scale: 1.25, offset: 0.55 }, { scale: 1 }], {
          duration: 180,
          easing: 'ease-out',
        });
        // The rest quieter, so they read as the first hit's echo
        if (index % soundEvery === 0) void playLogoSound(1, false, index === 0 ? 1 : 0.35);
      },
      THROW_SPREAD_MS * (index / paths.length) ** 1.6,
    );
  });
};

/** A ring expanding out of the element */
const shockwave = (element: Element) => {
  const rect = element.getBoundingClientRect();
  const wave = document.createElement('span');
  wave.className = styles.wave ?? '';
  Object.assign(wave.style, {
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  });
  document.body.append(wave);
  wave.animate(
    [
      { transform: 'scale(1)', opacity: 0.9 },
      { transform: 'scale(2.5)', opacity: 0 },
    ],
    { duration: 500, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)' },
  ).onfinish = () => wave.remove();
};

interface PilferingRingProps {
  title: string;
  /** Accessible name and tooltip of the reset button, which needs a press and hold */
  resetHint: string;
  /** Section and title classes of the settings page, so the block looks like its siblings */
  className?: string;
  titleClassName?: string;
}

/**
 * PilferingRing component - the Exile's Pilfering Ring easter egg: how many of each currency the logo has thrown so
 * far. Hidden for games without currency images.
 *
 * The reset is channeled instead of confirmed in a modal: holding the round button pulls the currency out of the grid
 * into it, faster the longer it's held: each icon shakes in place, tears off and flies into the button; completing the cast throws one of each currency back out with the logo's
 * physics, clears the counts and fades the button away. Letting go early drains the channel.
 */
const PilferingRing = ({ title, resetHint, className, titleClassName }: PilferingRingProps) => {
  // The settings stay open while the logo is thrown, so follow the drops live
  const [counts, setCounts] = useState(getCurrencyCounts);
  useEffect(() => subscribeToCurrencyDrops(() => setCounts(getCurrencyCounts())), []);
  const paths = getCurrencyImagePaths();

  const buttonRef = useRef<HTMLButtonElement>(null);
  const icons = useRef<(HTMLImageElement | null)[]>([]);
  const [offsets, setOffsets] = useState<{ x: number; y: number }[]>([]);
  // Bumped on every reset: remounts the grid so the emptied icons fade back in instead of popping
  const [round, setRound] = useState(0);
  // The button stays mounted after the reset only to play its exit
  const [leaving, setLeaving] = useState(false);

  const total = paths.reduce((sum, path) => sum + (counts[path] ?? 0), 0);

  const finish = () => {
    const button = buttonRef.current;
    if (button) {
      if (!prefersReducedMotion()) shockwave(button);
      throwCurrency(button, counts);
    }
    setLeaving(true);
    setRound(value => value + 1);
    // Dev builds (pnpm dev, Storybook) play the whole cast but keep the counts, so the animation can be replayed
    if (!import.meta.env.DEV) resetCurrencyCounts();
  };
  const { progress, held, bind } = useChannel(finish);

  // The pull vectors are relative, so scrolling the panel doesn't change them: measured on the first hold
  useLayoutEffect(() => {
    if (!held || offsets.length || !buttonRef.current) return;
    const target = center(buttonRef.current);
    setOffsets(
      icons.current.map(icon => {
        if (!icon) return { x: 0, y: 0 };
        const cell = center(icon);
        return { x: target.x - cell.x, y: target.y - cell.y };
      }),
    );
  }, [held, offsets.length]);

  if (paths.length === 0) return null;

  // The button trembles too as the cast nears its burst, from halfway on and much less than the icons
  const buttonShake = () => {
    if (progress === 0 || prefersReducedMotion()) return '';
    const strain = clamp01((progress - 0.5) / 0.5) ** 2;
    const now = progress * 900;
    return `translate(${Math.sin(now * 1.9) * strain * 1.2}px, ${Math.cos(now * 2.6) * strain * 1.2}px) rotate(${Math.sin(now * 1.4) * strain * 4}deg) `;
  };

  // Each icon holds on and shakes harder and harder for most of the cast, then they all tear off almost at once and
  // rush into the button, which bursts them out the moment the last one lands.
  const flight = (index: number) => {
    const detach = DETACH_FROM + (((index * 7) % paths.length) / paths.length) * DETACH_SPREAD;
    return { detach, t: clamp01((progress - detach) / FLIGHT) };
  };
  // A count drains while its icon is in the air
  const shown = (count: number, index: number) => Math.round(count * (1 - flight(index).t));

  const iconStyle = (index: number): React.CSSProperties | undefined => {
    if (progress === 0) return undefined;
    const { detach, t } = flight(index);
    const opacity = 1 - clamp01((t - 0.75) / 0.25);
    if (prefersReducedMotion()) return { opacity };
    const offset = offsets[index] ?? { x: 0, y: 0 };
    if (t === 0) {
      // Strain: the shake grows towards the tear-off, with a slight lean towards the button
      const strain = clamp01(progress / detach) ** 2;
      // Progress moves every frame, so it doubles as the shake clock (and the shake quickens as the cast speeds up)
      const now = progress * 900 + index * 13;
      const shake = strain * 3.5;
      const length = Math.hypot(offset.x, offset.y) || 1;
      const lean = strain * 3;
      return {
        transform: `translate(${(offset.x / length) * lean + Math.sin(now * 1.7) * shake}px, ${(offset.y / length) * lean + Math.cos(now * 2.3) * shake}px) rotate(${Math.sin(now * 1.3) * strain * 12}deg)`,
        filter: `brightness(${1 + strain * 0.4})`,
      };
    }
    // Torn off: falls into the button like into a well, slow at first and fastest on arrival, curving in on a swirl
    // (the same side for every icon) and shrinking and spinning
    const travel = t ** 3;
    const swirl = Math.sin(Math.PI * travel) * 0.18;
    return {
      transform: `translate(${offset.x * travel - offset.y * swirl}px, ${offset.y * travel + offset.x * swirl}px) scale(${1 - travel * 0.7}) rotate(${travel * 540}deg)`,
      opacity,
      filter: `brightness(${1.4 + travel * 0.8})`,
    };
  };

  return (
    <section className={className}>
      <div className={styles.header}>
        <img className={styles.ring} src={getExtensionUrl('/assets/images/pilfering-ring.png')} alt="" />
        <h1 className={classnames(titleClassName, styles.title)}>{title}</h1>

        {(total > 0 || leaving) && (
          <span className={styles.resetWrap}>
            <button
              ref={buttonRef}
              type="button"
              className={classnames(styles.reset, leaving && styles.isLeaving)}
              style={
                {
                  '--p': progress,
                  '--on': progress > 0 ? 1 : 0,
                  // Swells and glows as the channel fills
                  transform: `${buttonShake()}scale(${1 + progress * 0.15})`,
                  filter: `drop-shadow(0 0 ${progress * 12}px rgba(233, 207, 159, ${progress})) brightness(${1 + progress * 0.5})`,
                } as React.CSSProperties
              }
              title={resetHint}
              aria-label={resetHint}
              onAnimationEnd={event => event.target === event.currentTarget && leaving && setLeaving(false)}
              {...bind}>
              <span className={styles.arc} />
              <span className={styles.sparkArm}>
                <span className={styles.spark} />
              </span>
              {/* lucide rotate-ccw (ISC) */}
              <svg
                className={styles.glyph}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>
          </span>
        )}
      </div>

      <ul key={round} className={classnames(styles.grid, round > 0 && styles.refill)}>
        {paths.map((path, index) => (
          <li key={path} className={styles.cell} title={getCurrencyName(path)}>
            <img
              ref={element => void (icons.current[index] = element)}
              className={styles.icon}
              style={iconStyle(index)}
              src={getExtensionUrl(path)}
              alt={getCurrencyName(path)}
            />
            <span className={styles.count}>{shown(counts[path] ?? 0, index)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default PilferingRing;
export type { PilferingRingProps };
