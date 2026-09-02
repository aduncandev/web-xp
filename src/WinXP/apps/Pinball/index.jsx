import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';

import { useVolume } from '../../../context/VolumeContext';
import splashArt from 'assets/xp/PinballSplash.png';
import { portalRoot } from '../../screen';

// The real game paints its SPLASH_BITMAP over the screen while it loads and
// only tears it down once the table is ready.
const MIN_SPLASH_MS = 1600;

function PinBall({ isFocus }) {
  // Space Cadet (WASM port) is mirrored into public/pinball so the game
  // runs without touching 98.js.org
  const gameUrl = `/pinball/programs/pinball/space-cadet.html`;
  const iframeRef = useRef(null);
  const [splash, setSplash] = useState(true);
  const mountedAt = useRef(Date.now());

  const { effectiveVolume } = useVolume();
  const effectiveVolumeRef = useRef(effectiveVolume);
  effectiveVolumeRef.current = effectiveVolume;

  // The mirrored page carries an AudioContext shim exposing
  // __xpSetMasterVolume — full mixer gating for SDL's audio.
  const pushVolume = useCallback(() => {
    try {
      const win = iframeRef.current && iframeRef.current.contentWindow;
      if (win && typeof win.__xpSetMasterVolume === 'function') {
        win.__xpSetMasterVolume(effectiveVolumeRef.current);
        return true;
      }
    } catch {
      // same-origin access hiccup
    }
    return false;
  }, []);

  useEffect(() => {
    pushVolume();
  }, [effectiveVolume, pushVolume]);

  // Retry until the shim exists (covers slow iframe boots), then stop.
  useEffect(() => {
    const t = setInterval(() => {
      if (pushVolume()) clearInterval(t);
    }, 500);
    return () => clearInterval(t);
  }, [pushVolume]);

  // The mirrored page fires game-loaded / game-load-failed on its own frame
  // element once the WASM engine has finished booting the table.
  useEffect(() => {
    const frame = iframeRef.current;
    if (!frame) return undefined;
    let timer = null;
    const dismiss = () => {
      const elapsed = Date.now() - mountedAt.current;
      const wait = Math.max(0, MIN_SPLASH_MS - elapsed);
      timer = setTimeout(() => setSplash(false), wait);
    };
    frame.addEventListener('game-loaded', dismiss);
    frame.addEventListener('game-load-failed', dismiss);
    // Belt and braces: never strand the user behind the splash.
    const bailout = setTimeout(dismiss, 15000);
    return () => {
      frame.removeEventListener('game-loaded', dismiss);
      frame.removeEventListener('game-load-failed', dismiss);
      clearTimeout(bailout);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const onIframeLoad = () => {
    pushVolume();
  };

  return (
    <AppContainer>
      <StyledIframe
        ref={iframeRef}
        src={gameUrl}
        frameBorder="0"
        title="3D Pinball for Windows - Space Cadet"
        onLoad={onIframeLoad}
      />
      {splash &&
        createPortal(
          <Splash onClick={() => setSplash(false)}>
            <img src={splashArt} alt="3D Pinball" />
          </Splash>,
          portalRoot(),
        )}
      {!isFocus && <Overlay />}
    </AppContainer>
  );
}

const AppContainer = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
  background-color: #309f6a;
  overflow: hidden;
`;

const StyledIframe = styled.iframe`
  display: block;
  width: 100%;
  height: 100%;
  border: none;
`;

/* The genuine SPLASH_BITMAP resource out of PINBALL.EXE. The real game blanks
   the screen and centres the bitmap on it at 1:1 while the table loads. */
const Splash = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: default;

  img {
    width: 320px;
    height: 222px;
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    user-select: none;
    -webkit-user-drag: none;
  }
`;

const Overlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 2;
  background-color: transparent;
`;

export default PinBall;
