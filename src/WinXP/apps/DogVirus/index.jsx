/*
 * Dog Virus — a loving recreation of skillzdev.xyz's old 404 page.
 *
 * Launching dogvirus.exe drops "patient zero": a real XP window holding one
 * dog. It picks ONE dog + ONE song for the run (the pairings the site used —
 * the annoying Undertale dog with any of the three dogshrine tracks, the
 * maraca dog with baci_perugina, the sleeping dog with dogCheck), loops that
 * song, walls the desktop with that same dog, and every 2–3 seconds opens
 * another real dog window (dogwindow.exe) at a random size and spot, each
 * under a different daft title. When the whole swarm is up it plays a victory
 * fanfare. They keep off the taskbar (noFooterWindow) and ignore Show Desktop
 * / Minimize All (noMinimize), but still list in Task Manager.
 *
 * Only ONE virus runs at a time: relaunching while any dog window is still on
 * screen just adds a lone inert dog, never a second song/spawn (see the
 * liveDogWindows guard). Every dog window is uncloseable the friendly way: its
 * [X] plays the Ding the Paint "Save changes?" box plays, and stays put. The
 * escape is real-Windows honest — End Task in Task Manager kills a window
 * (force close bypasses the veto), and a reboot clears everything. The
 * hijacked wallpaper lifts as soon as the last dog window is gone.
 *
 * Both dogvirus.exe (seed) and dogwindow.exe (child) mount THIS component; the
 * child is told so via injectProps.child.
 */
import { useEffect, useMemo, useRef } from 'react';
import styled from 'styled-components';

import { playSound, playSystemSound } from '../../sounds';
import { useWallpaperHijack } from '../../wallpaperHijack';
import { EXE_PATHS } from '../../../context/vfsConstants';
import { useVolume } from '../../../context/VolumeContext';
import { useSessionActive } from '../../sessionAudio';

import annoyingGif from 'assets/dogvirus/undertale-annoying.gif';
import maracaGif from 'assets/dogvirus/dog-maraca.gif';
import sleepGif from 'assets/dogvirus/dog-sleep.gif';
import dogshrine2Mp3 from 'assets/dogvirus/dogshrine_2.mp3';
import dogroomMp3 from 'assets/dogvirus/dogroom.mp3';
import dogshrineMp3 from 'assets/dogvirus/dogshrine.mp3';
import baciMp3 from 'assets/dogvirus/baci_perugina2.mp3';
import dogCheckOgg from 'assets/dogvirus/dogCheck.ogg';
import victoryWav from 'assets/dogvirus/victory.wav';

const TASKBAR_H = 30;
const MAX_WINDOWS = 100; // patient zero + children, total
const AUDIO_GAIN = 0.8;
const VICTORY_GAIN = 0.9;
const SPAWN_MIN = 2000;
const SPAWN_MAX = 3000;

// How many dog windows are alive right now (seed + children). A fresh virus
// only takes hold when this is 0 at launch — so relaunching while the dogs are
// still up cannot start a second song/spawn.
let liveDogWindows = 0;

// One dog + its songs, exactly as the site paired them.
const THEMES = [
  { gif: annoyingGif, songs: [dogshrine2Mp3, dogroomMp3, dogshrineMp3] },
  { gif: maracaGif, songs: [baciMp3] },
  { gif: sleepGif, songs: [dogCheckOgg] },
];

// Read off the original 404, plus more in the same spirit.
const TITLES = [
  'Behold: A Dog!',
  'Another Dog?',
  'A Dog',
  'Is it a Bird? No, A Dog!',
  "What's this? A Dog!",
  'Also A Dog',
  'A Dog Emerges!',
  'Holy Moly, A Dog!!',
  'arfff',
  'room_dogcheck',
  'Tobias Fox, Creator of Undertale',
  'A Dog Appears!',
  'Wow, A Dog',
  'Look, A Dog',
  'A Dog!!!',
  'Undeniably A Dog',
  'Certified Dog',
  '100% Dog',
  'Suddenly: Dog',
  'Yet Another Dog',
  'The Dog Returns',
  'Dog Detected',
  'A New Dog',
  'A Dog Has Spawned',
  'Incoming Dog',
  'dogChecker.exe',
  'woof',
  'bark',
  'arf arf',
  "It's A Dog",
  'Not A Cat',
  'Dog?!',
  'More Dog',
  'Dog Overflow',
  'Please Enjoy This Dog',
  'A Wild Dog Appeared',
];

const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const rand = (lo, hi) => lo + Math.random() * (hi - lo);

/** The desktop-wallpaper style: one big dog filling the whole screen. */
const wallpaperStyle = gif => ({
  backgroundImage: `url(${gif})`,
  backgroundRepeat: 'no-repeat',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundColor: '#000',
  imageRendering: 'pixelated',
});

export default function DogVirus({
  child,
  title: childTitle,
  gifSrc: childGif,
  onShellOpen,
  onSetHeader,
  registerCloseInterceptor,
}) {
  const isSeed = !child;

  // Master volume (0..1), and a ref so the audio effect can read it without
  // re-running when it changes.
  const { effectiveVolume } = useVolume();
  const effectiveVolumeRef = useRef(effectiveVolume);
  effectiveVolumeRef.current = effectiveVolume;

  // Whether this session is the one on screen — a switched-out session goes
  // silent (its Web Audio loop is not a DOM element the shell can mute).
  const active = useSessionActive();
  const activeRef = useRef(active);
  activeRef.current = active;

  // Hijack only THIS session's wallpaper (not other users').
  const { acquireWallpaper, releaseWallpaper } = useWallpaperHijack();

  // Count this window's life, and decide (once) whether a seed is the founding
  // virus or a redundant relaunch that lands while dogs are already up.
  const founderRef = useRef(null); // seeds only: true = the live virus
  useEffect(() => {
    if (isSeed && founderRef.current === null)
      founderRef.current = liveDogWindows === 0;
    liveDogWindows += 1;
    return () => {
      liveDogWindows -= 1;
    };
  }, [isSeed]);

  // The seed fixes the dog + song for the whole run; a child is handed the
  // dog it must show.
  const run = useMemo(() => {
    if (isSeed) {
      const theme = pick(THEMES);
      return { gif: theme.gif, song: pick(theme.songs) };
    }
    return { gif: childGif || THEMES[0].gif, song: null };
  }, [isSeed, childGif]);

  // This window's own title (the seed blends into the swarm with a daft one).
  const myTitle = useMemo(
    () => (isSeed ? pick(TITLES) : childTitle || 'A Dog'),
    [isSeed, childTitle],
  );

  // Give the real title bar / taskbar / Task Manager this window's title.
  useEffect(() => {
    if (onSetHeader) onSetHeader({ title: myTitle });
  }, [onSetHeader, myTitle]);

  // Uncloseable: the [X] plays the Ding and refuses to close (returning false
  // vetoes WM_CLOSE). Task Manager End Task force-closes, bypassing this — the
  // intended escape.
  useEffect(() => {
    if (!registerCloseInterceptor) return;
    registerCloseInterceptor(() => {
      playSystemSound('ding');
      return false;
    });
  }, [registerCloseInterceptor]);

  // Hold the wallpaper hijack for as long as this window lives; the desktop
  // returns to normal once the last dog window releases it.
  useEffect(() => {
    acquireWallpaper(wallpaperStyle(run.gif));
    return () => releaseWallpaper();
  }, [run.gif, acquireWallpaper, releaseWallpaper]);

  // Founding-seed only: a GAPLESS loop of the run's song. Chromium's native
  // <audio loop> drops a small gap each lap; a Web Audio buffer source with
  // loop=true repeats sample-accurately. Still gated by the master volume via
  // a GainNode we keep in step with effectiveVolume.
  const gainRef = useRef(null);
  useEffect(() => {
    if (!isSeed || !founderRef.current) return undefined;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return undefined;
    let cancelled = false;
    let source = null;
    const ctx = new Ctx();
    const gain = ctx.createGain();
    gain.gain.value =
      (activeRef.current ? effectiveVolumeRef.current : 0) * AUDIO_GAIN;
    gain.connect(ctx.destination);
    gainRef.current = gain;
    (async () => {
      try {
        const res = await fetch(run.song);
        const data = await res.arrayBuffer();
        const buffer = await ctx.decodeAudioData(data);
        if (cancelled) return;
        source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        source.connect(gain);
        source.start(0);
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      } catch (_) {
        /* the song failed to load — the swarm carries on silently */
      }
    })();
    return () => {
      cancelled = true;
      gainRef.current = null;
      try {
        if (source) source.stop();
      } catch (_) {
        /* already stopped */
      }
      ctx.close().catch(() => {});
    };
  }, [isSeed, run.song]);

  // Keep the loop at the master volume as the slider moves, and silent while
  // this session is switched out.
  useEffect(() => {
    if (gainRef.current)
      gainRef.current.gain.value = (active ? effectiveVolume : 0) * AUDIO_GAIN;
  }, [effectiveVolume, active]);

  // Founding-seed only: keep opening more dog windows, and cheer when the whole
  // swarm is up.
  const onShellOpenRef = useRef(onShellOpen);
  onShellOpenRef.current = onShellOpen;
  const victoryRef = useRef(false);
  useEffect(() => {
    if (!isSeed || !founderRef.current) return undefined;
    let opened = 1; // patient zero counts
    let timer = null;
    const spawn = () => {
      opened += 1;
      const w = Math.round(rand(150, 320));
      const h = Math.round(rand(140, 290));
      const vw = window.innerWidth;
      const vh = window.innerHeight - TASKBAR_H;
      const x = Math.round(rand(0, Math.max(0, vw - w)));
      const y = Math.round(rand(0, Math.max(0, vh - h)));
      if (onShellOpenRef.current)
        onShellOpenRef.current(EXE_PATHS.DOGWINDOW, {
          injectProps: { child: true, title: pick(TITLES), gifSrc: run.gif },
          size: { width: w, height: h },
          offset: { x, y },
        });
      if (opened >= MAX_WINDOWS) {
        // The whole swarm is up — victory! (Not from a switched-out session.)
        if (!victoryRef.current) {
          victoryRef.current = true;
          if (activeRef.current) {
            try {
              playSound(victoryWav, { gain: VICTORY_GAIN });
            } catch (_) {
              /* ignore */
            }
          }
        }
        return;
      }
      timer = setTimeout(spawn, rand(SPAWN_MIN, SPAWN_MAX));
    };
    timer = setTimeout(spawn, 900);
    return () => {
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSeed]);

  return (
    <Body>
      <img
        className="dv__dog"
        src={run.gif}
        alt="A Dog"
        draggable={false}
        onDragStart={e => e.preventDefault()}
      />
    </Body>
  );
}

const Body = styled.div`
  width: 100%;
  height: 100%;
  background: #ece9d8;
  overflow: hidden;
  /* Ctrl+A must not be able to grab the dog and drag it around. */
  user-select: none;
  -webkit-user-select: none;

  /* The dog fills the whole window; the window's random size is the dog's. */
  .dv__dog {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: fill;
    image-rendering: pixelated;
    pointer-events: none;
    user-select: none;
    -webkit-user-select: none;
    -webkit-user-drag: none;
  }
`;
