const random = (min: number, max: number) => min + Math.random() * (max - min);

interface BallThrow {
  /** Image of the ball */
  src: string;
  /** Viewport rect the ball starts in; also its size */
  from: DOMRectReadOnly;
  /** 0..1: 0 is a weak hop, 1 a throw that crosses the whole viewport */
  power: number;
  /** Range of throw directions in radians, within the upper half-plane: 0 is flat right, π/2 straight up, π flat left */
  angle?: [number, number];
}

/**
 * Throws an image out of `from` like a ball. It flies in a random upward direction, falls under gravity, bounces off
 * the bottom and the sides of the viewport, rolls along the bottom until friction stops it, then fades out and removes
 * itself. Returns the ball, or null under reduced motion. Used by the logo throw easter egg and by the Pilfering Ring reset.
 *
 * The physics is a tiny hand-rolled simulation stepped once per animation frame. All units are CSS pixels and
 * seconds (speeds in px/s, accelerations in px/s²). The y axis points down, as in the DOM.
 */
const throwBall = ({ src, from, power, angle: [minAngle, maxAngle] = [0, Math.PI] }: BallThrow) => {
  // Purely decorative motion: respect the OS "reduce motion" setting and do nothing
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;

  // `position: fixed` (viewport coordinates, unaffected by page scroll), on top, ignoring the pointer. Appended to
  // <body> so the side panel's overflow and transforms can't clip it.
  const ball = document.createElement('img');
  ball.src = src;
  ball.alt = '';
  Object.assign(ball.style, {
    position: 'fixed',
    zIndex: '10000',
    pointerEvents: 'none',
    margin: '0',
    objectFit: 'contain',
    left: `${from.left}px`,
    top: `${from.top}px`,
    width: `${from.width}px`,
    height: `${from.height}px`,
  });
  document.body.append(ball);

  // The ball is moved with `transform: translate(x, y)`, so x/y are offsets from its starting spot, not absolute
  // coordinates. The bounds below are therefore expressed relative to that spot too:
  //  - minX: offset at which the ball's left edge touches the left side of the viewport
  //  - maxX: offset at which its right edge touches the right side
  //  - floor: offset at which its bottom edge touches the bottom of the viewport
  //  - ceiling: offset at which its top edge touches the top of the viewport. The header sits at the top, so without
  //    it a strong throw would vanish off-screen for a second or more.
  const minX = -from.left;
  const maxX = window.innerWidth - from.right;
  const floor = window.innerHeight - from.bottom;
  const ceiling = -from.top;
  const radius = from.width / 2;

  // Tuning knobs. They're exaggerated compared to real-world physics so the whole show lasts about a second or two.
  const gravity = 4200; // downward acceleration, px/s²
  const restitution = 0.55; // share of vertical speed kept after a floor bounce (1 = perfectly elastic)

  // State: position offset (px), rotation (rad) and velocity (px/s)
  let x = 0;
  let y = 0;
  let angle = 0;
  // Initial throw: a random direction in the given range. Speed grows linearly with `power`, with ±15% jitter so
  // throws of equal power still differ. vy is negated because "up" is negative y on screen.
  const throwAngle = random(minAngle, maxAngle);
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
  // Returned so callers can layer their own animation on top (e.g. on `scale`, which composes with the transform)
  return ball;
};

export { throwBall };
export type { BallThrow };
