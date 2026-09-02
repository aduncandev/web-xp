import { useCallback, useRef } from 'react';
import { POWER_ACTION } from './constants';
import { CANCEL_POWER_OFF } from './constants/actions';
import { playSystemSound } from './sounds';

/**
 * The power verbs from anywhere: the Turn Off dialog, cmd's shutdown,
 * Control Panel. Each plays its sound and hands over to App, which owns the
 * screen change. Only Switch User gets the short logoff chime; every full
 * exit plays "Exit Windows".
 */
export function usePowerFlow({
  dispatch,
  dlg,
  openWindowCount,
  onLogoff,
  onShutdown,
  onRestart,
  onSwitchUser,
}) {
  // Refs so the shellBus power handler (registered once) always calls the
  // current App callbacks
  const callbacks = useRef({ onLogoff, onShutdown, onRestart, onSwitchUser });
  callbacks.current = { onLogoff, onShutdown, onRestart, onSwitchUser };

  const runPowerAction = useCallback(action => {
    const p = callbacks.current;
    switch (action) {
      case POWER_ACTION.LOG_OFF:
        playSystemSound('shutdown');
        if (p.onLogoff) p.onLogoff();
        break;
      case POWER_ACTION.SWITCH_USER:
        playSystemSound('logoff');
        if (p.onSwitchUser) p.onSwitchUser();
        break;
      case POWER_ACTION.RESTART:
        playSystemSound('shutdown');
        if (p.onRestart) p.onRestart();
        break;
      case POWER_ACTION.TURN_OFF:
        playSystemSound('shutdown');
        if (p.onShutdown) p.onShutdown();
        break;
      default:
        break;
    }
  }, []);

  /** A button in the Turn Off / Log Off dialog. */
  const onDialogButton = async action => {
    if (action === POWER_ACTION.LOG_OFF && openWindowCount > 0) {
      // Programs still open will be closed and unsaved work lost, warn
      const ok = await dlg.confirm(
        'Some programs are still running. If you log off, Windows will ' +
          'close them and you may lose any unsaved work.\n\n' +
          'Are you sure you want to log off?',
        'Log Off Windows',
        { icon: 'warning' },
      );
      if (!ok) return;
    }
    runPowerAction(action);
    // Turning off or restarting unmounts the desktop; App owns that screen
    // change. Logging off or switching user leaves this component mounted
    // (switching keeps the session alive), so the dialog closes itself.
    if (action === POWER_ACTION.LOG_OFF || action === POWER_ACTION.SWITCH_USER)
      dispatch({ type: CANCEL_POWER_OFF });
  };

  const onDialogClose = () => dispatch({ type: CANCEL_POWER_OFF });

  return { runPowerAction, onDialogButton, onDialogClose };
}
