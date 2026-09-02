import { useCallback, useState } from 'react';
import { EXE_PATHS } from '../context/vfsConstants';
import { getExtension } from '../context/vfsUtils';
import { getProgramByPath } from './apps';

/**
 * The Open With picker: which file it is up for, and what happens when a
 * program is chosen. "Always use the selected program" is remembered per
 * extension in the user's hive; picking Compressed Folders hands a zip back
 * to the shell's own handling.
 */
export function useOpenWith({ vfs, userName, launchProgram, shellOpenRef }) {
  // { path, unknown } while the picker is up
  const [openWith, setOpenWith] = useState(null);

  const rememberAssociation = useCallback(
    (filePath, exePath) => {
      const ext = getExtension(filePath);
      if (!ext) return;
      try {
        const ov =
          vfs.getUserConfigFor(userName, 'fileAssocOverrides', null) || {};
        vfs.setUserConfigFor(userName, 'fileAssocOverrides', {
          ...ov,
          [ext]: exePath,
        });
      } catch {
        // hive unavailable, open once anyway
      }
    },
    [vfs, userName],
  );

  const onLaunch = (exePath, always) => {
    const target = openWith.path;
    if (always) rememberAssociation(target, exePath);
    setOpenWith(null);
    if (exePath.toLowerCase() === EXE_PATHS.ZIPFLDR.toLowerCase()) {
      shellOpenRef.current(target);
      return;
    }
    const program = getProgramByPath(exePath);
    if (program) {
      launchProgram(program, { filePath: target });
      vfs.addRecentDocument(target);
    }
  };

  return { openWith, setOpenWith, onLaunch };
}
