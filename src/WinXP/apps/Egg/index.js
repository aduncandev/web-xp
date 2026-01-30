import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import styled, { keyframes, createGlobalStyle } from 'styled-components';
import eggImg from 'assets/windowsIcons/egg.png';

import { useVolume } from '../../../context/VolumeContext';

const EGG_DATA_KEY = 'eggData';
const OLD_EGG_COUNT_KEY = 'eggCount';
const LAST_EGG_TIME_KEY = 'lastEggTime';

const FontStyles = createGlobalStyle`
  @font-face {
    font-family: 'DeterminationMono';
    font-weight: normal;
    font-style: normal;
    font-display: block; 
  }
`;

const AppContainer = styled.div`
  width: 100%;
  height: 100%;
  background-color: #000000;
  overflow: hidden;
  position: relative;
  user-select: none;
`;

const EggLayer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 2;
`;

const CenteredContent = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  position: relative;
  z-index: 10;
`;

const StyledGif = styled.img`
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  cursor: pointer;
  position: relative;
  z-index: 5;
  transform: translateY(-10%);
`;

const float = keyframes`
  0% { margin-top: 0px; }
  50% { margin-top: -10px; }
  100% { margin-top: 0px; }
`;

const StyledEgg = styled.img`
  max-width: 80px;
  height: auto;
  position: absolute;
  top: 0;
  left: 0;
  will-change: transform;
  animation: ${float} 3s ease-in-out infinite;
  z-index: 5;
`;

const DialogueContainer = styled.div`
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 20px);
  max-width: 600px;
  z-index: 20;
  background-color: #000;
  border: 3px solid #fff;
  padding: 15px;
  box-sizing: border-box;
  color: white;
  font-family: 'DeterminationMono', monospace;
  font-size: 1.2rem;
  line-height: 1.4;
  image-rendering: pixelated;
  pointer-events: auto;
`;

const DialogueText = styled.p`
  margin: 0;
`;

const OptionsContainer = styled.div`
  margin: 0;
  display: flex;
  justify-content: center;
  gap: 30px;
`;

const Option = styled.div`
  cursor: pointer;
  color: #fff;
  &:hover {
    color: yellow;
  }
  &::before {
    content: '* ';
  }
`;

function Egg() {
  const gifSrc = `${process.env.PUBLIC_URL}/gifs/tree.gif`;
  const musicSrc = `${process.env.PUBLIC_URL}/music/man.ogg`;
  const soundSrc = `${process.env.PUBLIC_URL}/music/egg.mp3`;

  const audioRef = useRef(null);
  const containerRef = useRef(null);
  const { volume, isMuted, applyVolume } = useVolume();

  const [dialogueStep, setDialogueStep] = useState(0);

  const [eggs, setEggs] = useState(() => {
    const saved = localStorage.getItem(EGG_DATA_KEY);
    if (saved) return JSON.parse(saved);

    const oldKey = localStorage.getItem(OLD_EGG_COUNT_KEY);
    if (oldKey) {
      const count = parseInt(oldKey, 10);
      return Array.from({ length: count }).map((_, i) => ({
        x: Math.random() * window.screen.width,
        y: Math.random() * window.screen.height,
        id: Date.now() + i,
      }));
    }
    return [];
  });

  useLayoutEffect(() => {
    let animationId;

    const updateEggPositions = () => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const winX = rect.left;
      const winY = rect.top;

      const eggElements = document.querySelectorAll('.magic-egg-target');

      eggElements.forEach(el => {
        const globalX = parseFloat(el.getAttribute('data-x'));
        const globalY = parseFloat(el.getAttribute('data-y'));

        const drawX = globalX - winX;
        const drawY = globalY - winY;

        el.style.transform = `translate3d(${drawX}px, ${drawY}px, 0)`;

        const isVisible =
          drawX > -100 &&
          drawX < rect.width + 100 &&
          drawY > -100 &&
          drawY < rect.height + 100;

        el.style.display = isVisible ? 'block' : 'none';
      });

      animationId = requestAnimationFrame(updateEggPositions);
    };

    animationId = requestAnimationFrame(updateEggPositions);
    return () => cancelAnimationFrame(animationId);
  }, [eggs]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = volume / 100;
      audio.muted = isMuted;

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          const startAudio = () => {
            audio.play();
            if (containerRef.current) {
              containerRef.current.removeEventListener('click', startAudio);
            }
          };
          if (containerRef.current) {
            containerRef.current.addEventListener('click', startAudio);
          }
        });
      }
    }
    return () => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
      audioRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  const handleTreeClick = () => {
    if (dialogueStep === 0) {
      const lastTime = parseInt(
        localStorage.getItem(LAST_EGG_TIME_KEY) || '0',
        10,
      );
      const now = Date.now();

      if (now - lastTime < 24 * 60 * 60 * 1000) {
        setDialogueStep(7);
      } else {
        setDialogueStep(1);
      }

      if (audioRef.current?.paused) audioRef.current.play();
    }
  };

  const handleYes = e => {
    e.stopPropagation();
    setDialogueStep(4);

    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const eggSize = 90;
    const safeWidth = Math.max(0, rect.width - eggSize);
    const safeHeight = Math.max(0, rect.height - eggSize);

    const randomX = rect.left + Math.random() * safeWidth;
    const randomY = rect.top + Math.random() * safeHeight;

    const newEgg = { x: randomX, y: randomY, id: Date.now() };
    const newEggs = [...eggs, newEgg];

    setEggs(newEggs);
    localStorage.setItem(EGG_DATA_KEY, JSON.stringify(newEggs));
    localStorage.setItem(LAST_EGG_TIME_KEY, Date.now().toString());

    const sound = new Audio(soundSrc);
    applyVolume(sound);
    sound.play();
  };

  const handleDialogueClick = () => {
    if (dialogueStep === 1) setDialogueStep(2);
    else if (dialogueStep === 2) setDialogueStep(3);
    else if (dialogueStep === 7) setDialogueStep(8);
    else if (dialogueStep >= 4) setDialogueStep(0);
  };

  const renderDialogue = () => {
    switch (dialogueStep) {
      case 1:
        return <DialogueText>* (Well, there is a man here.)</DialogueText>;
      case 2:
        return <DialogueText>* (He offered you something)</DialogueText>;
      case 3:
        return (
          <OptionsContainer>
            <Option onClick={handleYes}>YES.</Option>
            <Option
              onClick={e => {
                e.stopPropagation();
                setDialogueStep(5);
              }}
            >
              NO.
            </Option>
          </OptionsContainer>
        );
      case 4:
        return <DialogueText>* (You Recieved an Egg.)</DialogueText>;
      case 5:
        return <DialogueText>* (...)</DialogueText>;
      case 7:
        return <DialogueText>* (Well, there is no man here...)</DialogueText>;
      case 8:
        return <DialogueText>* (Maybe he'll be back tomorrow...)</DialogueText>;
      default:
        return null;
    }
  };

  return (
    <AppContainer ref={containerRef}>
      <FontStyles />

      <EggLayer>
        {eggs.map(egg => (
          <StyledEgg
            key={egg.id}
            src={eggImg}
            alt="An Egg"
            className="magic-egg-target"
            data-x={egg.x}
            data-y={egg.y}
            style={{ transform: 'translate(-9999px, -9999px)' }}
          />
        ))}
      </EggLayer>

      <CenteredContent>
        <StyledGif src={gifSrc} onClick={handleTreeClick} />
      </CenteredContent>

      <audio ref={audioRef} src={musicSrc} loop />

      {dialogueStep > 0 && (
        <DialogueContainer onClick={handleDialogueClick}>
          {renderDialogue()}
        </DialogueContainer>
      )}
    </AppContainer>
  );
}

export default Egg;
