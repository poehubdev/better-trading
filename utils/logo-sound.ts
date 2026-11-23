import { getExtensionUrl } from '@/utils/extension-url';
import { getLocalValue, setLocalValue } from '@/utils/storage';

/** What a logo throw sounds like (easter egg) */
type LogoSound = 'none' | 'alert';

const LOGO_SOUNDS: LogoSound[] = ['none', 'alert'];
const SOUND_FILES: Record<Exclude<LogoSound, 'none'>, string> = {
  alert: '/assets/sounds/AlertSound_06.ogg',
};
// Played on top of the selected sound when a Mirror of Kalandra drops, at the same volume; muted by 'none' too
const MIRROR_SOUND_FILE = '/assets/sounds/SH22Mirror.ogg';
const SOUND_STORAGE_KEY = 'logo-sound';
const VOLUME_STORAGE_KEY = 'logo-sound-volume';
const DEFAULT_VOLUME = 60;
const MAX_PAN_SPREAD = 0.15; // pan spread of a full-power throw; -1 is full left, 1 full right

const getLogoSound = (): LogoSound => {
  const stored = getLocalValue(SOUND_STORAGE_KEY);
  return LOGO_SOUNDS.find(sound => sound === stored) ?? 'alert';
};

const setLogoSound = (sound: LogoSound): void => {
  setLocalValue(SOUND_STORAGE_KEY, sound);
};

/** Volume in percent, 0..100 */
const getLogoSoundVolume = (): number => {
  const stored = Number(getLocalValue(VOLUME_STORAGE_KEY) ?? DEFAULT_VOLUME);
  return Number.isFinite(stored) ? Math.min(Math.max(stored, 0), 100) : DEFAULT_VOLUME;
};

const setLogoSoundVolume = (volume: number): void => {
  setLocalValue(VOLUME_STORAGE_KEY, String(volume));
};

// Web Audio instead of `new Audio()`: an <audio> element is bound by the page's CSP (media-src), a fetch from the
// content script is not. One context and decoded buffers are reused across throws.
let context: AudioContext | undefined;
const buffers = new Map<string, Promise<AudioBuffer>>();

const loadBuffer = (audio: AudioContext, path: string) => {
  let buffer = buffers.get(path);
  if (!buffer) {
    buffer = fetch(getExtensionUrl(path))
      .then(response => response.arrayBuffer())
      .then(data => audio.decodeAudioData(data));
    // A failed load is retried on the next throw instead of being cached
    buffer.catch(() => buffers.delete(path));
    buffers.set(path, buffer);
  }
  return buffer;
};

// An idle context is suspended by the browser and resuming it (plus waking the output device) takes a moment; starting
// a sound meanwhile clips its first milliseconds. So wait until the context is running and the buffer is decoded.
const prepare = async (path: string) => {
  context ??= new AudioContext();
  const [buffer] = await Promise.all([loadBuffer(context, path), context.resume()]);
  return buffer;
};

/**
 * Resolves once the selected sound is ready to play without a cold start (never rejects). Await it before the visual
 * part of a throw so the animation and the sound begin together.
 */
const prepareLogoSound = async (mirror = false): Promise<void> => {
  const sound = getLogoSound();
  if (sound === 'none' || getLogoSoundVolume() === 0) return;
  const paths = mirror ? [SOUND_FILES[sound], MIRROR_SOUND_FILE] : [SOUND_FILES[sound]];
  await Promise.all(paths.map(prepare)).catch(() => undefined);
};

const playClip = async (path: string, volume: number, power: number): Promise<void> => {
  try {
    const buffer = await prepare(path);
    if (!context) return;
    const source = context.createBufferSource();
    const gain = context.createGain();
    const panner = new StereoPannerNode(context, { pan: (Math.random() * 2 - 1) * power * MAX_PAN_SPREAD });
    source.buffer = buffer;
    gain.gain.value = volume / 100;
    source.connect(gain).connect(panner).connect(context.destination);
    source.start();
  } catch {
    // Purely decorative: a blocked or broken sound must never break the click
  }
};

/**
 * Plays the selected sound at the selected volume; silently does nothing if it can't.
 * `power` (0..1, the throw power) widens the random pan: a weak throw sounds near the centre, a full-power one up to
 * 30% left or right, as if it landed further away. `mirror` adds the Mirror of Kalandra clip.
 */
const playLogoSound = async (power = 0, mirror = false): Promise<void> => {
  const sound = getLogoSound();
  const volume = getLogoSoundVolume();
  if (sound === 'none' || volume === 0) return;

  const paths = mirror ? [SOUND_FILES[sound], MIRROR_SOUND_FILE] : [SOUND_FILES[sound]];
  // Each clip is isolated: a broken one must not silence the other
  await Promise.all(paths.map(path => playClip(path, volume, power)));
};

export {
  LOGO_SOUNDS,
  getLogoSound,
  setLogoSound,
  getLogoSoundVolume,
  setLogoSoundVolume,
  prepareLogoSound,
  playLogoSound,
};
export type { LogoSound };
