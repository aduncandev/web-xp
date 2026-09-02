// The visualization loop over the Now Playing canvas, and what it is told:
// whether the player is really playing, how many eggs this user has, and
// where the pointer is.
import { useEffect, useRef } from 'react';
import { getCurrentUserName } from '../../../context/users';
import { drawViz, resolveViz } from './visualizations';

export function useVisualization({
  vfs,
  task,
  visualization,
  canvasRef,
  analyserRef,
  isPlaying,
}) {
  const rafRef = useRef(null);
  // A scene that opens and closes with the music must not mistake a quiet
  // passage for the end of the track
  const playingRef = useRef(false);
  playingRef.current = isPlaying;
  // one visualization has a use for ROOM_MAN's egg count, and the hive is
  // the only place it is written
  const eggsRef = useRef(0);
  try {
    const eggs = vfs.getUserConfigFor(getCurrentUserName(), 'eggData', null);
    eggsRef.current = Array.isArray(eggs) ? eggs.length : 0;
  } catch {
    eggsRef.current = 0;
  }
  // where the pointer is on the canvas, in canvas pixels, for a
  // visualization that lets you push its things around
  const pointerRef = useRef({ x: 0, y: 0, down: false, inside: false });
  const trackPointer = e => {
    const c = canvasRef.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    pointerRef.current.x = ((e.clientX - r.left) / r.width) * c.width;
    pointerRef.current.y = ((e.clientY - r.top) / r.height) * c.height;
    pointerRef.current.inside = true;
  };

  useEffect(() => {
    if (task !== 'NowPlaying') return undefined;
    const viz = resolveViz(visualization);
    if (viz.kind === 'none' || viz.kind === 'albumart') {
      // No Visualization and Album Art draw nothing, so wipe whatever the
      // last one left behind instead of freezing its final frame
      const canvas = canvasRef.current;
      if (canvas) {
        const c2d = canvas.getContext('2d');
        c2d.setTransform(1, 0, 0, 1, 0, 0);
        c2d.clearRect(0, 0, canvas.width, canvas.height);
        c2d.fillStyle = '#000';
        c2d.fillRect(0, 0, canvas.width, canvas.height);
      }
      return undefined;
    }
    let freq = null;
    let wave = null;
    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!w || !h) return;
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;
      const analyser = analyserRef.current;
      if (analyser) {
        if (!freq || freq.length !== analyser.frequencyBinCount) {
          freq = new Uint8Array(analyser.frequencyBinCount);
          wave = new Uint8Array(analyser.fftSize);
        }
        analyser.getByteFrequencyData(freq);
        analyser.getByteTimeDomainData(wave);
      }
      drawViz(canvas.getContext('2d'), viz, freq, wave, {
        playing: playingRef.current,
        eggs: eggsRef.current,
        pointer: pointerRef.current,
      });
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [task, visualization, canvasRef, analyserRef]);

  return { pointerRef, trackPointer };
}
