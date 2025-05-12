import React, { useState, useEffect, useCallback } from 'react';
import WinXP from './WinXP';
import BootScreen from './components/BootScreen';
import LoginScreen from './components/LoginScreen';
import WelcomeScreen from './components/WelcomeScreen';
import ShutdownScreen from './components/ShutdownScreen';
import './index.css';

// --- Sound Imports ---
// Ensure these paths are correct relative to your src/assets/ folder.
import xpStartupSoundSrc from 'assets/sounds/xp_startup.wav';
import xpLogonSoundSrc from 'assets/sounds/xp_logon.wav';
import xpShutdownSoundSrc from 'assets/sounds/xp_shutdown.wav';
// xpLogoffSound is imported and played in WinXP/index.js

/**
 * Plays a sound file.
 * @param {string} soundSrc - The imported sound source.
 */
const playSound = soundSrc => {
  if (!soundSrc) {
    console.warn('playSound called with no soundSrc in App.js');
    return;
  }
  try {
    const audio = new Audio(soundSrc);
    audio.play().catch(error => {
      console.warn(`Audio playback failed for ${soundSrc} in App.js:`, error);
    });
  } catch (error) {
    console.error(`Error loading/playing audio ${soundSrc} in App.js:`, error);
  }
};

// --- Main App Component ---
function App() {
  const [screen, setScreen] = useState('boot');
  const [skillzSessionStatus, setSkillzSessionStatus] = useState('loggedOut');
  const [shutdownMessage, setShutdownMessage] = useState(
    'Windows is shutting down...',
  );

  useEffect(() => {
    let timer;
    if (screen === 'boot') {
      timer = setTimeout(() => {
        setScreen('login');
        setSkillzSessionStatus('loggedOut');
      }, 4500);
    } else if (screen === 'welcome') {
      timer = setTimeout(() => {
        setScreen('desktop');
        setSkillzSessionStatus('activeOnDesktop');
      }, 2500);
    } else if (screen === 'shuttingDown' || screen === 'restarting') {
      timer = setTimeout(() => {
        setScreen('boot');
      }, 4000);
    }
    return () => clearTimeout(timer);
  }, [screen]);

  const handleLogin = useCallback(() => {
    if (skillzSessionStatus === 'loggedInInBackground') {
      playSound(xpLogonSoundSrc);
      setScreen('desktop');
      setSkillzSessionStatus('activeOnDesktop');
    } else {
      playSound(xpStartupSoundSrc);
      setScreen('welcome');
    }
  }, [skillzSessionStatus]);

  const handleLogoff = useCallback(() => {
    // Logoff sound is played in WinXP/index.js
    setScreen('login');
    setSkillzSessionStatus('loggedOut');
  }, []);

  const handleSwitchUser = useCallback(() => {
    // Logoff sound for switch user is played in WinXP/index.js
    setScreen('login');
    setSkillzSessionStatus('loggedInInBackground');
  }, []);

  const handleShutdown = useCallback(() => {
    // This is called from WinXP component (after user is logged in)
    // Shutdown sound is played in WinXP/index.js
    setShutdownMessage('Windows is shutting down...');
    setScreen('shuttingDown');
    setSkillzSessionStatus('loggedOut');
  }, []);

  const handleRestart = useCallback(() => {
    // This is called from WinXP component (after user is logged in)
    // Restart sound is played in WinXP/index.js
    setShutdownMessage('Windows is restarting...');
    setScreen('restarting');
    setSkillzSessionStatus('loggedOut');
  }, []);

  // --- Handler for shutdown initiated from LoginScreen ---
  const handleInitiateShutdownFromLogin = useCallback(() => {
    playSound(xpShutdownSoundSrc); // Play shutdown sound
    // When shutting down from login screen, user is not logged in,
    // so we can directly go to the "Windows is shutting down..." message.
    setShutdownMessage('Windows is shutting down...');
    setScreen('shuttingDown');
    setSkillzSessionStatus('loggedOut'); // Ensure state is consistent
  }, []);

  const renderScreen = () => {
    switch (screen) {
      case 'boot':
        return <BootScreen />;
      case 'login':
        return (
          <LoginScreen
            onLogin={handleLogin}
            userStatus={skillzSessionStatus}
            onInitiateShutdown={handleInitiateShutdownFromLogin} // Pass the new handler
          />
        );
      case 'welcome':
        return <WelcomeScreen />;
      case 'desktop':
        return (
          <WinXP
            onLogoff={handleLogoff}
            onSwitchUser={handleSwitchUser}
            onShutdown={handleShutdown}
            onRestart={handleRestart}
          />
        );
      case 'shuttingDown':
      case 'restarting':
        // Ensure ShutdownScreen uses 'finalMessage' prop as defined in its implementation
        return <ShutdownScreen finalMessage={shutdownMessage} />;
      default:
        console.warn(`Unknown screen state: ${screen}. Falling back to login.`);
        return (
          <LoginScreen
            onLogin={handleLogin}
            userStatus={skillzSessionStatus}
            onInitiateShutdown={handleInitiateShutdownFromLogin}
          />
        );
    }
  };

  return <div className="App">{renderScreen()}</div>;
}

export default App;
