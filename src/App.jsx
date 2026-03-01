import React, { useState, useEffect, useCallback } from 'react';
import WinXP from './WinXP';
import BootScreen from './components/BootScreen';
import LoginScreen from './components/LoginScreen';
import WelcomeScreen from './components/WelcomeScreen';
import ShutdownScreen from './components/ShutdownScreen';
import BSOD from './components/BSOD';
import './index.css';

import xpStartupSoundSrc from 'assets/sounds/xp_startup.wav';
import xpLogonSoundSrc from 'assets/sounds/xp_logon.wav';
import xpShutdownSoundSrc from 'assets/sounds/xp_shutdown.wav';
import xpErrorSoundSrc from 'assets/sounds/error.wav';

import { VolumeProvider, useVolume } from './context/VolumeContext';

function AppLogic() {
  const [screen, setScreen] = useState('boot');
  const [skillzSessionStatus, setSkillzSessionStatus] = useState('loggedOut');
  const [shutdownMessages, setShutdownMessages] = useState([
    'Logging out...',
    'Saving your settings...',
    'Windows is shutting down...',
  ]);
  const [crashError, setCrashError] = useState(null); // Store the error text

  const { applyVolume } = useVolume();

  const playSound = useCallback(
    soundSrc => {
      if (!soundSrc) return;
      try {
        const audio = new Audio(soundSrc);
        if (typeof applyVolume === 'function') {
          applyVolume(audio);
        }
        audio.play().catch(() => {});
      } catch (error) {
        // Failed to play sound
      }
    },
    [applyVolume],
  );

  useEffect(() => {
    const handleGlobalError = (message, source, lineno, colno, error) => {
      if (screen === 'bsod') return;

      setCrashError(message);
      setScreen('bsod');
    };

    const handlePromiseRejection = event => {
      if (screen === 'bsod') return;
      const reason =
        event.reason?.message || event.reason || 'Unknown Promise Error';
      setCrashError(reason);
      setScreen('bsod');
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handlePromiseRejection);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handlePromiseRejection);
    };
  }, [screen]);

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
    setScreen('login');
    setSkillzSessionStatus('loggedOut');
  }, []);

  const handleSwitchUser = useCallback(() => {
    setScreen('login');
    setSkillzSessionStatus('loggedInInBackground');
  }, []);

  const handleShutdown = useCallback(() => {
    setShutdownMessages([
      'Logging out...',
      'Saving your settings...',
      'Windows is shutting down...',
    ]);
    setScreen('shuttingDown');
    setSkillzSessionStatus('loggedOut');
  }, []);

  const handleRestart = useCallback(() => {
    setShutdownMessages([
      'Logging out...',
      'Saving your settings...',
      'Windows is restarting...',
    ]);
    setScreen('restarting');
    setSkillzSessionStatus('loggedOut');
  }, []);

  const handleInitiateShutdownFromLogin = useCallback(() => {
    playSound(xpShutdownSoundSrc);
    setShutdownMessages(['Windows is shutting down...']);
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
        return <ShutdownScreen messages={shutdownMessages} />;
      case 'bsod':
        return <BSOD error={crashError} />;
      default:
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

function App() {
  return (
    <VolumeProvider>
      <AppLogic />
    </VolumeProvider>
  );
}

export default App;
