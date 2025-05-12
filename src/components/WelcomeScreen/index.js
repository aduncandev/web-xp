// src/components/WelcomeScreen/index.js
import React, { useEffect } from 'react';

const WelcomeScreen = () => {
  useEffect(() => {
    // Sound is played by App.js before transitioning to this screen
  }, []);

  const style = `
    @import url('https://fonts.googleapis.com/css2?family=Tahoma&family=Franklin+Gothic+Medium&display=swap');
    .welcome-screen-body { height: 100vh; width: 100vw; display: flex; flex-direction: column; font-family: 'Franklin Gothic Medium', 'Tahoma', sans-serif; position: fixed; top: 0; left: 0; z-index: 9997; overflow: hidden; background-color: #00309C; } /* Updated background color */
    .welcome-header-bar { min-height: 112px; width: 100%; background-color: #00309C; position: relative; flex-shrink: 0; } /* Updated background color */
    .welcome-header-bar::before { content: ""; width: 100%; height: 7px; position: absolute; bottom: -2px; left: 0; background: linear-gradient(270deg, #00309C -33.4%, #00309C 6.07%, #FFFFFF 49.56%, #00309C 82.59%, #00309C 121.25%); } /* Updated gradient */
    .welcome-main-area { flex-grow: 1; width: 100%; display: flex; align-items: center; justify-content: center; background: radial-gradient(19.48% 42.48% at 10% 22.48%, #9CC0E9 0%, #5A7EDC 100%); position: relative; color: white; } /* Updated background gradient */
    .welcome-main-area::before { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 30%; background: linear-gradient(to bottom, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0)); pointer-events: none; }
    .welcome-text-content { font-size: 3.5em; font-weight: normal; text-shadow: 3px 3px 0px #2B47AB; position: relative; z-index: 1; }
    .welcome-footer-bar { min-height: 112px; width: 100%; background-color: #00309C; position: relative; flex-shrink: 0; } /* Updated min-height and background color */
    .welcome-footer-bar::before { content: ""; width: 100%; height: 7px; position: absolute; top: -2px; left: 0; background: linear-gradient(270deg, #00309C -33.4%, #00309C 6.07%, #FF9933 49.56%, #00309C 82.59%, #00309C 121.25%); } /* Updated gradient */
  `;
  return (
    <>
      {' '}
      <style>{style}</style>
      <div className="welcome-screen-body">
        <div className="welcome-header-bar"></div>
        <div className="welcome-main-area">
          {' '}
          <div className="welcome-text-content"> welcome </div>{' '}
        </div>
        <div className="welcome-footer-bar"></div>
      </div>{' '}
    </>
  );
};
export default WelcomeScreen;
