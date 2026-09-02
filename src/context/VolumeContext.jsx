/*
 * The speakers. One master level, then a level per program, the way the
 * Vista-and-later mixer works: effective gain for a sound is
 * master * its program's channel, muted when either is. The shell's own
 * sounds (chimes, dings, error boxes, balloons) play on the System Sounds
 * channel.
 *
 * Programs never name their channel. The window frame wraps each one in an
 * AppVolumeScope, so useVolume() inside a program reads that program's
 * level and, while the component is mounted, lists the program in the
 * mixer. Code outside any window (the logon screen, the shell) is on the
 * system channel.
 *
 * Each account keeps its levels in its hive under `sound`. The machine copy
 * of the master level in localStorage is what plays before anyone has
 * logged on and what a new account starts from.
 */
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
import { playSystemSound } from '../WinXP/sounds';

const VolumeContext = createContext();
const AppScopeContext = createContext(null);

export const SYSTEM_CHANNEL = 'system';
const DEFAULT_LEVEL = { volume: 100, muted: false, balance: 50 };

const HIVE_KEY = 'sound';
const MACHINE_KEYS = { volume: 'siteVolume', muted: 'siteMuted' };
// the old sndvol32 model's machine copy, no longer read
const RETIRED_MACHINE_KEY = 'siteMixer';

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

/** A saved `sound` value in the current shape, or null when there is none. */
function normalizeSaved(saved) {
  if (!saved || typeof saved !== 'object') return null;
  let volume = typeof saved.volume === 'number' ? saved.volume : 50;
  let muted = saved.muted === true;
  let balance = 50;
  const apps = {};
  if (saved.mixer) {
    // The old model gated every sound through a Wave channel as well as
    // the master. Fold it into the master so nothing gets louder.
    const wave = saved.mixer.wave || {};
    if (typeof wave.volume === 'number')
      volume = Math.round(volume * (wave.volume / 100));
    if (wave.muted) muted = true;
    if (typeof saved.mixer.masterBalance === 'number')
      balance = saved.mixer.masterBalance;
  } else {
    if (typeof saved.balance === 'number') balance = saved.balance;
    if (saved.apps && typeof saved.apps === 'object') {
      for (const [key, level] of Object.entries(saved.apps)) {
        if (level && typeof level === 'object')
          apps[key] = { ...DEFAULT_LEVEL, ...level };
      }
    }
  }
  return { volume, muted, balance, apps };
}

/** The account on screen, kept current by the user registry. */
function useActiveUserName() {
  const [name, setName] = useState(() => getCurrentUserName());
  useEffect(() => subscribeUsers(() => setName(getCurrentUserName())), []);
  return name;
}

// An element may carry its own level under the channel (data-gain, 0..1):
// a quiet sound effect stays quiet when the sliders move.
const gainOf = audio => {
  const g = Number(audio.dataset && audio.dataset.gain);
  return Number.isFinite(g) && g >= 0 && g <= 1 ? g : 1;
};

export const VolumeProvider = ({ children }) => {
  const vfs = useVFS();
  const user = useActiveUserName();
  const [volume, setVolume] = useState(() =>
    readMachine(MACHINE_KEYS.volume, 50),
  );
  const [isMuted, setIsMuted] = useState(() =>
    readMachine(MACHINE_KEYS.muted, false),
  );
  const [masterBalance, setMasterBalance] = useState(50);
  // per-program levels, keyed by exe path (or SYSTEM_CHANNEL)
  const [apps, setApps] = useState({});

  useEffect(() => {
    try {
      localStorage.removeItem(RETIRED_MACHINE_KEY);
    } catch {
      // storage unavailable
    }
  }, []);

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
      saved = normalizeSaved(vfs.getUserConfigFor(user, HIVE_KEY, null));
    } catch {
      saved = null;
    }
    if (saved) {
      setVolume(saved.volume);
      setIsMuted(saved.muted);
      setMasterBalance(saved.balance);
      setApps(saved.apps);
    } else {
      // A first logon keeps the machine's master level and adopts it below;
      // program levels start fresh
      setApps({});
    }
    loadedFor.current = user;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hiveReady, user]);

  useEffect(() => {
    writeMachine(MACHINE_KEYS.volume, volume);
    writeMachine(MACHINE_KEYS.muted, isMuted);
    if (!hiveReady || loadedFor.current !== user) return;
    try {
      const saved = vfs.getUserConfigFor(user, HIVE_KEY, null);
      const next = { volume, muted: isMuted, balance: masterBalance, apps };
      if (JSON.stringify(saved) !== JSON.stringify(next))
        vfs.setUserConfigFor(user, HIVE_KEY, next);
    } catch {
      // hive unavailable, the machine copy still has the master
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volume, isMuted, masterBalance, apps, hiveReady, user]);

  // --- levels and gains ---

  const masterGain = isMuted ? 0 : volume / 100;
  const levelOf = useCallback(key => apps[key] || DEFAULT_LEVEL, [apps]);
  const setAppLevel = useCallback((key, patch) => {
    setApps(a => ({
      ...a,
      [key]: { ...DEFAULT_LEVEL, ...(a[key] || {}), ...patch },
    }));
  }, []);
  /** 0..1 gain a sound on `key`'s channel actually plays at. */
  const effectiveFor = useCallback(
    key => {
      const level = apps[key];
      if (!level) return masterGain;
      return level.muted ? 0 : masterGain * (level.volume / 100);
    },
    [apps, masterGain],
  );

  // --- the programs currently making sound, for the mixer's columns ---

  const openRef = useRef(new Map()); // key -> { count, name, icon, order }
  const orderRef = useRef(0);
  const [openApps, setOpenApps] = useState([]);
  const registerApp = useCallback(scope => {
    const map = openRef.current;
    const publish = () =>
      setOpenApps(
        [...map.entries()]
          .sort((a, b) => a[1].order - b[1].order)
          .map(([key, e]) => ({ key, name: e.name, icon: e.icon })),
      );
    const entry = map.get(scope.key);
    if (entry) entry.count += 1;
    else
      map.set(scope.key, {
        count: 1,
        name: scope.name,
        icon: scope.icon,
        order: orderRef.current++,
      });
    publish();
    return () => {
      const e = map.get(scope.key);
      if (!e) return;
      e.count -= 1;
      if (e.count <= 0) map.delete(scope.key);
      publish();
    };
  }, []);

  // --- live registry: every element handed to applyVolume keeps following
  // its channel for as long as it lives ---

  const elementsRef = useRef(new Set());
  const effectiveForRef = useRef(effectiveFor);
  effectiveForRef.current = effectiveFor;

  const applyVolumeTo = useCallback((audio, key = SYSTEM_CHANNEL) => {
    if (!audio) return;
    if (audio.dataset) audio.dataset.channel = key;
    const eff = effectiveForRef.current(key);
    audio.volume = eff * gainOf(audio);
    // dataset.forceMute (set when a session is switched out) hard-mutes an
    // element regardless of the sliders
    audio.muted =
      eff === 0 || (audio.dataset && audio.dataset.forceMute === '1');
    elementsRef.current.add(audio);
  }, []);

  useEffect(() => {
    for (const audio of [...elementsRef.current]) {
      // Drop finished one-shots so the registry doesn't grow forever
      if (audio.ended && !audio.loop) {
        elementsRef.current.delete(audio);
        continue;
      }
      try {
        const eff = effectiveFor(audio.dataset.channel || SYSTEM_CHANNEL);
        audio.volume = eff * gainOf(audio);
        audio.muted = eff === 0 || audio.dataset.forceMute === '1';
      } catch {
        elementsRef.current.delete(audio);
      }
    }
  }, [effectiveFor]);

  /** The ding that lets the master slider be heard at its new level. */
  const previewVolume = useCallback(() => {
    playSystemSound('ding');
  }, []);

  const value = useMemo(
    () => ({
      volume,
      setVolume,
      isMuted,
      setIsMuted,
      toggleMute: () => setIsMuted(m => !m),
      masterBalance,
      setMasterBalance,
      masterGain,
      levelOf,
      setAppLevel,
      effectiveFor,
      openApps,
      registerApp,
      applyVolumeTo,
      previewVolume,
    }),
    [
      volume,
      isMuted,
      masterBalance,
      masterGain,
      levelOf,
      setAppLevel,
      effectiveFor,
      openApps,
      registerApp,
      applyVolumeTo,
      previewVolume,
    ],
  );

  return (
    <VolumeContext.Provider value={value}>{children}</VolumeContext.Provider>
  );
};

/** The frame puts each program in one of these; the mixer names the column after it. */
export function AppVolumeScope({ appKey, name, icon, children }) {
  const scope = useMemo(() => ({ key: appKey, name, icon }), [
    appKey,
    name,
    icon,
  ]);
  return (
    <AppScopeContext.Provider value={scope}>
      {children}
    </AppScopeContext.Provider>
  );
}

/**
 * For anything that makes sound: `effectiveVolume` (0..1) and `applyVolume`
 * for the program's own channel, or the system channel outside a window.
 * Inside a program it also lists the program in the mixer while mounted.
 */
export const useVolume = () => {
  const ctx = useContext(VolumeContext);
  const scope = useContext(AppScopeContext);
  const key = scope ? scope.key : SYSTEM_CHANNEL;
  const { registerApp, applyVolumeTo } = ctx;
  useEffect(() => {
    if (!scope) return undefined;
    return registerApp(scope);
  }, [registerApp, scope]);
  const effectiveVolume = ctx.effectiveFor(key);
  const applyVolume = useCallback(audio => applyVolumeTo(audio, key), [
    applyVolumeTo,
    key,
  ]);
  return useMemo(
    () => ({ ...ctx, channel: key, effectiveVolume, applyVolume }),
    [ctx, key, effectiveVolume, applyVolume],
  );
};

/** The mixer's and the tray's view of the levels. Lists nothing in the mixer. */
export const useMixer = () => {
  const ctx = useContext(VolumeContext);
  return useMemo(
    () => ({
      ...ctx,
      effectiveVolume: ctx.effectiveFor(SYSTEM_CHANNEL),
      applyVolume: audio => ctx.applyVolumeTo(audio, SYSTEM_CHANNEL),
    }),
    [ctx],
  );
};
