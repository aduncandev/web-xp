// The Compressed Folders verbs that need a dialog: add and remove a password.
// Shared by Explorer and the desktop.
import {
  addPasswordToArchive,
  openArchive,
  removePasswordFromArchive,
} from '../../context/zipShell';
import { BadPasswordError } from '../../context/zip';

const FOLDERS = 'Compressed (zipped) Folders';
const ERROR_TITLE = 'Compressed (zipped) Folders Error';
const genericMessage = err =>
  err.message || 'An error occurred while performing this operation.';

/** Resolves true when the archive was changed. */
export async function addArchivePassword(vfs, dlg, archivePath) {
  // Look before asking: prompting for a password and only then discovering
  // the archive is already protected is backwards.
  try {
    const { entries } = await openArchive(vfs, archivePath);
    if (entries.some(en => en.encrypted)) {
      dlg.alert(
        'This Compressed (zipped) Folder is already password protected. Remove the existing password first.',
        FOLDERS,
      );
      return false;
    }
  } catch (err) {
    dlg.alert(err.message, ERROR_TITLE);
    return false;
  }
  const password = await dlg.prompt(
    'Enter a password to protect the Compressed (zipped) Folder.',
    '',
    'Add Password',
  );
  if (!password) return false;
  try {
    await addPasswordToArchive(vfs, archivePath, password);
    return true;
  } catch (err) {
    dlg.alert(genericMessage(err), ERROR_TITLE);
    return false;
  }
}

/** Resolves true when the archive was changed. */
export async function removeArchivePassword(vfs, dlg, archivePath) {
  try {
    const { entries } = await openArchive(vfs, archivePath);
    if (!entries.some(en => en.encrypted)) {
      dlg.alert(
        'This Compressed (zipped) Folder is not password protected.',
        FOLDERS,
      );
      return false;
    }
  } catch (err) {
    dlg.alert(err.message, ERROR_TITLE);
    return false;
  }
  const password = await dlg.prompt(
    'Enter the password to remove from the Compressed (zipped) Folder.',
    '',
    'Remove Password',
  );
  if (!password) return false;
  try {
    await removePasswordFromArchive(vfs, archivePath, password);
    return true;
  } catch (err) {
    dlg.alert(
      err instanceof BadPasswordError
        ? // ZIPFLDR #10076
          'The password you have entered is invalid. Do you wish to enter a new password now?'
        : genericMessage(err),
      ERROR_TITLE,
    );
    return false;
  }
}
