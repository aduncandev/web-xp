import React, { useEffect, useRef, useState } from 'react';
import styled, { keyframes, createGlobalStyle } from 'styled-components';

import egg from 'assets/windowsIcons/egg.png';

// --- 1. Import the hook ---
import { useVolume } from '../../../context/VolumeContext'; // Assuming this path is correct

// --- LOCALSTORAGE KEYS ---
const EGG_COUNT_KEY = 'eggCount';
const LAST_EGG_TIME_KEY = 'lastEggTime';

// --- STYLES ---
// ... (All styled components are unchanged) ...
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
   display: flex;
   justify-content: center;
   align-items: center;
   background-color: #000000;
   overflow: hidden;
   position: relative;
`;

const CenteredContent = styled.div`
   display: flex;
   flex-direction: column;
   justify-content: center;
   align-items: center;
   width: 100%;
   height: 100%;
   position: relative;
   overflow: hidden; /* NO SCROLLBARS */
`;

const StyledGif = styled.img`
   max-width: 100%;
   max-height: 100%;
   object-fit: contain;
   cursor: pointer;
   user-select: none;
   position: relative;
   z-index: 5;
   /* Move tree up slightly to make more room for eggs */
  transform: translateY(
    -10%
  );
`;

const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
`;

const StyledEgg = styled.img`
   max-width: 80px; /* This is our key number */
   height: auto;
   animation: ${float} 3s ease-in-out infinite;
   user-select: none;
   position: absolute;
   z-index: 4;
`;

const DialogueContainer = styled.div`
   position: absolute;
   bottom: 10px;
   left: 10px;
   right: 10px;
   z-index: 10;

   background-color: #000;
   border: 3px solid #fff;
   padding: 15px;
   color: white;

   font-family: 'DeterminationMono', monospace;

   font-size: 1.2rem;
   line-height: 1.4;
   user-select: none;

   -webkit-font-smoothing: none;
   font-smoothing: none;
   image-rendering: pixelated;
`;

const DialogueText = styled.p`
   margin: 0;
`;

const OptionsContainer = styled.div`
   margin: 0;
   display: flex;
   flex-direction: row;
   justify-content: center;
   gap: 30px;
`;

const Option = styled.div`
  margin: 0;
  cursor: pointer;
  color: #fff;

  &:hover {
    color: yellow;
  }

  &::before {
    content: '* ';
  }
`;

// --- COMPONENT LOGIC ---

function Egg() {
  const gifSrc = `${process.env.PUBLIC_URL}/gifs/tree.gif`;
  const eggSrc = egg;
  const musicSrc = `${process.env.PUBLIC_URL}/music/man.ogg`;
  const soundSrc = `${process.env.PUBLIC_URL}/music/egg.mp3`;

  const audioRef = useRef(null);

  const { volume, isMuted, applyVolume } = useVolume();

  const [eggCount, setEggCount] = useState(() =>
    parseInt(localStorage.getItem(EGG_COUNT_KEY) || '0', 10),
  );
  const [dialogueStep, setDialogueStep] = useState(0);

  // --- 3. This effect now ONLY handles autoplay logic ---
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.play().catch(error => {
        console.log('Autoplay prevented. Click the tree to start.', error);
      });
      return () => {
        audio.pause();
        audio.currentTime = 0;
      };
    }
  }, []); // Runs only on mount

  // --- 4. NEW: This effect syncs the music volume in real-time ---
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      // HTML audio volume is 0.0 to 1.0
      audio.volume = volume / 100;
      audio.muted = isMuted;
    }
    // This runs every time volume or isMuted changes
  }, [volume, isMuted]);

  // --- MODIFIED: When the tree is clicked ---
  const handleTreeClick = () => {
    if (dialogueStep === 0) {
      // --- This check is moved from handleYes ---
      const lastEggTime = parseInt(
        localStorage.getItem(LAST_EGG_TIME_KEY) || '0',
        10,
      );
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000; // 24 hours

      if (now - lastEggTime < oneDay) {
        // Set to < 1 for testing
        setDialogueStep(7); // Show "no man here" message
      } else {
        setDialogueStep(1); // Start the normal dialogue
      }
      // -----------------------------------------

      const audio = audioRef.current;
      if (audio && audio.paused) {
        // The audio element *already* has the correct volume
        // from the useEffect above, so we can just play it.
        audio.play();
      }
    }
  };

  // When the dialogue box is clicked (to advance text)
  const handleDialogueClick = () => {
    // ... (no changes in this function) ...
    if (dialogueStep === 1) {
      setDialogueStep(2); // "* (He offered you something)"
    } else if (dialogueStep === 2) {
      setDialogueStep(3); // Show options
    } else if (dialogueStep === 7) {
      setDialogueStep(8);
    }
    // After choice/fail (steps 4, 5, 7), click to close
    else if (dialogueStep >= 4) {
      setDialogueStep(0); // Hide box
    }
    // If step is 3 (options shown), clicking the box does nothing.
  };

  // --- MODIFIED: When "YES." is clicked ---
  const handleYes = e => {
    e.stopPropagation(); // Prevents handleDialogueClick

    // --- The time check is removed, as it's now in handleTreeClick ---
    // We can assume it's safe to give an egg.

    setDialogueStep(4); // "* (You Recieved an Egg.)"

    const currentCount = parseInt(
      localStorage.getItem(EGG_COUNT_KEY) || '0',
      10,
    );
    const newCount = currentCount + 1;
    const now = Date.now(); // We still need 'now' to save the time

    setEggCount(newCount);
    localStorage.setItem(EGG_COUNT_KEY, newCount.toString());
    localStorage.setItem(LAST_EGG_TIME_KEY, now.toString()); // Save new time

    // --- 5. Apply volume to the sound effect ---
    const sound = new Audio(soundSrc);
    applyVolume(sound); // Apply global volume settings
    sound.play();
    // ------------------------------------------

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: EGG_COUNT_KEY,
        newValue: newCount.toString(),
      }),
    );
  };

  // When "NO." is clicked
  const handleNo = e => {
    // ... (no changes in this function) ...
    e.stopPropagation(); // Prevents handleDialogueClick
    setDialogueStep(5); // "* (...)"
  };

  // Helper function to render the correct dialogue
  const renderDialogue = () => {
    // ... (no changes in this function) ...
    switch (dialogueStep) {
      case 1:
        return <DialogueText>* (Well, there is a man here.)</DialogueText>;
      case 2:
        return <DialogueText>* (He offered you something)</DialogueText>;
      case 3:
        return (
          <OptionsContainer>
            <Option onClick={handleYes}>YES.</Option>
            <Option onClick={handleNo}>NO.</Option>
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
    <AppContainer>
      <FontStyles />

      <CenteredContent>
        {/* ... (no changes to JSX) ... */}
        <StyledGif
          src={gifSrc}
          alt="A mysterious tree"
          onClick={handleTreeClick}
        />

        {Array.from({ length: eggCount }).map((_, index) => {
          const randTop = Math.sin(index * 5.37 + 0.5) * 0.5 + 0.5;
          const randLeft = Math.cos(index * 3.79 + 0.3) * 0.5 + 0.5;
          const top = `calc(${randTop} * (100%))`;
          const left = `calc(${randLeft} * (100%))`;

          return (
            <StyledEgg
              key={index}
              src={eggSrc}
              alt="An Egg"
              style={{
                top: top,
                left: left,
              }}
            />
          );
        })}
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
