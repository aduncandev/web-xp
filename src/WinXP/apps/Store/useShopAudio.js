// The channel's sounds: the hover blip and the decide/cancel/finish cues,
// the loading whirl, and the two-part shop music. The two switches live in
// localStorage because they belong to the machine's speakers, not a user.
import { useCallback, useEffect, useRef, useState } from 'react';

import { createMusic, playUi, startLoadLoop } from './sfx';
import { LS_MUSIC, LS_SOUND } from './constants';

const loadFlag = (key, fallback) => {
  try {
    const v = localStorage.getItem(key);
    return v == null ? fallback : v === '1';
  } catch {
    return fallback;
  }
};

export function useShopAudio(effectiveVolume, screen) {
  const [soundOn, setSoundOn] = useState(() => loadFlag(LS_SOUND, true));
  const [musicOn, setMusicOn] = useState(() => loadFlag(LS_MUSIC, true));
  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;
  const volRef = useRef(effectiveVolume);
  volRef.current = effectiveVolume;

  useEffect(() => {
    try {
      localStorage.setItem(LS_SOUND, soundOn ? '1' : '0');
      localStorage.setItem(LS_MUSIC, musicOn ? '1' : '0');
    } catch {
      // private mode etc.
    }
  }, [soundOn, musicOn]);

  const sfx = useCallback(kind => {
    if (soundRef.current) playUi(kind, volRef.current * 0.6);
  }, []);
  // the channel plays a soft blip on hover; keep it from machine-gunning
  const lastHover = useRef(0);
  const hover = useCallback(() => {
    const now = performance.now();
    if (now - lastHover.current > 70) {
      lastHover.current = now;
      if (soundRef.current) playUi('hover', volRef.current * 0.35);
    }
  }, []);

  const musicRef = useRef(null);
  if (!musicRef.current) musicRef.current = createMusic();
  useEffect(() => {
    musicRef.current.setVolume(
      (musicOn ? 1 : 0) *
        effectiveVolume *
        0.4 *
        (screen === 'downloading' ? 0.45 : 1),
    );
  }, [musicOn, effectiveVolume, screen]);
  useEffect(() => {
    const music = musicRef.current;
    return () => music.stop();
  }, []);

  // the loading whirl also runs during the download animation
  useEffect(() => {
    if (screen !== 'downloading') return undefined;
    return soundRef.current ? startLoadLoop(volRef.current * 0.45) : () => {};
  }, [screen]);

  /** The splash: the music starts and the ring whirls; returns the whirl's stop. */
  const beginSplash = () => {
    musicRef.current.start((musicOn ? 1 : 0) * volRef.current * 0.4);
    return soundRef.current ? startLoadLoop(volRef.current * 0.7) : () => {};
  };

  return {
    soundOn,
    setSoundOn,
    musicOn,
    setMusicOn,
    sfx,
    hover,
    volRef,
    beginSplash,
  };
}
