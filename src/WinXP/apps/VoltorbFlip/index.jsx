import React, { useEffect, useRef, useCallback, useState } from 'react';
import styled from 'styled-components';
import { useVolume } from '../../../context/VolumeContext';

function VoltorbFlip({ isFocus }) {
  const gameUrl = `${import.meta.env.BASE_URL}voltorb_flip/`;
  const iframeRef = useRef(null);
  const [iframeReady, setIframeReady] = useState(false);

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

  const sendVolumeMessage = useCallback(
    (currentVolume, currentMuted) => {
      const iframe = iframeRef.current;
      if (iframe && iframe.contentWindow && iframeReady) {
        const targetOrigin = getTargetOrigin();
        iframe.contentWindow.postMessage(
          {
            type: 'VOLTORB_FLIP_VOLUME_CHANGE',
            volume: currentVolume / 100,
            muted: currentMuted,
          },
          targetOrigin,
        );
      }
    },
    [getTargetOrigin, iframeReady],
  );

  useEffect(() => {
    if (iframeReady) {
      sendFocusMessage(isFocus);
    }
  }, [isFocus, iframeReady, sendFocusMessage]);

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
        sendFocusMessage(isFocus);
        sendVolumeMessage(volume, isMuted);
      }
    };

    window.addEventListener('message', handleIframeMessage);
    return () => {
      window.removeEventListener('message', handleIframeMessage);
    };
  }, [
    gameUrl,
    isFocus,
    sendFocusMessage,
    getTargetOrigin,
    volume,
    isMuted,
    sendVolumeMessage,
  ]);

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

const Overlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 2;
  background-color: transparent;
`;

export default VoltorbFlip;
