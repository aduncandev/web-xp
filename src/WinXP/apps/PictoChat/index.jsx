import React from 'react';
import styled from 'styled-components';

// This component will embed your Voltorb Flip game using an iframe.
// It's similar to how the Paint application is handled.

function PictoChat({ isFocus }) {
  // The src for the iframe will point to the index.html of your game
  // located in the public/voltorb_flip/ directory.
  const gameUrl = `https://chat.aduncan.dev`;

  return (
    <AppContainer>
      <StyledIframe src={gameUrl} frameBorder="0" title="PictoChat" />
      {/*
        The div below is a common trick for iframes.
        When the main window isn't focused, this overlay div can capture mouse events
        preventing the iframe from "stealing" focus unexpectedly or causing issues
        with the parent window's event handling (like dragging the window).
      */}
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
  background-color: transparent; /* Make it invisible */
`;

export default PictoChat;
