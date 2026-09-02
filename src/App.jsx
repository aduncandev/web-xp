import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled from 'styled-components';
import WinXP from './WinXP';
import BootScreen from './components/BootScreen';
import LogonUI from './components/LogonUI';
import SetupWizard from './components/Setup';
import SetupPrompt from './components/SetupPrompt';
import BSOD from './components/BSOD';
import RecoveryScreen from './components/RecoveryScreen';

import { playSystemSound, registerVolumeAdapter } from './WinXP/sounds';
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
  subscribeUsers,
} from './context/users';
import {
  enterScreen,
  leaveScreen,
  stageMounted,
  STAGE_ID,
  PORTAL_ID,
} from './WinXP/screen';

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

// The machine's screens, in the order a boot passes through them
const SCREEN = {
  CD_BOOT: 'cdboot',
  BOOT: 'boot',
  SETUP: 'setup',
  LOGON: 'logon',
  DESKTOP: 'desktop',
  POWERED_OFF: 'poweredOff',
  BSOD: 'bsod',
};

function AppLogic() {
  // A machine with no accounts is a fresh install, and that starts at the
  // CD prompt — unless ?guest said to skip all of it.
  const [screen, setScreen] = useState(() =>
    listUsers().length === 0 && !guestLinkRequested() ? SCREEN.CD_BOOT : SCREEN.BOOT,
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

  // The sound module applies the master volume through this adapter. It lives
  // above every session so the startup chime has it and a logoff cannot remove it.
  useEffect(() => {
    registerVolumeAdapter(applyVolume);
    return () => registerVolumeAdapter(null);
  }, [applyVolume]);

  useEffect(() => {
    const handleGlobalError = message => {
      if (screen === SCREEN.BSOD) return;
      setCrashError(message);
      setSessions([]);
      setScreen(SCREEN.BSOD);
    };

    const handlePromiseRejection = event => {
      if (screen === SCREEN.BSOD) return;
      const reason =
        event.reason?.message || event.reason || 'Unknown Promise Error';
      setCrashError(reason);
      setSessions([]);
      setScreen(SCREEN.BSOD);
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
    setScreen(SCREEN.LOGON);
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
  // The account list, kept current by the registry rather than re-read on
  // every render
  const [users, setUsers] = useState(listUsers);
  useEffect(() => subscribeUsers(() => setUsers(listUsers())), []);

  useEffect(() => {
    if (screen !== SCREEN.BOOT) return undefined;
    // Windows Error Recovery holds the boot: the logon surface must not
    // mount, or start its own timers, behind that screen
    if (vfs.recovery) return undefined;

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
      const t = setTimeout(() => setScreen(SCREEN.SETUP), 4500);
      return () => clearTimeout(t);
    }

    if (getFastBoot()) {
      setScreen(SCREEN.LOGON);
      setLogonPhase('login');
      setStatusMessages([]);
      return undefined;
    }

    const t = setTimeout(() => enterLogon(), 4500);
    return () => clearTimeout(t);
  }, [screen, enterLogon, vfs.recovery]);

  // An account logging on before the disk was ready gets its profile tree
  // as soon as it is (idempotent for existing profiles)
  useEffect(() => {
    if (vfs.initialized && activeUser) vfs.createUserProfile(activeUser);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vfs.initialized, activeUser]);

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
      case SCREEN.CD_BOOT:
        title = 'Windows XP';
        break;
      case SCREEN.BOOT:
        title = 'Starting Windows...';
        break;
      case SCREEN.SETUP:
        title = 'Windows XP Setup';
        break;
      case SCREEN.LOGON:
        title = logonPhase === 'welcome' ? 'Welcome' : 'Log On to Windows';
        break;
      case SCREEN.DESKTOP:
        title = activeUser ? `${activeUser}'s Computer` : 'Windows XP';
        break;
      default:
        break;
    }
    document.title = title;
  }, [screen, logonPhase, activeUser]);

  // welcome interstitial -> desktop reveal
  useEffect(() => {
    if (screen !== SCREEN.LOGON || logonPhase !== 'welcome' || !pendingUser) {
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
        playSystemSound(pendingResume ? 'logon' : 'startup');
        setExiting(true);
        revealTimer = setTimeout(() => {
          setScreen(SCREEN.DESKTOP);
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
        setScreen(SCREEN.POWERED_OFF);
        break;
      case 'boot':
        setScreen(SCREEN.BOOT);
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

  // A session that ends takes its count with it, or the Welcome screen
  // would keep reporting programs for an account that has logged off.
  const forgetProgramCount = useCallback(name => {
    setProgramCounts(prev => {
      if (!(name in prev)) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const handleLogoff = useCallback(() => {
    // Log Off destroys the active user's session (windows close)
    setSessions(s => s.filter(name => name !== activeUser));
    forgetProgramCount(activeUser);
    setActiveUser(null);
    setActiveUserState(null);
    setScreen(SCREEN.LOGON);
    setLogonPhase('status');
    setStatusMessages([
      { text: 'Logging off...', ms: 1100 },
      { text: 'Saving your settings...', ms: 1400 },
    ]);
    setStatusNext('login');
  }, [activeUser, forgetProgramCount]);

  const handleSwitchUser = useCallback(() => {
    // Switch User keeps every session alive — straight back to the user list
    setScreen(SCREEN.LOGON);
    setLogonPhase('login');
  }, []);

  const endAllSessions = useCallback(() => {
    setSessions([]);
    setProgramCounts({});
    setActiveUser(null);
    setActiveUserState(null);
  }, []);

  const handleShutdown = useCallback(() => {
    endAllSessions();
    setScreen(SCREEN.LOGON);
    setLogonPhase('status');
    setStatusMessages([
      { text: 'Saving your settings...', ms: 1400 },
      { text: 'Windows is shutting down...', ms: 2200 },
    ]);
    setStatusNext('poweredOff');
  }, [endAllSessions]);

  const handleRestart = useCallback(() => {
    endAllSessions();
    setScreen(SCREEN.LOGON);
    setLogonPhase('status');
    setStatusMessages([
      { text: 'Saving your settings...', ms: 1400 },
      { text: 'Windows is restarting...', ms: 2200 },
    ]);
    setStatusNext('boot');
  }, [endAllSessions]);

  const handleInitiateShutdownFromLogin = useCallback(() => {
    playSystemSound('shutdown');
    endAllSessions();
    setLogonPhase('status');
    setStatusMessages([{ text: 'Windows is shutting down...', ms: 2200 }]);
    setStatusNext('poweredOff');
  }, [endAllSessions]);

  const handleSetupComplete = useCallback(() => {
    enterLogon();
  }, [enterLogon]);

  const handlePowerOn = useCallback(() => {
    setScreen(SCREEN.BOOT);
  }, []);

  const renderOverlay = () => {
    switch (screen) {
      case SCREEN.BOOT:
        return <BootScreen />;
      case SCREEN.SETUP:
        return <SetupWizard onComplete={handleSetupComplete} />;
      case SCREEN.LOGON: {
        const pendingUserRecord = pendingUser
          ? users.find(u => u.name === pendingUser) || { name: pendingUser }
          : null;
        return (
          <LogonUI
            phase={logonPhase}
            users={users}
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
      case SCREEN.CD_BOOT:
        return <SetupPrompt onContinue={() => setScreen(SCREEN.BOOT)} />;
      case SCREEN.POWERED_OFF:
        return <PoweredOff onPowerOn={handlePowerOn} />;
      case SCREEN.BSOD:
        return <BSOD error={crashError} />;
      case SCREEN.DESKTOP:
      default:
        return null;
    }
  };

  // The desktop draws at the chosen resolution; the other screens at the
  // browser's own size
  useEffect(() => {
    if (screen === SCREEN.DESKTOP) enterScreen();
    else leaveScreen();
  }, [screen]);
  useEffect(() => {
    stageMounted();
  }, []);

  // The desktop is visible under the logon surface while it fades away.
  const desktopVisible =
    screen === SCREEN.DESKTOP || (screen === SCREEN.LOGON && exiting);

  return (
    <div>
      <Black />
      {/* The screen: the desktop at its resolution, scaled to fit and
          centred; portals mount inside so their fixed positions are stage
          positions */}
      <div
        id={STAGE_ID}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          transformOrigin: '0 0',
          overflow: 'hidden',
        }}
      >
        {screen !== SCREEN.BSOD &&
          sessions.map(name => (
            <div
              key={name}
              style={{
                display: desktopVisible && activeUser === name ? 'block' : 'none',
                position: 'absolute',
                inset: 0,
              }}
            >
              <WinXP
                userName={name}
                active={activeUser === name}
                onLogoff={handleLogoff}
                onSwitchUser={handleSwitchUser}
                onShutdown={handleShutdown}
                onRestart={handleRestart}
                onOpenAppsChange={handleOpenAppsChange}
              />
            </div>
          ))}
        <div id={PORTAL_ID} />
      </div>
      {renderOverlay()}
      {vfs.recovery && <RecoveryScreen recovery={vfs.recovery} />}
    </div>
  );
}

function App() {
  return (
    <VFSProvider>
      {/* inside the filesystem: each account's levels live in its hive */}
      <VolumeProvider>
        <DialogProvider>
          <AppLogic />
        </DialogProvider>
      </VolumeProvider>
    </VFSProvider>
  );
}

export default App;
