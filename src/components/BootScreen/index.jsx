import React from 'react';
import styled, { keyframes, createGlobalStyle } from 'styled-components';
import winLogo from 'assets/windowsIcons/xplogo.png';
import MicrosoftLogo from 'assets/windowsIcons/microsoft-logo.png';

const PixelateStyle = createGlobalStyle`
  .boot-screen-root {
    image-rendering: -moz-crisp-edges;
    image-rendering: -webkit-crisp-edges;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
  }
`;

const loadingMove = keyframes`
  0% { left: -40px; }
  100% { left: 100%; }
`;

const BootContainer = styled.div`
  background-color: #000000;
  color: #fefefe;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  width: 100vw;
  font-family: 'Tahoma', sans-serif;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 9999;
  padding-bottom: 60px;
  user-select: none;
`;

const BootLogo = styled.img`
  width: 275px;
  height: auto;
  margin-bottom: 45px;
  image-rendering: pixelated;
`;

const LoadingBarContainer = styled.div`
  width: 142px;
  height: 14px;
  background-color: transparent;
  border: 2px solid #b2b2b2;
  border-radius: 3px;
  overflow: hidden;
  position: relative;
  padding: 2px;
  box-sizing: content-box;
`;

const LoadingBarProgress = styled.div`
  position: absolute;
  top: 2px;
  left: 0;
  height: 14px;
  display: flex;
  align-items: center;
  gap: 2px;
  animation: ${loadingMove} 2s linear infinite;
`;

const Chiclet = styled.div`
  width: 10px;
  height: 100%;
  border-radius: 1px;

  background: linear-gradient(
    to bottom,
    #adceff 0px,
    #adceff 2px,
    #5398e9 2px,
    #5398e9 4px,
    #2258a6 4px,
    #2258a6 9px,
    #15366a 9px,
    #15366a 100%
  );

  box-shadow: none;
`;

const CopyrightText = styled.div`
  position: absolute;
  bottom: 20px;
  left: 25px;
  font-size: 0.75em;
  color: #cccccc;
  letter-spacing: 0.5px;
  font-weight: 600;
  -webkit-font-smoothing: none;
`;

const MicrosoftLogoBottom = styled.img`
  position: absolute;
  bottom: 20px;
  right: 25px;
  width: 70px;
  height: auto;
  filter: grayscale(1) brightness(1.8);
  image-rendering: pixelated;
`;

const BootScreen = () => {
  return (
    <BootContainer className="boot-screen-root">
      <PixelateStyle />
      <BootLogo
        src={winLogo}
        alt="Windows XP Logo"
        onError={e => (e.target.style.opacity = 0)}
      />
      <LoadingBarContainer>
        <LoadingBarProgress>
          <Chiclet />
          <Chiclet />
          <Chiclet />
        </LoadingBarProgress>
      </LoadingBarContainer>
      <CopyrightText>Copyright &copy; Microsoft Corporation</CopyrightText>
      <MicrosoftLogoBottom
        src={MicrosoftLogo}
        alt="Microsoft"
        onError={e => (e.target.style.opacity = 0)}
      />
    </BootContainer>
  );
};

export default BootScreen;
