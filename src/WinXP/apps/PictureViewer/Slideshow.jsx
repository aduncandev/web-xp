import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';

import { getArt } from '../../../xpArt';

const ICONS = {
  play: getArt('pfv-ss-play', null),
  pause: getArt('pfv-ss-pause', null),
  prev: getArt('pfv-ss-prev', null),
  next: getArt('pfv-ss-next', null),
  close: getArt('pfv-ss-close', null),
};

const ADVANCE_MS = 5000;
const HIDE_CONTROLS_MS = 2000;

/**
 * The viewer's full-screen slide show. Takes over the whole screen on black,
 * walks the folder on a timer, advances on a click, and floats the little
 * control bar in the top-right corner whenever the mouse moves.
 */
export default function Slideshow({ paths, startIndex, resolveUrl, onClose }) {
  const [index, setIndex] = useState(startIndex || 0);
  const [playing, setPlaying] = useState(true);
  const [url, setUrl] = useState(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimer = useRef(null);

  const go = useCallback(
    delta => {
      if (paths.length === 0) return;
      setIndex(i => (i + delta + paths.length) % paths.length);
    },
    [paths.length],
  );

  // Resolve the picture at the cursor
  useEffect(() => {
    let live = true;
    const p = paths[index];
    if (!p) return undefined;
    resolveUrl(p).then(u => {
      if (live) setUrl(u || null);
    });
    return () => {
      live = false;
    };
  }, [paths, index, resolveUrl]);

  // Advance on the timer while playing
  useEffect(() => {
    if (!playing || paths.length < 2) return undefined;
    const t = setInterval(() => go(1), ADVANCE_MS);
    return () => clearInterval(t);
  }, [playing, paths.length, go]);

  // The bar fades back out once the mouse settles
  const wake = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(
      () => setControlsVisible(false),
      HIDE_CONTROLS_MS,
    );
  }, []);

  useEffect(() => {
    wake();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [wake]);

  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight' || e.key === 'PageDown') go(1);
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') go(-1);
      else if (e.key === ' ') setPlaying(p => !p);
      else return;
      e.preventDefault();
      wake();
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [go, onClose, wake]);

  const button = (key, label, onClick, active) => (
    <button
      type="button"
      className={`ss-btn${active ? ' ss-btn--active' : ''}`}
      title={label}
      onClick={e => {
        e.stopPropagation();
        onClick();
        wake();
      }}
    >
      {ICONS[key] && <img src={ICONS[key]} alt={label} draggable={false} />}
    </button>
  );

  return createPortal(
    <Screen
      onMouseMove={wake}
      onClick={() => {
        // A click anywhere moves to the next picture, like the real viewer
        go(1);
        wake();
      }}
    >
      {url && <img className="ss-image" src={url} alt="" draggable={false} />}
      <div className={`ss-bar${controlsVisible ? '' : ' ss-bar--hidden'}`}>
        {button('play', 'Start Slide Show', () => setPlaying(true), playing)}
        {button('pause', 'Pause Slide Show', () => setPlaying(false), !playing)}
        <span className="ss-sep" />
        {button('prev', 'Previous Picture', () => go(-1))}
        {button('next', 'Next Picture', () => go(1))}
        <span className="ss-sep" />
        {button('close', 'Close Window', onClose)}
      </div>
    </Screen>,
    document.body,
  );
}

const Screen = styled.div`
  position: fixed;
  inset: 0;
  z-index: 99995;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  cursor: default;
  user-select: none;

  .ss-image {
    max-width: 100%;
    max-height: 100%;
    display: block;
    -webkit-user-drag: none;
  }

  .ss-bar {
    position: absolute;
    top: 0;
    right: 0;
    height: 22px;
    display: flex;
    align-items: center;
    background: #eef2fb;
    border: 1px solid #7a96b1;
    border-top: none;
    border-right: none;
    transition: opacity 150ms linear;
  }
  .ss-bar--hidden {
    opacity: 0;
    pointer-events: none;
  }
  .ss-btn {
    width: 22px;
    height: 20px;
    padding: 0;
    margin: 0 1px;
    border: 1px solid transparent;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: default;
    img {
      width: 16px;
      height: 16px;
    }
    &:hover {
      border-color: #b6bdd2;
      background: #fff;
    }
  }
  /* The state the show is in sits in a sunken cell, like the real bar */
  .ss-btn--active {
    border-color: #7a96b1;
    background: #fff;
  }
  .ss-sep {
    width: 1px;
    height: 16px;
    background: #b6bdd2;
    margin: 0 2px;
  }
`;
