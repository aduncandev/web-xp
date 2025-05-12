// src/components/BootScreen/index.js
import React from 'react';
import winLogo from 'assets/windowsIcons/xplogo.png';

const BootScreen = () => {
  // --- Further Refined Styles for Boot Screen ---
  const style = `
    @import url('https://fonts.googleapis.com/css2?family=Tahoma&display=swap');

    .boot-screen {
      background-color: #000000;
      color: #FEFEFE;
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
    }
    .boot-logo {
      width: 220px;
      height: auto;
      margin-bottom: 40px;
    }
    /* Loading Bar Styles */
    .loading-bar-container {
      width: 130px;
      height: 10px;
      background-color: #1a1a1a;
      border: 1px solid #6a6a6a;
      border-radius: 0px;
      overflow: hidden; /* Important for moving block */
      margin-top: 10px;
      padding: 1px;
      box-shadow: inset 0 0 1px #000;
      position: relative; /* Needed for positioning the moving block */
    }
    /* --- NEW: Moving Block Style --- */
    .loading-bar-progress {
      position: absolute; /* Position relative to container */
      top: 1px; /* Align with padding */
      left: 0; /* Start at the left */
      height: calc(100% - 2px); /* Account for padding */
      width: 25px; /* Width of the moving block */
      /* 3-segment blue gradient for the block */
      background: linear-gradient(
        90deg,
        #2d9dff 0px, #2d9dff 7px, /* Segment 1 */
        #1e6bb8 7px, #1e6bb8 8px, /* Separator */
        #2d9dff 8px, #2d9dff 15px, /* Segment 2 */
        #1e6bb8 15px, #1e6bb8 16px, /* Separator */
        #2d9dff 16px, #2d9dff 23px /* Segment 3 */
        /* The rest is transparent implicitly */
      );
      background-size: 100% 100%; /* Ensure gradient covers the block */
      border-radius: 0px;
      /* --- NEW: Animation for moving block --- */
      animation: loadingXP_move 1.5s linear infinite; /* Loop infinitely */
    }

    /* Copyright and Bottom Logo Styles */
    .copyright-text {
        position: absolute;
        bottom: 15px;
        left: 25px;
        font-size: 0.75em;
        color: #cccccc;
        letter-spacing: 0.5px;
    }
    .microsoft-logo-bottom {
        position: absolute;
        bottom: 10px;
        right: 25px;
        width: 90px;
        height: auto;
        filter: grayscale(1) brightness(1.8);
    }

    /* --- UPDATED: Keyframes for moving block animation --- */
    @keyframes loadingXP_move {
      0% {
        left: -25px; /* Start off-screen left */
      }
      100% {
        left: 130px; /* End off-screen right (container width) */
      }
    }
  `;

  return (
    <>
      <style>{style}</style>
      <div className="boot-screen">
        {/* --- PLACEHOLDER LOGOS --- */}
        <img
            src={winLogo}
            alt="Windows XP Logo"
            className="boot-logo"
            onError={(e) => e.target.src='https://placehold.co/220x80/000000/FFFFFF?text=Windows+XP+Logo'}
         />
        <div className="loading-bar-container">
          {/* The progress div is now the moving block */}
          <div className="loading-bar-progress"></div>
        </div>
        <div className="copyright-text">Copyright © Microsoft Corporation</div>
         <img
            src="/ms_logo.png"
            alt="Microsoft"
            className="microsoft-logo-bottom"
            onError={(e) => e.target.src='https://placehold.co/90x20/000000/CCCCCC?text=Microsoft'}
         />
      </div>
    </>
  );
};

export default BootScreen;