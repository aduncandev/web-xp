// Folder Options' view settings (hidden extensions, hidden files, protected
// files), read the same way by every listing.
import { useMemo } from 'react';

import { useVFS } from '../../context/VFSContext';

/** The rules for one stored 'explorerView' value (null for the defaults). */
export function explorerViewRules(view) {
  const v = view || {};
  const hideExt = v.hideExt !== false;
  const showHidden = !!v.showHidden;
  const hideProtectedOS = v.hideProtectedOS !== false;
  return {
    hideExt,
    showHidden,
    hideProtectedOS,
    allowSystemChanges: !!v.allowSystemChanges,
    /** Whether a listing shows this node at all. */
    isVisible: node =>
      !node.hidden || (showHidden && !(node.system && hideProtectedOS)),
  };
}

/** The rules for `userName`, or for whoever is logged in when omitted. */
export function readExplorerView(vfs, userName) {
  try {
    return explorerViewRules(
      userName
        ? vfs.getUserConfigFor(userName, 'explorerView', null)
        : vfs.getUserConfig('explorerView', null),
    );
  } catch {
    return explorerViewRules(null);
  }
}

export function useExplorerView(userName) {
  const vfs = useVFS();
  // The context value changes identity whenever the filesystem does, so
  // this re-reads exactly when a setting may have changed
  return useMemo(() => readExplorerView(vfs, userName), [vfs, userName]);
}
