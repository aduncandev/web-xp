import React from 'react';
import styled from 'styled-components';

function PinBall({ isFocus }) {
  const gameUrl = `https://98.js.org/programs/pinball/space-cadet.html`;

  return (
    <AppContainer>
      <StyledIframe
        src={gameUrl}
        frameBorder="0"
        title="3D Pinball for Windows - Space Cadet"
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

export default PinBall;
