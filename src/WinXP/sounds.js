// The XP sound scheme — one place that maps system events to the stock
// Windows XP sounds. Playing is always best-effort (autoplay policies).

import minimizeWav from 'assets/sounds/Windows XP Minimize.wav';
import restoreWav from 'assets/sounds/Windows XP Restore.wav';
import navigateWav from 'assets/sounds/Windows XP Start.wav';
import errorWav from 'assets/sounds/Windows XP Critical Stop.wav';
import exclamationWav from 'assets/sounds/Windows XP Exclamation.wav';
import dingWav from 'assets/sounds/Windows XP Ding.wav';
import notifyWav from 'assets/sounds/Windows XP Notify.wav';
import balloonWav from 'assets/sounds/xp_balloon.wav';
import recycleWav from 'assets/sounds/Windows XP Recycle.wav';
import hardwareInsertWav from 'assets/sounds/Windows XP Hardware Insert.wav';
import hardwareRemoveWav from 'assets/sounds/Windows XP Hardware Remove.wav';
import menuCommandWav from 'assets/sounds/Windows XP Menu Command.wav';

const SOUNDS = {
  minimize: minimizeWav,
  restore: restoreWav,
  navigate: navigateWav,
  error: errorWav,
  exclamation: exclamationWav,
  ding: dingWav,
  notify: notifyWav,
  balloon: balloonWav,
  recycle: recycleWav,
  hardwareInsert: hardwareInsertWav,
  hardwareRemove: hardwareRemoveWav,
  menuCommand: menuCommandWav,
};

// The shell registers VolumeContext's applyVolume here so plain modules
// (no hooks) still honor the master volume/mute.
let volumeAdapter = null;

export function registerVolumeAdapter(fn) {
  volumeAdapter = typeof fn === 'function' ? fn : null;
}

/**
 * Play any source under the master volume. `gain` is the sound's own level
 * (0..1) beneath the slider; `loop` for music. Returns the element, or null.
 */
export function playSound(src, { gain = 1, loop = false } = {}) {
  if (!src) return null;
  try {
    const audio = new Audio(src);
    audio.dataset.gain = String(gain);
    audio.loop = loop;
    if (volumeAdapter) {
      try {
        volumeAdapter(audio);
      } catch {
        audio.volume = gain;
      }
    } else audio.volume = gain;
    audio.play().catch(() => {});
    return audio;
  } catch {
    return null;
  }
}

export function playSystemSound(key) {
  const src = SOUNDS[key];
  if (!src) return;
  try {
    const audio = new Audio(src);
    if (volumeAdapter) {
      try {
        volumeAdapter(audio);
      } catch {
        // volume adapter is best-effort
      }
    }
    audio.play().catch(() => {});
  } catch {
    // sound is best-effort
  }
}
