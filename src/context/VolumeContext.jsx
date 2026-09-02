import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { useVFS } from './VFSContext';
import { getCurrentUserName, subscribeUsers } from './users';

const VolumeContext = createContext();

export const useVolume = () => useContext(VolumeContext);

// Mixer model (sndvol32): the master "Volume Control" column and "Wave"
// both gate every software sound, like the real thing: effective gain is
// master * wave, muted when either is muted. The remaining channels
// (SW Synth, Line In, CD Audio) persist their sliders but drive nothing.
const DEFAULT_MIXER = {
  wave: { volume: 80, muted: false, balance: 50 },
  synth: { volume: 80, muted: false, balance: 50 },
  linein: { volume: 50, muted: true, balance: 50 },
  cd: { volume: 50, muted: false, balance: 50 },
  masterBalance: 50,
};

// Each account keeps its own levels in its hive under this key. The machine
// copy in localStorage is what plays before anyone has logged on (the
// startup chime) and what a new account starts from.
const HIVE_KEY = 'sound';
const MACHINE_KEYS = {
  volume: 'siteVolume',
  muted: 'siteMuted',
  mixer: 'siteMixer',
};

const readMachine = (key, def) => {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : def;
  } catch {
    return def;
  }
};
const writeMachine = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable
  }
};

const mergeMixer = saved => ({
  ...DEFAULT_MIXER,
  ...(saved || {}),
  wave: { ...DEFAULT_MIXER.wave, ...((saved && saved.wave) || {}) },
  synth: { ...DEFAULT_MIXER.synth, ...((saved && saved.synth) || {}) },
  linein: { ...DEFAULT_MIXER.linein, ...((saved && saved.linein) || {}) },
  cd: { ...DEFAULT_MIXER.cd, ...((saved && saved.cd) || {}) },
});

/** The account on screen, kept current by the user registry. */
function useActiveUserName() {
  const [name, setName] = useState(() => getCurrentUserName());
  useEffect(() => subscribeUsers(() => setName(getCurrentUserName())), []);
  return name;
}

export const VolumeProvider = ({ children }) => {
  const vfs = useVFS();
  const user = useActiveUserName();
  const [volume, setVolume] = useState(() =>
    readMachine(MACHINE_KEYS.volume, 50),
  );
  const [isMuted, setIsMuted] = useState(() =>
    readMachine(MACHINE_KEYS.muted, false),
  );
  const [mixer, setMixer] = useState(() =>
    mergeMixer(readMachine(MACHINE_KEYS.mixer, null)),
  );

  // Whose levels the sliders currently show. Set only once that account's
  // hive has been read, so a switch never writes the previous user's levels
  // into the next user's hive.
  const loadedFor = useRef(null);
  const hiveReady = vfs.initialized && !!user;

  useEffect(() => {
    if (!hiveReady) {
      loadedFor.current = null;
      return;
    }
    if (loadedFor.current === user) return;
    let saved = null;
    try {
      saved = vfs.getUserConfigFor(user, HIVE_KEY, null);
    } catch {
      saved = null;
    }
    if (saved && typeof saved === 'object') {
      if (typeof saved.volume === 'number') setVolume(saved.volume);
      if (typeof saved.muted === 'boolean') setIsMuted(saved.muted);
      setMixer(mergeMixer(saved.mixer));
    }
    // A first logon keeps the machine's levels and adopts them below
    loadedFor.current = user;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hiveReady, user]);

  useEffect(() => {
    writeMachine(MACHINE_KEYS.volume, volume);
    writeMachine(MACHINE_KEYS.muted, isMuted);
    writeMachine(MACHINE_KEYS.mixer, mixer);
    if (!hiveReady || loadedFor.current !== user) return;
    try {
      const saved = vfs.getUserConfigFor(user, HIVE_KEY, null);
      const next = { volume, muted: isMuted, mixer };
      if (JSON.stringify(saved) !== JSON.stringify(next))
        vfs.setUserConfigFor(user, HIVE_KEY, next);
    } catch {
      // hive unavailable, the machine copy still has it
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volume, isMuted, mixer, hiveReady, user]);

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

  const value = useMemo(
    () => ({
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
    }),
    [volume, isMuted, applyVolume, mixer, setMixerChannel, effectiveVolume],
  );

  return (
    <VolumeContext.Provider value={value}>{children}</VolumeContext.Provider>
  );
};
