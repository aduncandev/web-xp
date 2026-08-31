import { createContext, useContext } from 'react';

// Whether THIS WinXP session is the one on screen. Fast user switching keeps
// other users' sessions mounted in the background; they read `false` here so
// their audio can go quiet, the active session owning the speakers (as the
// XP console session does). Apps that make their own noise outside a plain
// <audio> element (e.g. Web Audio) read this to fall silent when not active.
export const SessionActiveContext = createContext(true);

export const useSessionActive = () => useContext(SessionActiveContext);
