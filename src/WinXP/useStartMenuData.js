import { useMemo } from 'react';

import { profileFoldersFor } from '../context/vfsConstants';
import emptyIcon from 'assets/empty.png';

// The rows XP pins above the separator at the top of All Programs
const PINNED_NAMES = [
  'Set Program Access and Defaults',
  'Windows Catalog',
  'Windows Update',
];

/**
 * One session's Start menu: All Programs from the profile's Programs folder,
 * My Recent Documents from the hive. Items carry 'open:<path>' actions.
 */
export function useStartMenuData(vfs, userName) {
  const allProgramsData = useMemo(() => {
    if (!vfs.initialized) return null;
    const buildDir = (dirPath, depth) => {
      const out = [];
      for (const child of vfs.listDir(dirPath)) {
        if (child.hidden) continue;
        if (child.type === 'folder') {
          const sub = buildDir(child.path, depth + 1);
          out.push({
            type: 'menu',
            icon: child.icon,
            text: child.name,
            items: sub.length
              ? sub
              : [
                  {
                    type: 'item',
                    icon: emptyIcon,
                    text: '(Empty)',
                    disable: true,
                  },
                ],
            ...(depth >= 1 ? { bottom: 'initial' } : {}),
          });
        } else if (child.type === 'shortcut' || child.type === 'file') {
          out.push({
            type: 'item',
            icon: child.icon,
            text: child.name,
            action: `open:${child.path}`,
          });
        }
      }
      return out;
    };
    const items = buildDir(profileFoldersFor(userName).PROGRAMS, 0);
    // Pinned system entries at the top, then a separator, like real XP
    const pinned = [];
    const rest = [];
    for (const item of items) {
      if (item.type === 'item' && PINNED_NAMES.includes(item.text))
        pinned.push(item);
      else rest.push(item);
    }
    if (pinned.length > 0) {
      pinned.sort(
        (a, b) => PINNED_NAMES.indexOf(a.text) - PINNED_NAMES.indexOf(b.text),
      );
      return [...pinned, { type: 'separator' }, ...rest];
    }
    return rest;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vfs.version, vfs.initialized, userName]);

  const recentDocumentsData = useMemo(() => {
    const docs = (vfs.recentDocuments || [])
      .map(p => vfs.getNode(p))
      .filter(Boolean)
      .map(n => ({
        type: 'item',
        icon: n.icon,
        text: n.name,
        action: `open:${n.path}`,
      }));
    return docs.length > 0 ? docs : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vfs.version, vfs.recentDocuments]);

  return { allProgramsData, recentDocumentsData };
}
