import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import winLogo from 'assets/windowsIcons/xplogo.png';

// --- STYLED COMPONENTS ---

const Container = styled.div`
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  font-family: 'Tahoma', 'Source Sans Pro', sans-serif;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 9996;
  overflow: hidden;
  background-color: #00309c;
`;

const HeaderBar = styled.div`
  min-height: 112px;
  width: 100%;
  background-color: #00309c;
  position: relative;
  z-index: 1;
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

  /* --- FIX: Match Login/Welcome scaling --- */
  @media (max-width: 768px) {
    min-height: 50px;
  }
`;

const MainContent = styled.div`
  flex-grow: 1;
  width: 100%;
  background: radial-gradient(
    19.48% 42.48% at 10% 22.48%,
    #9cc0e9 0%,
    #5a7edc 100%
  );
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: white;
  position: relative;
  z-index: 0;
  text-align: center;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 60%;
    background: linear-gradient(
      to bottom,
      rgba(255, 255, 255, 0.12),
      rgba(255, 255, 255, 0)
    );
    pointer-events: none;
  }
`;

const Logo = styled.img`
  width: 170px;
  height: auto;
  margin-bottom: 25px;
  filter: drop-shadow(1px 1px 2px rgba(0, 0, 0, 0.3));
`;

const StatusMessage = styled.div`
  font-family: 'Source Sans Pro', 'Tahoma', sans-serif;
  font-weight: 400;
  font-size: 1.4em;
  text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.2);
`;

const FooterBar = styled.div`
  min-height: 112px;
  width: 100%;
  background-color: #00309c;
  position: relative;
  z-index: 1;
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

  /* --- FIX: Match Login/Welcome scaling --- */
  @media (max-width: 768px) {
    min-height: 55px;
  }
`;

// --- COMPONENT ---

const ShutdownScreen = ({ messages = ['Windows is shutting down...'] }) => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    // Only cycle messages if there is more than one
    if (currentMessageIndex < messages.length - 1) {
      const timer = setTimeout(() => {
        setCurrentMessageIndex(prevIndex => prevIndex + 1);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [currentMessageIndex, messages.length]);

  return (
    <Container>
      <HeaderBar />
      <MainContent>
        <Logo
          src={winLogo}
          alt="Windows XP"
          onError={e => (e.target.style.opacity = 0)}
        />
        <StatusMessage>{messages[currentMessageIndex]}</StatusMessage>
      </MainContent>
      <FooterBar />
    </Container>
  );
};

export default ShutdownScreen;
