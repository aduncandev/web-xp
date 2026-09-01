import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled from 'styled-components';
import WinXP from './WinXP';
import BootScreen from './components/BootScreen';
import LogonUI from './components/LogonUI';
import SetupWizard from './components/Setup';
import SetupPrompt from './components/SetupPrompt';
import BSOD from './components/BSOD';
import RecoveryScreen from './components/RecoveryScreen';
import './index.css';

import xpStartupSoundSrc from 'assets/sounds/xp_startup.wav';
import xpLogonSoundSrc from 'assets/sounds/xp_logon.wav';
import xpShutdownSoundSrc from 'assets/sounds/xp_shutdown.wav';

import { VolumeProvider, useVolume } from './context/VolumeContext';
import { VFSProvider, useVFS } from './context/VFSContext';
import { DialogProvider } from './context/DialogContext';
import {
  ensureGuestUser,
  getFastBoot,
  listUsers,
  setActiveUser,
  setFastBoot,
  setLoggedOnUsers,
} from './context/users';

// The machine's power/session flow, matched to real XP:
//   boot ─ black splash (BootScreen)
//   setup ─ OOBE on first run (no accounts yet)
//   logon ─ the persistent blue surface (LogonUI): "Please wait..." ->
//           user list -> "welcome" interstitial -> winlogon status screens
//   desktop ─ live WinXP sessions (fast user switching keeps them mounted)
//   poweredOff ─ black screen after Turn Off; a click or key press is the
//                power button
//   bsod ─ crash handler
//
// Timings taken from the refkit reborn captures: welcome interstitial holds
// ~3s ("Loading your personal settings...") then the surface fades out over
// the desktop; logoff shows "Logging off..." then "Saving your settings..."
// before the user list returns.

const WELCOME_HOLD_MS = 3000;
const WELCOME_HOLD_RESUME_MS = 1500;
const DESKTOP_REVEAL_MS = 500;

// Behind every overlay; a powered-off monitor between screen switches.
const Black = styled.div`
  position: fixed;
  inset: 0;
  background: #000;
`;

const PoweredOffScreen = styled(Black)`
  z-index: 9999;
  cursor: none;
`;

/*
 * "?guest" — a link that hands somebody the desktop without making them
 * name accounts in Setup first. Creates a Guest account and drops them on
 * the user list.
 */
function guestLinkRequested() {
  try {
    const { search, hash } = window.location;
    return /(^|[?&])guest\b/.test(search) || hash.toLowerCase() === '#guest';
  } catch {
    return false;
  }
}

function PoweredOff({ onPowerOn }) {
  useEffect(() => {
    const onKey = () => onPowerOn();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onPowerOn]);
  return <PoweredOffScreen onMouseDown={onPowerOn} />;
}

function AppLogic() {
  // A machine with no accounts is a fresh install, and that starts at the
  // CD prompt — unless ?guest said to skip all of it.
  const [screen, setScreen] = useState(() =>
    listUsers().length === 0 && !guestLinkRequested() ? 'cdboot' : 'boot',
  );
  // Fast user switching: every logged-in user keeps a live, mounted desktop.
  const [sessions, setSessions] = useState([]);
  const [activeUser, setActiveUserState] = useState(null);

  // logon surface state
  const [logonPhase, setLogonPhase] = useState('status');
  const [statusMessages, setStatusMessages] = useState([]);
  // what onStatusDone leads to: 'login' | 'poweredOff' | 'boot'
  const [statusNext, setStatusNext] = useState('login');
  const [pendingUser, setPendingUser] = useState(null);
  const [pendingResume, setPendingResume] = useState(false);
  const [exiting, setExiting] = useState(false);

  // Open-window counts per live session, for the Welcome screen's
  // "N programs running." tile status.
  const [programCounts, setProgramCounts] = useState({});

  const [crashError, setCrashError] = useState(null);

  const { applyVolume } = useVolume();
  const vfs = useVFS();
  const vfsRef = useRef(vfs);
  vfsRef.current = vfs;

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
  const playSoundRef = useRef(playSound);
  playSoundRef.current = playSound;

  useEffect(() => {
    const handleGlobalError = message => {
      if (screen === 'bsod') return;
      setCrashError(message);
      setSessions([]);
      setScreen('bsod');
    };

    const handlePromiseRejection = event => {
      if (screen === 'bsod') return;
      const reason =
        event.reason?.message || event.reason || 'Unknown Promise Error';
      setCrashError(reason);
      setSessions([]);
      setScreen('bsod');
    };

    /*
     * addEventListener hands the listener a single ErrorEvent, not
     * window.onerror's five arguments. Written for the latter, this used
     * to pass the event object itself through as the "message", so the
     * BSOD's stop code read [OBJECT_ERROREVENT] and the real error never
     * reached the screen the whole feature exists to show it on.
     */
    const onError = event =>
      handleGlobalError(
        event?.error?.message || event?.message || 'Unknown Error',
      );
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', handlePromiseRejection);

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', handlePromiseRejection);
    };
  }, [screen]);

  // Bring up the logon surface: "Please wait..." then the user list.
  // (Silent, like the real thing — XP's sounds belong to logon/logoff.)
  const enterLogon = useCallback(() => {
    setScreen('logon');
    setLogonPhase('status');
    setStatusMessages([{ text: 'Please wait...', ms: 1200 }]);
    setStatusNext('login');
  }, []);

  /*
   * boot -> setup (no accounts) or the logon surface.
   *
   * Fast boot drops the 4.5s POST splash and the 1.2s "Please wait...",
   * which is where nearly all of the waiting lives, and lands on the
   * user list. It stops there on purpose: clicking a tile is the user
   * gesture browsers demand before audio may play, so going further
   * would trade the startup sound for about one more second.
   */
  useEffect(() => {
    if (screen !== 'boot') return undefined;

    /*
     * ?guest creates the account and turns fast boot on, then falls
     * through. There is no separate route: from here it is an ordinary
     * fast boot, and the setting sticks, so a return visit skips the
     * splash too until it is turned off in Control Panel.
     */
    if (guestLinkRequested()) {
      ensureGuestUser();
      setFastBoot(true);
    }

    if (listUsers().length === 0) {
      const t = setTimeout(() => setScreen('setup'), 4500);
      return () => clearTimeout(t);
    }

    if (getFastBoot()) {
      setScreen('logon');
      setLogonPhase('login');
      setStatusMessages([]);
      return undefined;
    }

    const t = setTimeout(() => enterLogon(), 4500);
    return () => clearTimeout(t);
  }, [screen, enterLogon]);

  // Control Panel refuses to delete or rename an account with a live
  // session, and fast user switching means that is a list, not just
  // whoever is on screen.
  useEffect(() => {
    setLoggedOnUsers(sessions);
  }, [sessions]);

  // the tab title follows the machine: booting, setup, the logon
  // surface, whoever's desktop is up, or a dead/dark box
  useEffect(() => {
    let title = 'Windows XP';
    switch (screen) {
      case 'cdboot':
        title = 'Windows XP';
        break;
      case 'boot':
        title = 'Starting Windows...';
        break;
      case 'setup':
        title = 'Windows XP Setup';
        break;
      case 'logon':
        title = logonPhase === 'welcome' ? 'Welcome' : 'Log On to Windows';
        break;
      case 'desktop':
        title = activeUser ? `${activeUser}'s Computer` : 'Windows XP';
        break;
      default:
        break;
    }
    document.title = title;
  }, [screen, logonPhase, activeUser]);

  // welcome interstitial -> desktop reveal
  useEffect(() => {
    if (screen !== 'logon' || logonPhase !== 'welcome' || !pendingUser) {
      return undefined;
    }
    let revealTimer;
    const holdTimer = setTimeout(
      () => {
        // Ensure the profile tree exists for accounts logging in the first
        // time (idempotent for existing profiles).
        if (vfsRef.current.initialized) {
          vfsRef.current.createUserProfile(pendingUser);
        }
        setActiveUser(pendingUser);
        setActiveUserState(pendingUser);
        setSessions(s => (s.includes(pendingUser) ? s : [...s, pendingUser]));
        // The desktop mounts under the fading logon surface. A fresh logon
        // plays the famous Startup sound ("Start Windows"); resuming a
        // switched-out session plays the short Logon sound instead.
        playSoundRef.current(
          pendingResume ? xpLogonSoundSrc : xpStartupSoundSrc,
        );
        setExiting(true);
        revealTimer = setTimeout(() => {
          setScreen('desktop');
          setExiting(false);
          setPendingUser(null);
        }, DESKTOP_REVEAL_MS);
      },
      // Resuming a switched-out session and fast boot both use the shorter
      // hold — in each the point is not to be kept waiting through
      // ceremony. The guest link arrives here as a fast boot.
      pendingResume || getFastBoot()
        ? WELCOME_HOLD_RESUME_MS
        : WELCOME_HOLD_MS,
    );
    return () => {
      clearTimeout(holdTimer);
      clearTimeout(revealTimer);
    };
  }, [screen, logonPhase, pendingUser, pendingResume]);

  const handleStatusDone = useCallback(() => {
    switch (statusNext) {
      case 'login':
        setLogonPhase('login');
        break;
      case 'poweredOff':
        setScreen('poweredOff');
        break;
      case 'boot':
        setScreen('boot');
        break;
      default:
        break;
    }
  }, [statusNext]);

  const handleLogin = useCallback(
    name => {
      setPendingUser(name);
      setPendingResume(sessions.includes(name));
      setLogonPhase('welcome');
    },
    [sessions],
  );

  const handleOpenAppsChange = useCallback((name, count) => {
    setProgramCounts(prev =>
      prev[name] === count ? prev : { ...prev, [name]: count },
    );
  }, []);

  const handleLogoff = useCallback(() => {
    // Log Off destroys the active user's session (windows close)
    setSessions(s => s.filter(name => name !== activeUser));
    setActiveUser(null);
    setActiveUserState(null);
    setScreen('logon');
    setLogonPhase('status');
    setStatusMessages([
      { text: 'Logging off...', ms: 1100 },
      { text: 'Saving your settings...', ms: 1400 },
    ]);
    setStatusNext('login');
  }, [activeUser]);

  const handleSwitchUser = useCallback(() => {
    // Switch User keeps every session alive — straight back to the user list
    setScreen('logon');
    setLogonPhase('login');
  }, []);

  const endAllSessions = useCallback(() => {
    setSessions([]);
    setActiveUser(null);
    setActiveUserState(null);
  }, []);

  const handleShutdown = useCallback(() => {
    endAllSessions();
    setScreen('logon');
    setLogonPhase('status');
    setStatusMessages([
      { text: 'Saving your settings...', ms: 1400 },
      { text: 'Windows is shutting down...', ms: 2200 },
    ]);
    setStatusNext('poweredOff');
  }, [endAllSessions]);

  const handleRestart = useCallback(() => {
    endAllSessions();
    setScreen('logon');
    setLogonPhase('status');
    setStatusMessages([
      { text: 'Saving your settings...', ms: 1400 },
      { text: 'Windows is restarting...', ms: 2200 },
    ]);
    setStatusNext('boot');
  }, [endAllSessions]);

  const handleInitiateShutdownFromLogin = useCallback(() => {
    playSound(xpShutdownSoundSrc);
    endAllSessions();
    setLogonPhase('status');
    setStatusMessages([{ text: 'Windows is shutting down...', ms: 2200 }]);
    setStatusNext('poweredOff');
  }, [playSound, endAllSessions]);

  const handleSetupComplete = useCallback(() => {
    enterLogon();
  }, [enterLogon]);

  const handlePowerOn = useCallback(() => {
    setScreen('boot');
  }, []);

  const renderOverlay = () => {
    switch (screen) {
      case 'boot':
        return <BootScreen />;
      case 'setup':
        return <SetupWizard onComplete={handleSetupComplete} />;
      case 'logon': {
        const pendingUserRecord = pendingUser
          ? listUsers().find(u => u.name === pendingUser) || {
              name: pendingUser,
            }
          : null;
        return (
          <LogonUI
            phase={logonPhase}
            users={listUsers()}
            loggedOnUsers={sessions}
            programCounts={programCounts}
            onLogin={handleLogin}
            onInitiateShutdown={handleInitiateShutdownFromLogin}
            welcomeUser={pendingUserRecord}
            statusMessages={statusMessages}
            onStatusDone={handleStatusDone}
            exiting={exiting}
          />
        );
      }
      case 'cdboot':
        return <SetupPrompt onContinue={() => setScreen('boot')} />;
      case 'poweredOff':
        return <PoweredOff onPowerOn={handlePowerOn} />;
      case 'bsod':
        return <BSOD error={crashError} />;
      case 'desktop':
      default:
        return null;
    }
  };

  // The desktop is visible under the logon surface while it fades away.
  const desktopVisible =
    screen === 'desktop' || (screen === 'logon' && exiting);

  return (
    <div className="App">
      <Black />
      {screen !== 'bsod' &&
        sessions.map(name => (
          <div
            key={name}
            style={{
              display: desktopVisible && activeUser === name ? 'block' : 'none',
              position: 'relative',
            }}
          >
            <WinXP
              userName={name}
              active={activeUser === name}
              onLogoff={handleLogoff}
              onSwitchUser={handleSwitchUser}
              onShutdown={handleShutdown}
              onRestart={handleRestart}
              onOpenAppsChange={count => handleOpenAppsChange(name, count)}
            />
          </div>
        ))}
      {renderOverlay()}
      {vfs.recovery && <RecoveryScreen recovery={vfs.recovery} />}
    </div>
  );
}

function App() {
  return (
    <VolumeProvider>
      <VFSProvider>
        <DialogProvider>
          <AppLogic />
        </DialogProvider>
      </VFSProvider>
    </VolumeProvider>
  );
}

export default App;
