// src/components/WelcomeScreen/index.js
import React, { useEffect } from 'react';

const WelcomeScreen = () => {
  useEffect(() => {
    // Sound is played by App.js before transitioning to this screen
  }, []);

  const style = `
    @import url('https://fonts.googleapis.com/css2?family=Tahoma&family=Franklin+Gothic+Medium&display=swap');
    .welcome-screen-body { height: 100vh; width: 100vw; display: flex; flex-direction: column; font-family: 'Franklin Gothic Medium', 'Tahoma', sans-serif; position: fixed; top: 0; left: 0; z-index: 9997; overflow: hidden; background-color: #084DA3; }
    .welcome-header-bar { min-height: 112px; width: 100%; background-color: #084DA3; position: relative; flex-shrink: 0; }
    .welcome-header-bar::before { content: ""; width: 100%; height: 7px; position: absolute; bottom: -2px; left: 0; background: linear-gradient(270deg, #084DA3 -33.4%, #084DA3 6.07%, #FFFFFF 49.56%, #084DA3 82.59%, #084DA3 121.25%); }
    .welcome-main-area { flex-grow: 1; width: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(to bottom, #3A7BD5, #2A5ABC); position: relative; color: white; }
    .welcome-main-area::before { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 30%; background: linear-gradient(to bottom, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0)); pointer-events: none; }
    .welcome-text-content { font-size: 3.5em; font-weight: normal; text-shadow: 1px 1px 0px rgba(0, 0, 0, 0.2); position: relative; z-index: 1; }
    .welcome-footer-bar { min-height: 60px; width: 100%; background-color: #084DA3; position: relative; flex-shrink: 0; }
    .welcome-footer-bar::before { content: ""; width: 100%; height: 7px; position: absolute; top: -2px; left: 0; background: linear-gradient(270deg, #084DA3 -33.4%, #084DA3 6.07%, #FF9933 49.56%, #084DA3 82.59%, #084DA3 121.25%); }
  `;
  return (
    <> <style>{style}</style>
      <div className="welcome-screen-body">
        <div className="welcome-header-bar"></div>
        <div className="welcome-main-area"> <div className="welcome-text-content"> welcome </div> </div>
        <div className="welcome-footer-bar"></div>
      </div> </>
  );
};
export default WelcomeScreen;