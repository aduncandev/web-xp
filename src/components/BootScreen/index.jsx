import React from 'react';
import styled, { keyframes, createGlobalStyle } from 'styled-components';
import winLogo from 'assets/windowsIcons/xplogo.png';
import MicrosoftLogo from 'assets/windowsIcons/microsoft-logo.png';

/*
 * The XP boot splash.
 *
 * Layout and colours are sampled from refkit/shots/realxp/boot-splash.png
 * (640x480), scaled x1.25 into the 800x600 space the numbers below are
 * written in.
 *
 * The whole composition is drawn into a fixed 800x600 stage that is scaled to
 * fit the window, rather than positioned against the viewport directly. That
 * is both the accurate behaviour and the fix for a real bug: the splash is a
 * VGA screen, and a VGA screen on a wider or shorter display is letterboxed,
 * not reflowed. Positioning the logo by percentage while sizing it in pixels
 * meant the two drifted apart as the window changed — on a short window the
 * progress bar climbed into the wordmark and "Web Edition" printed straight
 * through it.
 *
 * `--u` is one unit of that 800x600 design, expressed as a real length. Every
 * measure below is `calc(<sampled pixel value> * var(--u))`, so the whole
 * thing scales together. It is a custom property rather than the stage's
 * font-size because em compounds: inside an element already sized in em, a
 * margin or letter-spacing in em multiplies by that element's own font-size
 * instead of the scale, which spaces "P r o f e s s i o n a l" across half
 * the screen.
 */

const PixelateStyle = createGlobalStyle`
  .boot-screen-root {
    image-rendering: -moz-crisp-edges;
    image-rendering: -webkit-crisp-edges;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
  }
`;

const loadingMove = keyframes`
  0% { left: calc(-30 * var(--u)); }
  100% { left: 100%; }
`;

const BootContainer = styled.div`
  background-color: #000000;
  height: 100vh;
  width: 100vw;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 9999;
  overflow: hidden;
  user-select: none;
`;

/* The 4:3 screen itself, centred with black either side of it. */
const Stage = styled.div`
  /*
   * Never scaled past 1:1 of the design it was sampled into, so on a big
   * monitor the splash sits at its native size in the middle of a black
   * screen rather than being blown up to fill it. It still scales *down*
   * to fit a small window, which is the case that was broken.
   */
  --stage-w: min(100vw, 133.3333vh, 800px);
  --u: calc(var(--stage-w) / 800);

  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: var(--stage-w);
  height: calc(var(--stage-w) * 0.75);
  overflow: hidden;
  color: #fefefe;
  font-family: 'Tahoma', sans-serif;
`;

/* Ref: flag top at y=123/480 (25.6%); wordmark horizontally ~centred. */
const LogoBlock = styled.div`
  position: absolute;
  top: 25.6%;
  left: 50%;
  transform: translateX(-50%);
`;

const BootLogo = styled.img`
  width: calc(308 * var(--u));
  height: auto;
  display: block;
  image-rendering: pixelated;
`;

/* Ref: "Professional" under the wordmark — regular weight, white, indented
   slightly right of the W, ~5px gap below the wordmark (640-space). */
const EditionLine = styled.div`
  font-family: 'Franklin Gothic Book', 'Franklin Gothic Medium', 'Segoe UI',
    sans-serif;
  font-weight: 400;
  font-size: calc(34 * var(--u));
  line-height: 1;
  color: #ffffff;
  margin: calc(6 * var(--u)) 0 0 calc(16 * var(--u));
  letter-spacing: calc(0.5 * var(--u));
`;

/* Not stock: the x64 Edition splash hangs a smaller qualifier line under
   "Professional", and this build borrows the treatment. */
const EditionSubLine = styled.div`
  font-family: 'Franklin Gothic Book', 'Franklin Gothic Medium', 'Segoe UI',
    sans-serif;
  font-weight: 400;
  font-size: calc(19 * var(--u));
  line-height: 1;
  color: #ffffff;
  margin: calc(5 * var(--u)) 0 0 calc(17 * var(--u));
  letter-spacing: calc(0.6 * var(--u));
`;

/* Ref bar: outer 126x15 at 640 (-> 158x19), capsule ends, 1px light-gray
   ring outside a 1px dark-gray ring, black interior. */
const LoadingBarContainer = styled.div`
  position: absolute;
  top: 72.9%;
  left: 50%;
  transform: translateX(-50%);
  width: calc(158 * var(--u));
  height: calc(19 * var(--u));
  box-sizing: border-box;
  background-color: #000000;
  border: calc(1 * var(--u)) solid #b2b2b2;
  box-shadow: inset 0 0 0 calc(1 * var(--u)) #414141;
  border-radius: calc(8 * var(--u));
  overflow: hidden;
`;

const LoadingBarProgress = styled.div`
  position: absolute;
  top: calc(3 * var(--u));
  left: 0;
  height: calc(11 * var(--u));
  display: flex;
  align-items: center;
  gap: calc(2 * var(--u));
  animation: ${loadingMove} 2s linear infinite;
`;

/* Ref cell: 6x9 at 640 (-> 8x11), vivid blue with a bright band riding just
   above center: 2838C7 / 5979EF / 869EF3 / 5979EF / 2838C7. */
const Chiclet = styled.div`
  width: calc(8 * var(--u));
  height: calc(11 * var(--u));
  flex: none;
  border-radius: calc(1 * var(--u));
  background: linear-gradient(
    180deg,
    #2838c7 0,
    #2838c7 calc(1 * var(--u)),
    #5979ef calc(1 * var(--u)),
    #5979ef calc(2 * var(--u)),
    #869ef3 calc(2 * var(--u)),
    #869ef3 calc(5 * var(--u)),
    #5979ef calc(5 * var(--u)),
    #5979ef calc(8 * var(--u)),
    #2838c7 calc(8 * var(--u)),
    #2838c7 calc(11 * var(--u))
  );
`;

/* Ref: two regular-weight lines, near-white, bottom-left. */
const CopyrightText = styled.div`
  position: absolute;
  bottom: calc(24 * var(--u));
  left: calc(31 * var(--u));
  font-family: 'Tahoma', sans-serif;
  font-size: calc(15 * var(--u));
  line-height: calc(19 * var(--u));
  color: #efefef;
  font-weight: 400;
`;

const MicrosoftLogoBottom = styled.img`
  position: absolute;
  bottom: calc(20 * var(--u));
  right: calc(12 * var(--u));
  width: calc(105 * var(--u));
  height: auto;
  filter: grayscale(1) brightness(1.8);
  image-rendering: pixelated;
`;

const BootScreen = () => {
  return (
    <BootContainer className="boot-screen-root">
      <PixelateStyle />
      <Stage>
        <LogoBlock>
          <BootLogo
            src={winLogo}
            alt="Windows XP Logo"
            onError={e => (e.target.style.opacity = 0)}
          />
          <EditionLine>Professional</EditionLine>
          <EditionSubLine>Web Edition</EditionSubLine>
        </LogoBlock>
        <LoadingBarContainer>
          <LoadingBarProgress>
            <Chiclet />
            <Chiclet />
            <Chiclet />
          </LoadingBarProgress>
        </LoadingBarContainer>
        <CopyrightText>
          Copyright &copy; 1985-2001
          <br />
          Microsoft Corporation
        </CopyrightText>
        <MicrosoftLogoBottom
          src={MicrosoftLogo}
          alt="Microsoft"
          onError={e => (e.target.style.opacity = 0)}
        />
      </Stage>
    </BootContainer>
  );
};

export default BootScreen;
