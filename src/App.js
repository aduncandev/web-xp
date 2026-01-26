import React, { useState, useEffect, useCallback } from 'react';
import WinXP from './WinXP';
import BootScreen from './components/BootScreen';
import LoginScreen from './components/LoginScreen';
import WelcomeScreen from './components/WelcomeScreen';
import ShutdownScreen from './components/ShutdownScreen';
import './index.css';

// --- Sound Imports ---
import xpStartupSoundSrc from 'assets/sounds/xp_startup.wav';
import xpLogonSoundSrc from 'assets/sounds/xp_logon.wav';
import xpShutdownSoundSrc from 'assets/sounds/xp_shutdown.wav';

// --- Volume Context ---
import { VolumeProvider, useVolume } from './context/VolumeContext'; // Import the provider and hook

/**
 * This component holds all your application logic.
 * Because it will be rendered *inside* VolumeProvider, it can safely use the useVolume() hook.
 */
function AppLogic() {
  const [screen, setScreen] = useState('boot');
  const [skillzSessionStatus, setSkillzSessionStatus] = useState('loggedOut');
  const [shutdownMessage, setShutdownMessage] = useState(
    'Windows is shutting down...',
  );

  // Get volume controls from our context. This is safe now.
  const { applyVolume } = useVolume();

  /**
   * Plays a sound file, applying the global volume and mute settings.
   */
  const playSound = useCallback(
    soundSrc => {
      if (!soundSrc) {
        console.warn('playSound called with no soundSrc in App.js');
        return;
      }
      try {
        const audio = new Audio(soundSrc);

        // Apply global volume settings
        if (typeof applyVolume !== 'function') {
          console.error(
            'applyVolume is not a function! Check VolumeContext.js',
          );
          // Still try to play, just without volume control
        } else {
          applyVolume(audio); // This should no longer be an error
        }

        audio.play().catch(error => {
          // Ignore errors caused by user not interacting with the page yet
          if (error.name !== 'NotAllowedError') {
            console.warn(
              `Audio playback failed for ${soundSrc} in App.js:`,
              error,
            );
          }
        });
      } catch (error) {
        console.error(
          `Error loading/playing audio ${soundSrc} in App.js:`,
          error,
        );
      }
    },
    [applyVolume],
  ); // Re-create this function if applyVolume changes

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
  }, [skillzSessionStatus, playSound]);

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
    // This is called from WinXP component (after user is in)
    // Restart sound is played in WinXP/index.js
    setShutdownMessage('Windows is restarting...');
    setScreen('restarting');
    setSkillzSessionStatus('loggedOut');
  }, []);

  // --- Handler for shutdown initiated from LoginScreen ---
  const handleInitiateShutdownFromLogin = useCallback(() => {
    playSound(xpShutdownSoundSrc); // Play shutdown sound
    setShutdownMessage('Windows is shutting down...');
    setScreen('shuttingDown');
    setSkillzSessionStatus('loggedOut');
  }, [playSound]);

  const renderScreen = () => {
    switch (screen) {
      case 'boot':
        return <BootScreen />;
      case 'login':
        return (
          <LoginScreen
            onLogin={handleLogin}
            userStatus={skillzSessionStatus}
            onInitiateShutdown={handleInitiateShutdownFromLogin}
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

/**
 * Main App component now just wraps AppLogic with the VolumeProvider.
 */
function App() {
  return (
    <VolumeProvider>
      <AppLogic />
    </VolumeProvider>
  );
}

export default App;
