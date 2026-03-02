import React from 'react';
import styled from 'styled-components';

const WelcomeContainer = styled.div`
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  font-family: 'Franklin Gothic Medium', 'Tahoma', sans-serif;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 9997;
  overflow: hidden;
  background-color: #00309c;
`;

const HeaderBar = styled.div`
  min-height: 112px;
  width: 100%;
  background-color: #00309c;
  position: relative;
  flex-shrink: 0;

  &::before {
    content: '';
    width: 100%;
    height: 7px;
    position: absolute;
    bottom: -2px;
    left: 0;
    background: linear-gradient(
      270deg,
      #00309c -33.4%,
      #00309c 6.07%,
      #ffffff 49.56%,
      #00309c 82.59%,
      #00309c 121.25%
    );
  }

  @media (max-width: 768px) {
    min-height: 50px;
  }
`;

const MainArea = styled.div`
  flex-grow: 1;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(
    19.48% 42.48% at 10% 22.48%,
    #9cc0e9 0%,
    #5a7edc 100%
  );
  position: relative;
  color: white;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 30%;
    background: linear-gradient(
      to bottom,
      rgba(255, 255, 255, 0.15),
      rgba(255, 255, 255, 0)
    );
    pointer-events: none;
  }
`;

const WelcomeText = styled.div`
  font-size: 3.5em;
  font-weight: normal;
  text-shadow: 3px 3px 0px #2b47ab;
  position: relative;
  z-index: 1;
  font-style: italic;
  letter-spacing: 1px;

  @media (max-width: 768px) {
    font-size: 2.5em;
  }
`;

const FooterBar = styled.div`
  min-height: 112px;
  width: 100%;
  background-color: #00309c;
  position: relative;
  flex-shrink: 0;

  &::before {
    content: '';
    width: 100%;
    height: 7px;
    position: absolute;
    top: -2px;
    left: 0;
    background: linear-gradient(
      270deg,
      #00309c -33.4%,
      #00309c 6.07%,
      #ff9933 49.56%,
      #00309c 82.59%,
      #00309c 121.25%
    );
  }

  @media (max-width: 768px) {
    min-height: 55px;
  }
`;

const WelcomeScreen = () => {
  return (
    <WelcomeContainer>
      <HeaderBar />
      <MainArea>
        <WelcomeText>welcome</WelcomeText>
      </MainArea>
      <FooterBar />
    </WelcomeContainer>
  );
};

export default WelcomeScreen;
