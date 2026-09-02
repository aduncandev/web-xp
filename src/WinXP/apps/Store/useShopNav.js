// Where the shopper is: a stack of screens, each with the bits it needs
// (a shelf, a title, a list mode, a page number). Back pops it; the
// cancel sound is the caller's, so this hook stays free of the audio one.
import { useState } from 'react';

export function useShopNav() {
  const [stack, setStack] = useState([{ screen: 'splash' }]);
  const cur = stack[stack.length - 1];

  const go = (screen, extra) => setStack(s => [...s, { screen, ...extra }]);
  const goBack = () => setStack(s => (s.length > 1 ? s.slice(0, -1) : s));
  /** Start over at one screen, as the Start Shopping and Welcome Screen buttons do. */
  const reset = screen => setStack([{ screen }]);
  /** Swap the current screen for another without adding a Back step. */
  const replaceTop = entry => setStack(s => [...s.slice(0, -1), entry]);
  /** Land on a title page with the path the shopper would have walked. */
  const jumpToTitle = app =>
    setStack([
      { screen: 'main' },
      { screen: 'shelfhub', shelf: app.shelf },
      { screen: 'list', shelf: app.shelf, mode: 'all' },
      { screen: 'title', appId: app.id },
    ]);

  const pageNo = cur.page || 0;
  const setPage = n => setStack(s => [...s.slice(0, -1), { ...cur, page: n }]);

  return { cur, go, goBack, reset, replaceTop, jumpToTitle, pageNo, setPage };
}
