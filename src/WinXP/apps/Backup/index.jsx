/*
 * Backup (ntbackup.exe) — the System Tools entry, real enough to matter.
 *
 * Two jobs, matching the wizard the shortcut always promised: save the
 * files and settings on this computer into a .zip (the same archive the
 * Windows Error Recovery screen offers before a reinstall), and restore
 * such an archive back into the filesystem — including ntuser.dat, so XP
 * Points, eggs, and per-app settings come back with it.
 */
import React, { useRef, useState } from 'react';
import styled from 'styled-components';

import { useVFS } from '../../../context/VFSContext';
import { buildBackupZip, restoreBackupZip } from '../../../context/vfsBackup';

import backupBig from 'assets/windowsIcons/23(16x16).png';

/** Every node on both drives, hidden files included. */
function collectNodes(vfs) {
  const out = [];
  const walk = dir => {
    for (const child of vfs.listDir(dir)) {
      out.push(child);
      if (child.type === 'folder') walk(child.path);
    }
  };
  walk('C:/');
  walk('D:/');
  return out;
}

export default function Backup() {
  const vfs = useVFS();
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);

  const backUp = async () => {
    if (busy) return;
    setBusy(true);
    setResult(null);
    setProgress('Collecting files...');
    try {
      const { blob, count } = await buildBackupZip(
        collectNodes(vfs),
        async node => {
          const data = await vfs.readBinaryFile(node.path);
          return data ? new Uint8Array(await data.arrayBuffer()) : null;
        },
      );
      const stamp = new Date().toISOString().slice(0, 10);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `windows-backup-${stamp}.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 60000);
      setResult(
        `Backed up ${count} file${
          count === 1 ? '' : 's'
        } to your downloads folder.`,
      );
    } catch (err) {
      setResult('The backup could not be created.');
    }
    setProgress(null);
    setBusy(false);
  };

  const restore = async event => {
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!file || busy) return;
    setBusy(true);
    setResult(null);
    setProgress('Reading the archive...');
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const { restored, skipped } = await restoreBackupZip(vfs, bytes, {
        onProgress: (step, name) => setProgress(`Restoring ${step}: ${name}`),
      });
      setResult(
        `Restored ${restored} file${restored === 1 ? '' : 's'}` +
          (skipped ? ` (${skipped} skipped).` : '.') +
          ' Log off and log back on for restored settings to take effect.',
      );
    } catch (err) {
      setResult(
        'The archive could not be restored. Make sure it is a backup ' +
          'created by this tool or by Windows Error Recovery.',
      );
    }
    setProgress(null);
    setBusy(false);
  };

  return (
    <Body>
      <div className="bk__head">
        <img src={backupBig} alt="" draggable={false} />
        <div>
          <div className="bk__title">Backup or Restore Wizard</div>
          <div className="bk__sub">
            Save the files and settings on this computer, or bring a saved copy
            back.
          </div>
        </div>
      </div>
      <div className="bk__panel">
        <button className="bk__action" onClick={backUp} disabled={busy}>
          <span className="bk__action-title">Back up files and settings</span>
          <span className="bk__action-sub">
            Downloads a .zip of your documents, pictures, and settings —
            including your XP Points and eggs (ntuser.dat).
          </span>
        </button>
        <button
          className="bk__action"
          onClick={() => fileRef.current && fileRef.current.click()}
          disabled={busy}
        >
          <span className="bk__action-title">Restore files and settings</span>
          <span className="bk__action-sub">
            Puts the contents of a backup .zip back where it came from. Files
            you made since the backup are kept.
          </span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".zip,application/zip"
          style={{ display: 'none' }}
          onChange={restore}
        />
      </div>
      <div className="bk__status">{progress || result || 'Ready.'}</div>
    </Body>
  );
}

const Body = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #ece9d8;
  font-family: Tahoma, 'Noto Sans', sans-serif;
  font-size: 11px;
  color: #000;

  .bk__head {
    display: flex;
    align-items: center;
    gap: 10px;
    background: #fff;
    border-bottom: 1px solid #b5b5b5;
    padding: 12px 14px;
    img {
      width: 32px;
      height: 32px;
      image-rendering: pixelated;
    }
  }
  .bk__title {
    font-size: 13px;
    font-weight: bold;
  }
  .bk__sub {
    color: #444;
    margin-top: 2px;
  }

  .bk__panel {
    flex: 1;
    padding: 16px 18px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .bk__action {
    text-align: left;
    font: inherit;
    background: #fff;
    border: 1px solid #7f9db9;
    border-radius: 2px;
    padding: 10px 12px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 4px;
    &:hover:not(:disabled) {
      background: #f3f7fd;
    }
    &:disabled {
      color: #888;
      cursor: default;
    }
  }
  .bk__action-title {
    font-weight: bold;
    color: #003399;
    font-size: 12px;
  }
  .bk__action-sub {
    color: #444;
  }

  .bk__status {
    border-top: 1px solid #b5b5b5;
    padding: 6px 12px;
    background: #f4f2e8;
    min-height: 26px;
    display: flex;
    align-items: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;
