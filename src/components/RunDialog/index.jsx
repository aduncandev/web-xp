import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';

import XPDialogFrame from '../XPDialogFrame';
import XPButton from '../XPButton';
import FileDialog from '../FileDialog';
import useEditContextMenu from '../EditContextMenu';
import { useVFS } from '../../context/VFSContext';
import { useDialog } from '../../context/DialogContext';
import { getCurrentUserName } from '../../context/users';
import { getProgramByCommand } from '../../WinXP/apps';

import runIcon from 'assets/windowsIcons/743(32x32).png';

// Run history lives per-user in the profile hive (ntuser.dat) under
// 'runHistory'.
const HISTORY_MAX = 10;

/**
 * The XP Run box. Resolves what the user typed — a registered program's
 * command name, a filesystem path, or a web URL — and hands it to the
 * shell via onRun(target). Unresolvable input shows the XP error and the
 * box stays open, like the real thing.
 */
export default function RunDialog({ onClose, onRun }) {
  const vfs = useVFS();
  const dlg = useDialog();
  // Owner captured at mount: a Run box left open across a fast-user-switch
  // keeps working against ITS user's hive.
  const userRef = useRef(getCurrentUserName());

  const loadHistory = () => {
    try {
      const list = vfs.getUserConfigFor(userRef.current, 'runHistory', null);
      if (Array.isArray(list)) return list;
    } catch {
      // hive unavailable
    }
    return [];
  };

  const saveHistory = entry => {
    try {
      const next = [
        entry,
        ...loadHistory().filter(e => e.toLowerCase() !== entry.toLowerCase()),
      ].slice(0, HISTORY_MAX);
      vfs.setUserConfigFor(userRef.current, 'runHistory', next);
    } catch {
      // hive unavailable
    }
  };

  const [value, setValue] = useState(() => loadHistory()[0] || '');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [browseOpen, setBrowseOpen] = useState(false);
  const inputRef = useRef(null);
  const history = loadHistory();
  const { openEditContextMenu, editContextMenu } = useEditContextMenu();

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const runIt = () => {
    const raw = value.trim();
    if (!raw) return;
    const unquoted = raw.replace(/^"(.*)"$/, '$1').trim();

    // Web URL → the shell opens it in Internet Explorer
    if (/^https?:\/\//i.test(unquoted)) {
      saveHistory(raw);
      onClose();
      onRun(unquoted);
      return;
    }
    // Registered command name ('notepad', 'cmd', 'winmine.exe', …)
    const cmd = getProgramByCommand(unquoted);
    if (cmd) {
      saveHistory(raw);
      onClose();
      onRun(cmd.exePath);
      return;
    }
    // Filesystem path (folder, document, or executable). Preserve the
    // root slash on bare drive letters — drive nodes are keyed 'C:/'.
    let asPath = unquoted.replace(/\\/g, '/').replace(/\/+$/, '');
    if (/^[A-Za-z]:$/.test(asPath)) asPath += '/';
    if (
      unquoted === 'My Computer' ||
      (asPath && vfs.findNodeCI && vfs.findNodeCI(asPath))
    ) {
      saveHistory(raw);
      onClose();
      onRun(unquoted === 'My Computer' ? unquoted : asPath);
      return;
    }
    dlg.alert(
      `Windows cannot find '${raw}'. Make sure you typed the name correctly, and then try again. To search for a file, click the Start button, and then click Search.`,
      raw,
      { icon: 'error' },
    );
  };

  const onKeyDown = e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      runIt();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <>
      <XPDialogFrame title="Run" width={347} onClose={onClose} zIndex={99978}>
        <Body onKeyDown={onKeyDown}>
          <div className="run__blurb">
            <img src={runIcon} alt="" className="run__icon" />
            <div className="run__text">
              Type the name of a program, folder, document, or Internet
              resource, and Windows will open it for you.
            </div>
          </div>
          <div className="run__open-row">
            <label className="run__label" htmlFor="run-input">
              Open:
            </label>
            <div className="run__combo">
              <input
                id="run-input"
                ref={inputRef}
                className="run__input"
                value={value}
                onChange={e => setValue(e.target.value)}
                onContextMenu={openEditContextMenu}
                spellCheck={false}
                autoComplete="off"
              />
              <button
                type="button"
                className="run__drop-btn"
                onClick={() => setHistoryOpen(o => !o)}
                tabIndex={-1}
              >
                ▾
              </button>
              {historyOpen && history.length > 0 && (
                <div className="run__history">
                  {history.map(h => (
                    <div
                      key={h}
                      className="run__history-item"
                      onMouseDown={() => {
                        setValue(h);
                        setHistoryOpen(false);
                      }}
                    >
                      {h}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="run__buttons">
            <XPButton onClick={runIt} autoFocus={false}>
              OK
            </XPButton>
            <XPButton onClick={onClose}>Cancel</XPButton>
            <XPButton onClick={() => setBrowseOpen(true)}>Browse...</XPButton>
          </div>
        </Body>
      </XPDialogFrame>
      {editContextMenu}
      {browseOpen && (
        <FileDialog
          mode="open"
          title="Browse"
          filters={[
            { label: 'Programs', extensions: ['.exe', '.com', '.bat'] },
            { label: 'All Files', extensions: null },
          ]}
          onSelect={path => {
            setBrowseOpen(false);
            setValue(path.replace(/\//g, '\\'));
            if (inputRef.current) inputRef.current.focus();
          }}
          onCancel={() => setBrowseOpen(false)}
        />
      )}
    </>
  );
}

const Body = styled.div`
  padding: 12px 10px 10px;
  font-size: 11px;
  font-family: Tahoma, 'Noto Sans', sans-serif;

  .run__blurb {
    display: flex;
    align-items: flex-start;
    margin-bottom: 14px;
  }
  .run__icon {
    width: 32px;
    height: 32px;
    margin-right: 10px;
    flex-shrink: 0;
  }
  .run__text {
    line-height: 14px;
    padding-top: 2px;
  }
  .run__open-row {
    display: flex;
    align-items: center;
    margin-bottom: 16px;
  }
  .run__label {
    width: 38px;
    flex-shrink: 0;
  }
  .run__combo {
    position: relative;
    flex: 1;
    display: flex;
  }
  .run__input {
    flex: 1;
    height: 21px;
    border: 1px solid var(--xp-select-border, #7f9db9);
    border-right: none;
    padding: 2px 4px;
    font-family: Tahoma, 'Noto Sans', sans-serif;
    font-size: 11px;
    outline: none;
  }
  .run__drop-btn {
    width: 17px;
    height: 21px;
    border: 1px solid var(--xp-select-border, #7f9db9);
    background: linear-gradient(to bottom, #f2f6fb 0%, #c5d6ef 100%);
    font-size: 8px;
    color: #4d6185;
    padding: 0;
    cursor: default;
  }
  .run__history {
    position: absolute;
    top: 21px;
    left: 0;
    right: 0;
    background: #fff;
    border: 1px solid var(--xp-select-border, #7f9db9);
    z-index: 5;
    max-height: 130px;
    overflow-y: auto;
  }
  .run__history-item {
    padding: 1px 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    &:hover {
      background: var(--xp-highlight, #316ac5);
      color: #fff;
    }
  }
  .run__buttons {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
  }
`;
