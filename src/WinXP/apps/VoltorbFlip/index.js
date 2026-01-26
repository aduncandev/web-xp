import React, { useEffect, useRef, useCallback, useState } from 'react';
import styled from 'styled-components';

// 1. Import the hook
import { useVolume } from '../../../context/VolumeContext'; // Adjust path if needed

function VoltorbFlip({ isFocus }) {
  const gameUrl = `${process.env.PUBLIC_URL}/voltorb_flip/`;
  const iframeRef = useRef(null);
  const [iframeReady, setIframeReady] = useState(false);

  // 2. Get volume state
  const { volume, isMuted } = useVolume();

  const getTargetOrigin = useCallback(() => {
    let targetOrigin;
    try {
      targetOrigin = new URL(gameUrl).origin;
    } catch (e) {
      targetOrigin = new URL(gameUrl, window.location.origin).origin;
    }
    if (targetOrigin === 'null' || targetOrigin === 'about:blank') {
      targetOrigin = window.location.origin;
    }
    return targetOrigin;
  }, [gameUrl]);

  const sendFocusMessage = useCallback(
    focusState => {
      const iframe = iframeRef.current;
      if (iframe && iframe.contentWindow) {
        const targetOrigin = getTargetOrigin();
        iframe.contentWindow.postMessage(
          { type: 'VOLTORB_FLIP_FOCUS_CHANGE', focused: focusState },
          targetOrigin,
        );
      }
    },
    [getTargetOrigin],
  );

  // 3. Create a new function to send volume messages
  const sendVolumeMessage = useCallback(
    (currentVolume, currentMuted) => {
      const iframe = iframeRef.current;
      if (iframe && iframe.contentWindow && iframeReady) {
        const targetOrigin = getTargetOrigin();
        iframe.contentWindow.postMessage(
          {
            type: 'VOLTORB_FLIP_VOLUME_CHANGE',
            volume: currentVolume / 100, // Convert 0-100 to 0.0-1.0
            muted: currentMuted,
          },
          targetOrigin,
        );
      }
    },
    [getTargetOrigin, iframeReady], // Depends on iframeReady
  );

  // 4. Send focus messages when isFocus or iframeReady changes
  useEffect(() => {
    if (iframeReady) {
      sendFocusMessage(isFocus);
    }
  }, [isFocus, iframeReady, sendFocusMessage]);

  // 5. Send volume messages when volume, muted, or iframeReady changes
  useEffect(() => {
    if (iframeReady) {
      sendVolumeMessage(volume, isMuted);
    }
  }, [volume, isMuted, iframeReady, sendVolumeMessage]);

  useEffect(() => {
    const handleIframeMessage = event => {
      const expectedIframeOrigin = getTargetOrigin();

      if (event.origin !== expectedIframeOrigin) {
        return;
      }
      if (event.source !== iframeRef.current?.contentWindow) {
        return;
      }

      if (
        event.data &&
        typeof event.data === 'object' &&
        event.data.type === 'VOLTORB_FLIP_IFRAME_READY'
      ) {
        setIframeReady(true);
        // 6. Send initial focus AND volume state when iframe is ready
        sendFocusMessage(isFocus);
        sendVolumeMessage(volume, isMuted);
      }
    };

    window.addEventListener('message', handleIframeMessage);
    return () => {
      window.removeEventListener('message', handleIframeMessage);
    };
  }, [gameUrl, isFocus, sendFocusMessage, getTargetOrigin, volume, isMuted, sendVolumeMessage]);

  return (
    <AppContainer>
      <StyledIframe
        ref={iframeRef}
        src={gameUrl}
        frameBorder="0"
        title="Voltorb Flip"
      />
      {!isFocus && <Overlay />}
    </AppContainer>
  );
}

// ... (styled components are unchanged) ...
const AppContainer = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
  background-color: #309f6a; /* Match your game's body background if desired */
  overflow: hidden; /* Ensures iframe fits well */
`;

const StyledIframe = styled.iframe`
  display: block;
  width: 100%;
  height: 100%;
  border: none; /* Remove default iframe border */
`;

const Overlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 2; /* Ensures it's above the iframe */
  background-color: transparent;
`;

export default VoltorbFlip;

