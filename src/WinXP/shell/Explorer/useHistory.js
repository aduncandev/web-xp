import { useCallback, useState } from 'react';
import { playSystemSound } from '../../sounds';
import { MY_COMPUTER, resolveLocation } from '../location';

/**
 * Where the window has been. Every move goes through the resolver, since a
 * window can sit on a namespace (Control Panel, the Recycle Bin, a zip) that
 * is not a node. `onMove` runs on each successful move, in the same tick,
 * so the caller can drop its selection in the same render.
 */
export function useHistory(vfs, initialPath, onMove) {
  const [history, setHistory] = useState(() => {
    const start = initialPath ? resolveLocation(vfs, initialPath) : null;
    return [start && start.exists ? start.path : MY_COMPUTER];
  });
  const [index, setIndex] = useState(0);

  const navigateTo = useCallback(
    path => {
      const where = resolveLocation(vfs, path);
      if (!where.exists) return false;
      playSystemSound('navigate');
      const next = [...history.slice(0, index + 1), where.path];
      setHistory(next);
      setIndex(next.length - 1);
      onMove();
      return true;
    },
    [vfs, history, index, onMove],
  );

  const goBack = useCallback(() => {
    if (index <= 0) return false;
    playSystemSound('navigate');
    setIndex(index - 1);
    onMove();
    return true;
  }, [index, onMove]);

  const goForward = useCallback(() => {
    if (index >= history.length - 1) return false;
    playSystemSound('navigate');
    setIndex(index + 1);
    onMove();
    return true;
  }, [index, history.length, onMove]);

  /** Jump to an entry from the Back/Forward chevron menus. */
  const jumpTo = useCallback(
    i => {
      if (Number.isNaN(i) || i < 0 || i >= history.length) return false;
      setIndex(i);
      onMove();
      return true;
    },
    [history.length, onMove],
  );

  /** Swap the current entry, for a folder that vanished under the window. */
  const replaceCurrent = useCallback(
    target => setHistory(h => [...h.slice(0, index), target]),
    [index],
  );

  return {
    history,
    index,
    current: history[index],
    canBack: index > 0,
    canForward: index < history.length - 1,
    navigateTo,
    goBack,
    goForward,
    jumpTo,
    replaceCurrent,
  };
}
