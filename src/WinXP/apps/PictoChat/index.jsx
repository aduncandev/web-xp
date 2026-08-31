import React from 'react';
import styled from 'styled-components';

function PictoChat({ isFocus }) {
  const gameUrl = `https://chat.aduncan.dev`;

  return (
    <AppContainer>
      <StyledIframe src={gameUrl} frameBorder="0" title="PictoChat" />
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

export default PictoChat;
