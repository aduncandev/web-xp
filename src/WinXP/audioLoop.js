/*
 * A gapless music loop. Chromium's <audio loop> drops a small silence on
 * every lap; a Web Audio buffer source with loop=true repeats
 * sample-accurately. This is the shared version of the trick the Dog Virus
 * and the shop music pull off privately.
 *
 * const loop = createGaplessLoop(src);
 * loop.start(volume)  begin (decodes on first start; safe to call once)
 * loop.setVolume(v)   live volume, softly ramped
 * loop.resume()       kick a context the autoplay policy suspended (call
 *                     from a user-gesture handler)
 * loop.stop()         tear everything down (call on unmount)
 */
export function createGaplessLoop(src) {
  let ctx = null;
  let gain = null;
  let source = null;
  let stopped = false;

  return {
    start(volume = 1) {
      if (ctx || stopped) return;
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      try {
        ctx = new Ctx();
        gain = ctx.createGain();
        gain.gain.value = Math.min(1, Math.max(0, volume));
        gain.connect(ctx.destination);
        (async () => {
          const res = await fetch(src);
          const buffer = await ctx.decodeAudioData(await res.arrayBuffer());
          if (stopped) return;
          source = ctx.createBufferSource();
          source.buffer = buffer;
          source.loop = true;
          source.connect(gain);
          source.start(0);
          if (ctx.state === 'suspended') ctx.resume().catch(() => {});
        })().catch(() => {
          /* the song failed to load — silence is not worth crashing over */
        });
      } catch {
        ctx = null;
      }
    },
    setVolume(v) {
      if (gain && ctx)
        gain.gain.setTargetAtTime(
          Math.min(1, Math.max(0, v)),
          ctx.currentTime,
          0.03,
        );
    },
    resume() {
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    },
    stop() {
      stopped = true;
      try {
        if (source) source.stop();
      } catch {
        /* already stopped */
      }
      if (ctx) ctx.close().catch(() => {});
      ctx = null;
      gain = null;
      source = null;
    },
  };
}
