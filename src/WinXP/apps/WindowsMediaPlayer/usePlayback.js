// The media element and what drives it: the audio graph for the analyser,
// play/pause/stop, stepping through the queue with shuffle and repeat, and
// carrying playback across a track change.
import { useCallback, useEffect, useRef, useState } from 'react';

export function usePlayback({
  queue,
  currentIndex,
  current,
  setCurrentId,
  shuffle,
  repeatMode,
  effectiveVolume,
  resolveUrl,
}) {
  const mediaRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  // whether a track change should start playing on its own
  const wantPlayRef = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [localVolume, setLocalVolume] = useState(1);

  useEffect(() => {
    if (current && !current.url) resolveUrl(current.path);
  }, [current, resolveUrl]);

  const setupGraph = useCallback(() => {
    const el = mediaRef.current;
    if (!el || el.dataset.ungraphed === 'true') return;
    try {
      if (!audioCtxRef.current) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        audioCtxRef.current = new Ctx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      if (!analyserRef.current) {
        analyserRef.current = ctx.createAnalyser();
        analyserRef.current.fftSize = 2048;
      }
      if (!sourceRef.current) {
        sourceRef.current = ctx.createMediaElementSource(el);
        sourceRef.current.connect(analyserRef.current);
        analyserRef.current.connect(ctx.destination);
      }
    } catch {
      // no Web Audio available: playback still works, just no spectrum
    }
  }, []);

  const play = useCallback(async () => {
    const el = mediaRef.current;
    if (!el || !el.src) return;
    setupGraph();
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended')
      await audioCtxRef.current.resume();
    try {
      await el.play();
    } catch {
      setIsPlaying(false);
    }
  }, [setupGraph]);

  const togglePlay = useCallback(() => {
    const el = mediaRef.current;
    if (!el) return;
    if (el.paused) play();
    else el.pause();
  }, [play]);

  const stop = useCallback(() => {
    const el = mediaRef.current;
    if (!el) return;
    el.pause();
    el.currentTime = 0;
    setCurrentTime(0);
    wantPlayRef.current = false;
  }, []);

  /** Move `delta` tracks through the queue, or anywhere else under shuffle. */
  const step = useCallback(
    delta => {
      if (!queue.length) return;
      if (shuffle && queue.length > 1) {
        let next = currentIndex;
        while (next === currentIndex)
          next = Math.floor(Math.random() * queue.length);
        setCurrentId(queue[next].id);
        return;
      }
      setCurrentId(
        queue[(currentIndex + delta + queue.length) % queue.length].id,
      );
    },
    [queue, currentIndex, shuffle, setCurrentId],
  );

  const nudge = useCallback(seconds => {
    const el = mediaRef.current;
    if (!el || !isFinite(el.duration)) return;
    el.currentTime = Math.min(
      el.duration,
      Math.max(0, el.currentTime + seconds),
    );
  }, []);

  const onEnded = () => {
    if (repeatMode === 'one') {
      const el = mediaRef.current;
      if (el) {
        el.currentTime = 0;
        play();
      }
      return;
    }
    if (!shuffle && currentIndex >= queue.length - 1) {
      if (repeatMode === 'all' && queue.length) {
        setCurrentId(queue[0].id);
        return;
      }
      setIsPlaying(false);
      wantPlayRef.current = false;
      return;
    }
    step(1);
  };

  // Load the current track, and carry playback across a track change
  const applySource = useCallback(
    el => {
      if (!el || !current || !current.url) return;
      if (el.getAttribute('src') === current.url) return;
      el.src = current.url;
      el.load();
      setCurrentTime(0);
      setDuration(current.duration || 0);
      if (wantPlayRef.current) play();
    },
    [current, play],
  );
  useEffect(() => applySource(mediaRef.current), [applySource]);
  const setMediaRef = useCallback(
    el => {
      // React clears a changing ref callback with null before every
      // re-attach. Tearing the audio graph down on that would sever it on
      // each track change, and a second createMediaElementSource on the same
      // element throws, which is silence from the second track onwards.
      if (!el) return;
      if (mediaRef.current && mediaRef.current !== el && sourceRef.current) {
        // a genuinely different element: the old node belonged to the old one
        try {
          sourceRef.current.disconnect();
        } catch {
          // already detached
        }
        sourceRef.current = null;
      }
      mediaRef.current = el;
      applySource(el);
    },
    [applySource],
  );

  // The mixer owns the master level; the deck slider is the player's own
  useEffect(() => {
    const el = mediaRef.current;
    if (!el) return;
    el.volume = effectiveVolume * localVolume;
    el.muted = effectiveVolume === 0;
  }, [effectiveVolume, localVolume, current]);

  return {
    mediaRef,
    analyserRef,
    wantPlayRef,
    isPlaying,
    setIsPlaying,
    currentTime,
    setCurrentTime,
    duration,
    setDuration,
    localVolume,
    setLocalVolume,
    setupGraph,
    play,
    togglePlay,
    stop,
    step,
    nudge,
    onEnded,
    setMediaRef,
  };
}
