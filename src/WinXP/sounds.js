// The XP sound scheme, the one place that maps system events to the stock
// Windows XP sounds, and the one way to play any sound under the master
// volume. Playing is always best-effort (autoplay policies).

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
import startupWav from 'assets/sounds/xp_startup.wav';
import logonWav from 'assets/sounds/xp_logon.wav';
import logoffWav from 'assets/sounds/xp_logoff.wav';
import shutdownWav from 'assets/sounds/xp_shutdown.wav';

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
  // The session sounds. "Start Windows" plays for a fresh logon, the short
  // logon chime when a switched-out session resumes, the logoff chime on
  // Switch User, and "Exit Windows" for a full log off, restart or shutdown.
  startup: startupWav,
  logon: logonWav,
  logoff: logoffWav,
  shutdown: shutdownWav,
};

// The app registers VolumeContext's applyVolume here so plain modules (no
// hooks) still honor the master volume/mute.
let volumeAdapter = null;

export function registerVolumeAdapter(fn) {
  volumeAdapter = typeof fn === 'function' ? fn : null;
}

/**
 * Play any source under the master volume. `gain` is the sound's own level
 * (0..1), `loop` for music, `playbackRate` for pitch-by-speed samples.
 * Returns the element, or null.
 */
export function playSound(
  src,
  { gain = 1, loop = false, playbackRate = null } = {},
) {
  if (!src) return null;
  try {
    const audio = new Audio(src);
    audio.dataset.gain = String(gain);
    audio.loop = loop;
    if (playbackRate) {
      audio.preservesPitch = false;
      audio.playbackRate = playbackRate;
    }
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

/** Play one of the scheme's sounds by event name. */
export function playSystemSound(key, opts) {
  return playSound(SOUNDS[key], opts);
}
