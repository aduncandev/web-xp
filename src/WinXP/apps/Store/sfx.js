/*
 * Wii Shop Channel audio: the real UI sounds (hover/decide/cancel/finish +
 * the loading loop) and the two-part shop music — the title theme plays
 * once, then the main loop takes over, exactly like the channel. All gains
 * are pre-scaled master volume (0..1); silence is a no-op.
 */
import hoverSrc from 'assets/store/wii/snd/select.mp3';
import decideSrc from 'assets/store/wii/snd/decide.mp3';
import cancelSrc from 'assets/store/wii/snd/cancel.mp3';
import finishSrc from 'assets/store/wii/snd/finish.mp3';
import loadSrc from 'assets/store/wii/snd/load.mp3';
import theme1Src from 'assets/store/wii/snd/theme1.mp3';
import theme2Src from 'assets/store/wii/snd/theme2.mp3';

const SRC = {
  hover: hoverSrc,
  decide: decideSrc,
  cancel: cancelSrc,
  finish: finishSrc,
};

export function playUi(kind, gain) {
  const src = SRC[kind];
  if (!src || !gain || gain <= 0) return;
  try {
    const a = new Audio(src);
    a.volume = Math.min(1, gain);
    a.play().catch(() => {});
  } catch {
    /* audio is never worth crashing over */
  }
}

/** The spinning-ring loading loop; call the returned stop() to end it. */
export function startLoadLoop(gain) {
  if (!gain || gain <= 0) return () => {};
  try {
    const a = new Audio(loadSrc);
    a.loop = true;
    a.volume = Math.min(1, gain);
    a.play().catch(() => {});
    return () => {
      a.pause();
      a.src = '';
    };
  } catch {
    return () => {};
  }
}

/**
 * The shop music: theme1 (the title fanfare) once, then theme2 loops
 * forever. Returns a controller; volume can be adjusted live, and stop()
 * tears everything down (call it on unmount).
 *
 * Web Audio, not <audio>: buffer sources loop sample-accurately and the
 * handoff is scheduled on the context clock, so theme2 starts the instant
 * theme1 ends and repeats with no gap (same trick as the Dog Virus loop).
 */
export function createMusic() {
  let ctx = null;
  let gain = null;
  let sources = [];
  let vol = 0;
  let duckFactor = 1;
  let started = false;
  let stopped = false;
  const apply = () => {
    if (gain)
      gain.gain.setTargetAtTime(vol * duckFactor, ctx.currentTime, 0.03);
  };
  return {
    start(initialVol) {
      if (started || stopped) return;
      started = true;
      vol = Math.min(1, Math.max(0, initialVol));
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      try {
        ctx = new Ctx();
        gain = ctx.createGain();
        gain.gain.value = vol;
        gain.connect(ctx.destination);
        (async () => {
          const [intro, loop] = await Promise.all(
            [theme1Src, theme2Src].map(src =>
              fetch(src)
                .then(r => r.arrayBuffer())
                .then(data => ctx.decodeAudioData(data)),
            ),
          );
          if (stopped) return;
          const t0 = ctx.currentTime + 0.05;
          const s1 = ctx.createBufferSource();
          s1.buffer = intro;
          s1.connect(gain);
          s1.start(t0);
          const s2 = ctx.createBufferSource();
          s2.buffer = loop;
          s2.loop = true;
          s2.connect(gain);
          s2.start(t0 + intro.duration);
          sources = [s1, s2];
          if (ctx.state === 'suspended') ctx.resume().catch(() => {});
        })().catch(() => {
          /* the music failed to load — the shop carries on silently */
        });
      } catch {
        /* ignore */
      }
    },
    setVolume(v) {
      vol = Math.min(1, Math.max(0, v));
      apply();
    },
    /** Duck the music (used while Mario collects his coins). */
    duck(factor) {
      duckFactor = factor;
      apply();
    },
    stop() {
      stopped = true;
      for (const s of sources) {
        try {
          s.stop();
        } catch {
          /* already stopped */
        }
      }
      sources = [];
      if (ctx) ctx.close().catch(() => {});
      ctx = null;
      gain = null;
    },
  };
}
