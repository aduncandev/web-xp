/*
 * One extraction flow, shared by everywhere that can start one — the desktop's
 * "Extract All..." and Explorer's Folder Tasks both want the same wizard and
 * the same password prompt, so neither owns it.
 */
import React, { useCallback, useState } from 'react';

import ExtractionWizard from './index';
import { PasswordNeeded } from './PasswordDialogs';
import { extractArchive } from '../../context/zipShell';
import { getBaseName, getParentPath } from '../../context/vfsUtils';

/**
 * Returns { extract, element }: call `extract(zipPath)` to start, and render
 * `element` somewhere in the host. `onShowFiles` is where the last page's
 * "Show extracted files" goes.
 */
export default function useExtraction(vfs, onShowFiles) {
  const [target, setTarget] = useState(null);
  const [ask, setAsk] = useState(null);

  /**
   * Show the real "Password needed" dialog and resolve with what the user
   * typed, 'skip', or null. Usable outside the wizard too — opening a single
   * protected file from inside an archive asks the same question.
   */
  const askPassword = useCallback(
    (name, wasWrong) =>
      new Promise(resolve =>
        setAsk({ fileName: getBaseName(name), retry: wasWrong, resolve }),
      ),
    [],
  );

  const onExtract = useCallback(
    (destination, password, onProgress) =>
      extractArchive(vfs, target, destination, {
        password,
        onProgress,
        onNeedPassword: askPassword,
      }).then(out => {
        if (out.cancelled) throw new Error('Application cancelled operation.');
        return out;
      }),
    [vfs, target, askPassword],
  );

  const element = (
    <>
      {target && (
        <ExtractionWizard
          archiveName={getBaseName(target)}
          defaultDestination={`${getParentPath(target)}/${getBaseName(
            target,
          ).replace(/\.zip$/i, '')}`}
          onExtract={onExtract}
          onShowFiles={onShowFiles}
          onClose={() => setTarget(null)}
        />
      )}
      {ask && (
        <PasswordNeeded
          fileName={ask.fileName}
          retry={ask.retry}
          onSubmit={value => {
            ask.resolve(value);
            setAsk(null);
          }}
          onSkip={() => {
            ask.resolve('skip');
            setAsk(null);
          }}
          onCancel={() => {
            ask.resolve(null);
            setAsk(null);
          }}
        />
      )}
    </>
  );

  return { extract: setTarget, askPassword, element };
}

