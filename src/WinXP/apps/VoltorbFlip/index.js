import React, { useEffect, useRef, useCallback, useState } from 'react';
import styled from 'styled-components';

function VoltorbFlip({ isFocus }) {
  const gameUrl = `${process.env.PUBLIC_URL}/voltorb_flip/`;
  const iframeRef = useRef(null);
  const [iframeReady, setIframeReady] = useState(false);

  const sendFocusMessage = useCallback(
    focusState => {
      // Prettier: Removed parentheses for single arg
      const iframe = iframeRef.current;
      if (iframe && iframe.contentWindow) {
        let targetOrigin;
        try {
          targetOrigin = new URL(gameUrl).origin;
        } catch (e) {
          targetOrigin = new URL(gameUrl, window.location.origin).origin;
        }
        if (targetOrigin === 'null' || targetOrigin === 'about:blank') {
          targetOrigin = window.location.origin;
        }
        // console.log(
        //   `Parent: Sending message - focused: ${focusState} to Voltorb Flip iframe at origin: ${targetOrigin}`
        // );
        iframe.contentWindow.postMessage(
          { type: 'VOLTORB_FLIP_FOCUS_CHANGE', focused: focusState },
          targetOrigin,
        );
      }
    },
    [gameUrl],
  );

  useEffect(() => {
    if (iframeReady) {
      // console.log(
      //   `Parent: isFocus prop changed to ${isFocus}. Sending message because iframe is ready.`
      // );
      sendFocusMessage(isFocus);
    }
  }, [isFocus, iframeReady, sendFocusMessage]);

  useEffect(() => {
    const handleIframeMessage = event => {
      // Prettier: Removed parentheses for single arg
      let expectedIframeOrigin;
      try {
        expectedIframeOrigin = new URL(gameUrl, window.location.origin).origin;
      } catch (e) {
        expectedIframeOrigin = window.location.origin;
      }
      if (
        expectedIframeOrigin === 'null' ||
        expectedIframeOrigin === 'about:blank'
      ) {
        expectedIframeOrigin = window.location.origin;
      }

      if (event.origin !== expectedIframeOrigin) {
        // console.warn(
        //   `Parent: Message from unexpected origin '${event.origin}' rejected. Expected '${expectedIframeOrigin}'.`
        // );
        return;
      }

      if (event.source !== iframeRef.current?.contentWindow) {
        // console.warn(
        //   'Parent: Message received, but not from the expected iframe source.'
        // );
        return;
      }

      if (
        event.data &&
        typeof event.data === 'object' &&
        event.data.type === 'VOLTORB_FLIP_IFRAME_READY'
      ) {
        // console.log(
        //   'Parent: Received VOLTORB_FLIP_IFRAME_READY from iframe. Sending initial focus state.'
        // );
        setIframeReady(true);
        sendFocusMessage(isFocus);
      }
    };

    window.addEventListener('message', handleIframeMessage);
    return () => {
      window.removeEventListener('message', handleIframeMessage);
    };
  }, [gameUrl, isFocus, sendFocusMessage]);

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
