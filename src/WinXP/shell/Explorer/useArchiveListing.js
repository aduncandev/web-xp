import { useCallback, useEffect, useState } from 'react';
import { extractOne, openArchive } from '../../../context/zipShell';
import { BadPasswordError } from '../../../context/zip';
import { SPECIAL_FOLDERS } from '../../../context/vfsConstants';
import { getBaseName } from '../../../context/vfsUtils';

const ZIP_ERROR_TITLE = 'Compressed (zipped) Folders Error';

/**
 * The listing of the zip the window is inside, if any. Compressed Folders
 * was a shell namespace extension, so a .zip is walked with the same path
 * string as any folder. Only the listing comes from somewhere else, and its
 * entries are shaped like nodes so icons, type names and sorting need to
 * know nothing.
 */
export function useArchiveListing({
  vfs,
  dlg,
  archive,
  askPassword,
  onShellOpen,
}) {
  const [archiveData, setArchiveData] = useState(null);

  // The zip node's bytes, as a cheap token: a password added from another
  // window rewrites the file, and this window's listing follows
  const zipNode = archive ? vfs.getNode(archive.archive) : null;
  const stamp = zipNode
    ? `${zipNode.modifiedAt}|${zipNode.size}|${zipNode.blobId || ''}`
    : '';

  useEffect(() => {
    if (!archive || !vfs.initialized) {
      setArchiveData(null);
      return undefined;
    }
    if (
      archiveData &&
      archiveData.path === archive.archive &&
      archiveData.stamp === stamp
    )
      return undefined;
    let live = true;
    openArchive(vfs, archive.archive)
      .then(({ entries }) => {
        if (live) setArchiveData({ path: archive.archive, stamp, entries });
      })
      .catch(err => {
        if (!live) return;
        setArchiveData({ path: archive.archive, stamp, entries: [] });
        dlg.alert(
          err.message ||
            'The Compressed (zipped) Folder is invalid or corrupted.',
          ZIP_ERROR_TITLE,
        );
      });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [archive, stamp, vfs.initialized]);

  /** Forget the listing so the archive is read again. */
  const reload = useCallback(() => setArchiveData(null), []);

  /**
   * Extract one entry to the shell's temp folder and hand it on. A file
   * inside an archive has to come out before anything can open it, which is
   * what the shell did too, into a temporary directory named after the
   * archive.
   */
  const openEntry = async node => {
    if (!archive) return;
    const temp = `${
      SPECIAL_FOLDERS.TEMP
    }/Temporary Directory 1 for ${getBaseName(archive.archive)}`;
    const inner = node.path.slice(archive.archive.length + 1);
    let password = '';
    for (;;) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const out = await extractOne(
          vfs,
          archive.archive,
          inner,
          temp,
          password,
        );
        if (out && onShellOpen) onShellOpen(out);
        return;
      } catch (err) {
        if (err instanceof BadPasswordError) {
          // The real "Password needed" dialog, retried until it opens or the
          // user gives up; Skip File on a single file is just a cancel
          // eslint-disable-next-line no-await-in-loop
          const answer = await askPassword(node.name, !!password);
          if (answer && answer !== 'skip') {
            password = answer;
            continue;
          }
          return;
        }
        dlg.alert(
          err.message || 'An error occurred while performing this operation.',
          ZIP_ERROR_TITLE,
        );
        return;
      }
    }
  };

  return { archiveData, reload, openEntry };
}
