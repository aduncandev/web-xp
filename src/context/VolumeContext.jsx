import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useRef,
  useCallback,
  useMemo,
} from 'react';

const VolumeContext = createContext();

export const useVolume = () => useContext(VolumeContext);

// Mixer model (sndvol32): the master "Volume Control" column and "Wave"
// both gate every software sound, like the real thing — effective gain is
// master * wave, muted when either is muted. The remaining channels
// (SW Synth, Line In, CD Audio) persist their sliders but drive nothing.
const MIXER_KEY = 'siteMixer';
const DEFAULT_MIXER = {
  wave: { volume: 80, muted: false, balance: 50 },
  synth: { volume: 80, muted: false, balance: 50 },
  linein: { volume: 50, muted: true, balance: 50 },
  cd: { volume: 50, muted: false, balance: 50 },
  masterBalance: 50,
};

export const VolumeProvider = ({ children }) => {
  const [volume, setVolume] = useState(() => {
    const savedVolume = localStorage.getItem('siteVolume');
    return savedVolume !== null ? JSON.parse(savedVolume) : 50;
  });

  const [isMuted, setIsMuted] = useState(() => {
    const savedMute = localStorage.getItem('siteMuted');
    return savedMute !== null ? JSON.parse(savedMute) : false;
  });

  const [mixer, setMixer] = useState(() => {
    try {
      const saved = localStorage.getItem(MIXER_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_MIXER,
          ...parsed,
          wave: { ...DEFAULT_MIXER.wave, ...(parsed.wave || {}) },
          synth: { ...DEFAULT_MIXER.synth, ...(parsed.synth || {}) },
          linein: { ...DEFAULT_MIXER.linein, ...(parsed.linein || {}) },
          cd: { ...DEFAULT_MIXER.cd, ...(parsed.cd || {}) },
        };
      }
    } catch {
      // fall through to defaults
    }
    return DEFAULT_MIXER;
  });

  useEffect(() => {
    localStorage.setItem('siteVolume', JSON.stringify(volume));
  }, [volume]);

  useEffect(() => {
    localStorage.setItem('siteMuted', JSON.stringify(isMuted));
  }, [isMuted]);

  useEffect(() => {
    localStorage.setItem(MIXER_KEY, JSON.stringify(mixer));
  }, [mixer]);

  const setMixerChannel = useCallback((channel, patch) => {
    setMixer(m => ({ ...m, [channel]: { ...m[channel], ...patch } }));
  }, []);

  // 0..1 gain every registered sound actually plays at
  const effectiveVolume = useMemo(() => {
    if (isMuted || mixer.wave.muted) return 0;
    return (volume / 100) * (mixer.wave.volume / 100);
  }, [volume, isMuted, mixer.wave.volume, mixer.wave.muted]);

  // Live registry: every audio element handed to applyVolume keeps
  // following the sliders for as long as it lives.
  const registryRef = useRef(new Set());
  const effectiveRef = useRef(effectiveVolume);
  effectiveRef.current = effectiveVolume;

  // An element may carry its own level under the master (data-gain, 0..1):
  // a quiet sound effect stays quiet when the slider moves.
  const gainOf = audio => {
    const g = Number(audio.dataset && audio.dataset.gain);
    return Number.isFinite(g) && g >= 0 && g <= 1 ? g : 1;
  };
  const applyVolume = useCallback(audio => {
    if (!audio) return;
    audio.volume = effectiveRef.current * gainOf(audio);
    // dataset.forceMute (set when a session is switched out) hard-mutes an
    // element regardless of the master volume.
    audio.muted = effectiveRef.current === 0 || audio.dataset.forceMute === '1';
    registryRef.current.add(audio);
  }, []);

  useEffect(() => {
    for (const audio of [...registryRef.current]) {
      // Drop finished one-shots so the registry doesn't grow forever
      if (audio.ended && !audio.loop) {
        registryRef.current.delete(audio);
        continue;
      }
      try {
        audio.volume = effectiveVolume * gainOf(audio);
        audio.muted = effectiveVolume === 0 || audio.dataset.forceMute === '1';
      } catch {
        registryRef.current.delete(audio);
      }
    }
  }, [effectiveVolume]);

  return (
    <VolumeContext.Provider
      value={{
        volume,
        setVolume,
        isMuted,
        setIsMuted,
        toggleMute: () => setIsMuted(m => !m),
        applyVolume,
        mixer,
        setMixerChannel,
        setMasterBalance: b => setMixer(m => ({ ...m, masterBalance: b })),
        effectiveVolume,
      }}
    >
      {children}
    </VolumeContext.Provider>
  );
};
