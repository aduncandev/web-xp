import React, { useMemo, useState } from 'react';
import styled from 'styled-components';

import XPDialogFrame from '../XPDialogFrame';
import XPButton from '../XPButton';
import { PROGRAMS } from '../../WinXP/apps';
import { useVFS } from '../../context/VFSContext';
import zipHandlerIcon from 'assets/windowsIcons/zipfldr(16x16).png';
import { EXE_PATHS } from '../../context/vfsConstants';
import { getBaseName } from '../../context/vfsUtils';

/**
 * The XP "Open With" program picker.
 * Props:
 *  - path: the file being opened
 *  - unknown: true when reached via "Windows cannot open this file" (the
 *    header explains the situation like the real dialog does)
 *  - onLaunch(exePath, always): open the file with the chosen program
 *  - onClose
 */
export default function OpenWithDialog({
  path,
  unknown,
  onLaunch,
  onClose,
  // mode 'choose': a bare program picker (no file, no association
  // checkbox) — used by the Quick Launch "Choose Program..." flow.
  mode = 'open',
  title,
  headerText,
  extraPrograms,
  // Drops the Compressed (zipped) Folders pseudo-entry: it hands FILES back
  // to the shell and is not a launchable program — anything that launches
  // with no file (Quick Launch) must not be able to store it.
  programsOnly,
}) {
  const [selected, setSelected] = useState(null);
  const [always, setAlways] = useState(false);
  const choose = mode === 'choose';
  const vfs = useVFS();

  const programs = useMemo(
    () => [
      ...(extraPrograms || []),
      // Not a program: the shell's own ZIP handler, listed so an overridden
      // .zip association can be pointed back at Compressed (zipped) Folders.
      ...(programsOnly
        ? []
        : [
            {
              exePath: EXE_PATHS.ZIPFLDR,
              name: 'Compressed (zipped) Folders',
              icon: zipHandlerIcon,
            },
          ]),
      ...Object.values(PROGRAMS)
        .filter(
          p =>
            !p.unlisted &&
            // uninstalled shop titles have no exe on disk
            vfs.exists(p.exePath) &&
            p.exePath !== EXE_PATHS.EXPLORER &&
            // Explorer namespaces (Control Panel) cannot open files
            !p.namespace,
        )
        .map(p => ({
          exePath: p.exePath,
          name: p.displayName,
          icon: (p.header && p.header.icon) || null,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [extraPrograms, programsOnly, vfs.version, vfs.initialized],
  );

  const launch = () => {
    if (!selected) return;
    onLaunch(selected, always);
  };

  return (
    <XPDialogFrame
      title={title || (choose ? 'Choose Program' : 'Open With')}
      width={330}
      onClose={onClose}
      onKeyDown={e => {
        if (e.key === 'Escape') onClose();
        if (e.key === 'Enter' && selected) launch();
      }}
    >
      <Body>
        {choose ? (
          <div className="ow__head">
            {headerText || 'Choose the program you want to use:'}
          </div>
        ) : unknown ? (
          <div className="ow__head">
            Windows cannot open this file:
            <div className="ow__file">File: {getBaseName(path)}</div>
            To open this file, Windows needs to know what program created it.
            Choose the program you want to use:
          </div>
        ) : (
          <div className="ow__head">
            Choose the program you want to use to open this file:
            <div className="ow__file">File: {getBaseName(path)}</div>
          </div>
        )}
        <div className="ow__list">
          {programs.map(p => (
            <div
              key={p.exePath}
              className={`ow__item${
                selected === p.exePath ? ' ow__item--sel' : ''
              }`}
              onClick={() => setSelected(p.exePath)}
              onDoubleClick={() => onLaunch(p.exePath, always)}
            >
              {p.icon && <img src={p.icon} alt="" width={16} height={16} />}
              <span>{p.name}</span>
            </div>
          ))}
        </div>
        {!choose && (
          <label className="ow__always">
            <input
              type="checkbox"
              checked={always}
              onChange={e => setAlways(e.target.checked)}
            />
            <span>
              Always use the selected program to open this kind of file
            </span>
          </label>
        )}
        <div className="ow__buttons">
          <XPButton disabled={!selected} onClick={launch}>
            OK
          </XPButton>
          <XPButton onClick={onClose}>Cancel</XPButton>
        </div>
      </Body>
    </XPDialogFrame>
  );
}

const Body = styled.div`
  padding: 10px 12px 12px;
  font-family: Tahoma, 'Noto Sans', sans-serif;
  font-size: 11px;
  background: #ece9d8;
  user-select: none;

  .ow__head {
    line-height: 14px;
    margin-bottom: 8px;
  }
  .ow__file {
    font-weight: 700;
    margin: 6px 0;
  }
  .ow__list {
    height: 150px;
    overflow-y: auto;
    background: #fff;
    border: 1px solid #7f9db9;
    margin-bottom: 8px;
  }
  .ow__item {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 2px 4px;
    cursor: default;

    img {
      flex-shrink: 0;
    }
  }
  .ow__item--sel {
    background: #316ac5;
    color: #fff;
  }
  .ow__always {
    display: flex;
    align-items: flex-start;
    gap: 5px;
    margin-bottom: 10px;

    input {
      margin: 1px 0 0;
      flex-shrink: 0;
    }
  }
  .ow__buttons {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
  }
`;
