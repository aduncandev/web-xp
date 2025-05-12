// src/components/ShutdownScreen/index.js
import React, { useState, useEffect } from 'react';
// Optional: If you want to use the same logo as the login screen, import it.
import winLogo from 'assets/windowsIcons/xplogo.png';

const ShutdownScreen = ({ finalMessage = 'Windows is shutting down...' }) => {
  const messages = [
    'Logging out...',
    'Saving your settings...',
    finalMessage, // The message passed via props will be the last one
  ];
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    if (currentMessageIndex < messages.length - 1) {
      const timer = setTimeout(() => {
        setCurrentMessageIndex(prevIndex => prevIndex + 1);
      }, 1200); // Time each intermediate message is displayed (adjust as needed)
      return () => clearTimeout(timer);
    }
  }, [currentMessageIndex, messages.length]);

  // Styling similar to LoginScreen, but simplified for shutdown context
  const style = `
    @import url('https://fonts.googleapis.com/css2?family=Tahoma&family=Source+Sans+Pro:wght@400;600&display=swap');

    .shutdown-screen-body {
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
      background-color: #00309C; /* Updated background color */
    }

    .shutdown-header-bar {
      min-height: 112px;
      width: 100%;
      background-color: #00309C; /* Updated background color */
      position: relative;
      z-index: 1;
      flex-shrink: 0;
    }
    .shutdown-header-bar::before {
      content: "";
      width: 100%;
      height: 7px;
      position: absolute;
      bottom: -2px;
      left: 0;
      background: linear-gradient(270deg, #00309C -33.4%, #00309C 6.07%, #FFFFFF 49.56%, #00309C 82.59%, #00309C 121.25%); /* Updated gradient */
    }

    .shutdown-main-content {
      flex-grow: 1;
      width: 100%;
      background: radial-gradient(19.48% 42.48% at 10% 22.48%, #9CC0E9 0%, #5A7EDC 100%); /* Updated background gradient */
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
      color: white;
      position: relative;
      z-index: 0;
      text-align: center;
    }
    .shutdown-main-content::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 60%;
        background: linear-gradient(to bottom, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0));
        pointer-events: none;
    }


    .shutdown-logo {
      width: 170px;
      height: auto;
      margin-bottom: 25px;
      filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.3));
    }

    .shutdown-status-message {
      font-family: 'Source Sans Pro', 'Tahoma', sans-serif;
      font-weight: 400;
      font-size: 1.4em;
      text-shadow: 1px 1px 1px rgba(0,0,0,0.2);
    }

    .shutdown-footer-bar {
      min-height: 112px; /* Updated min-height */
      width: 100%;
      background-color: #00309C; /* Updated background color */
      position: relative;
      z-index: 1;
      flex-shrink: 0;
    }
    .shutdown-footer-bar::before {
      content: "";
      width: 100%;
      height: 7px;
      position: absolute;
      top: -2px;
      left: 0;
      background: linear-gradient(270deg, #00309C -33.4%, #00309C 6.07%, #FF9933 49.56%, #00309C 82.59%, #00309C 121.25%); /* Updated gradient */
    }
  `;

  return (
    <>
      <style>{style}</style>
      <div className="shutdown-screen-body">
        <div className="shutdown-header-bar"></div>
        <div className="shutdown-main-content">
          <img
            // src={winXpLogo} // Use imported logo if you prefer
            src={winLogo} // Or a generic placeholder / public path
            alt="Windows XP"
            className="shutdown-logo"
            onError={e =>
              (e.target.src =
                'https://placehold.co/150x60/transparent/FFFFFF?text=Windows+XP')
            }
          />
          <div className="shutdown-status-message">
            {messages[currentMessageIndex]}
          </div>
        </div>
        <div className="shutdown-footer-bar"></div>
      </div>
    </>
  );
};

export default ShutdownScreen;
