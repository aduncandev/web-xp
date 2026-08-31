/*
 * NSMB-MarioVsLuigi (ipodtouch0218's fan remake) — the Unity WebGL build,
 * served from public/mariovsluigi and framed full-bleed so the game canvas
 * always fills the window and follows every resize. A shop title, never
 * seeded by default.
 *
 * Unity owns its own input, but not its own volume: the shell page splices
 * a master gain in front of the engine's AudioContext and this component
 * keeps it in step with the XP mixer via MVL_VOLUME messages.
 */
import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';

import { useVolume } from '../../../context/VolumeContext';

export default function MarioVsLuigi() {
  const iframeRef = useRef(null);
  const gameUrl = `${import.meta.env.BASE_URL}mariovsluigi/`;
  const { effectiveVolume } = useVolume();

  const sendVolume = v => {
    const frame = iframeRef.current;
    if (frame && frame.contentWindow) {
      frame.contentWindow.postMessage(
        { type: 'MVL_VOLUME', volume: v },
        window.location.origin,
      );
    }
  };

  useEffect(() => {
    sendVolume(effectiveVolume);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveVolume]);

  return (
    <Body>
      <iframe
        ref={iframeRef}
        src={gameUrl}
        title="NSMB-MarioVsLuigi"
        allow="autoplay; fullscreen; gamepad"
        onLoad={() => sendVolume(effectiveVolume)}
      />
    </Body>
  );
}

const Body = styled.div`
  position: absolute;
  inset: 0;
  background: #000;
  iframe {
    display: block;
    width: 100%;
    height: 100%;
    border: 0;
  }
`;
