import React, { useEffect } from 'react';
import styled, { createGlobalStyle } from 'styled-components';

const GlobalStyle = createGlobalStyle`
  body {
    margin: 0;
    padding: 0;
    overflow: hidden;
    background-color: #000082;
  }
`;

const Container = styled.div`
  background-color: #000082;
  color: #ffffff;
  font-family: 'Lucida Console', 'Lucida Sans Typewriter', monospace;
  font-size: 18px;
  line-height: 24px;
  width: 100vw;
  height: 100vh;
  padding: 40px;
  box-sizing: border-box;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 999999;
  overflow: hidden;
  cursor: none;

  ::selection {
    background: transparent;
  }
`;

const Paragraph = styled.p`
  margin-bottom: 20px;
`;

const TechnicalInfo = styled.div`
  margin-top: 40px;
`;

const Indented = styled.div`
  margin-left: 20px;
  white-space: pre-wrap;
  font-size: 0.9em;
  color: #cccccc;
`;

const BSOD = ({ error }) => {
  useEffect(() => {
    const handleRestart = () => {
      window.location.reload();
    };

    const timer = setTimeout(() => {
      window.addEventListener('keydown', handleRestart);
      window.addEventListener('click', handleRestart);
    }, 2000);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleRestart);
      window.removeEventListener('click', handleRestart);
    };
  }, []);

  // --- ERROR PARSING LOGIC ---
  const errorStr = error?.toString() || 'UNKNOWN_ERROR';
  const errorName = errorStr
    .split(':')[0]
    .toUpperCase()
    .replace(/\s+/g, '_');

  // Fake a memory address based on the error length
  const fakeAddress = `0x${(errorStr.length * 123456)
    .toString(16)
    .toUpperCase()
    .padStart(8, '0')}`;

  return (
    <>
      <GlobalStyle />
      <Container>
        <Paragraph>
          A problem has been detected and Windows has been shut down to prevent
          damage to your computer.
        </Paragraph>

        <Paragraph>
          The problem seems to be caused by the following file:{' '}
          <strong>REACT_RENDERER.SYS</strong>
        </Paragraph>

        <Paragraph style={{ marginTop: '30px', marginBottom: '30px' }}>
          {errorName}
        </Paragraph>

        <Paragraph>
          If this is the first time you've seen this stop error screen, restart
          your computer. If this screen appears again, follow these steps:
        </Paragraph>

        <Paragraph>
          Check to make sure any new hardware or software is properly installed.
          If this is a new installation, ask your hardware or software
          manufacturer for any Windows updates you might need.
        </Paragraph>

        <Paragraph>
          If problems continue, disable or remove any newly installed hardware
          or software. Disable BIOS memory options such as caching or shadowing.
          If you need to use Safe Mode to remove or disable components, restart
          your computer, press F8 to select Advanced Startup Options, and then
          select Safe Mode.
        </Paragraph>

        <TechnicalInfo>
          <Paragraph>Technical information:</Paragraph>
          <Paragraph>
            *** STOP: {fakeAddress} (0xFD3094C2, 0x00000001, 0xFBFE7617,
            0x00000000)
          </Paragraph>
          <Paragraph>
            *** {errorName} - Address {fakeAddress} base at {fakeAddress},
            DateStamp {Math.floor(Date.now() / 1000).toString(16)}
          </Paragraph>

          {/* Display the actual error message nicely */}
          <Paragraph>Spec:</Paragraph>
          <Indented>{errorStr}</Indented>
        </TechnicalInfo>
      </Container>
    </>
  );
};

export default BSOD;
