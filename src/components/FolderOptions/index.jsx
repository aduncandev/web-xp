import React, { useMemo, useState } from 'react';
import styled from 'styled-components';

import XPDialogFrame from '../XPDialogFrame';
import { dialogAt, dialogClient } from '../XPDialogFrame/layout';
import XPButton from '../XPButton';
import OpenWithDialog from '../OpenWithDialog';
import { useVFS } from '../../context/VFSContext';
import { useDialog } from '../../context/DialogContext';
import { FILE_ASSOCIATIONS } from '../../context/vfsConstants';
import { getProgramByPath } from '../../WinXP/apps';
import { EXT_TYPE_LABELS } from '../../WinXP/shell/fileTypes';

import folderIcon from 'assets/windowsIcons/318(16x16).png';
import documentIcon from 'assets/windowsIcons/308(16x16).png';
// the General tab's pictures and the Offline Files icon, from the XP sheet
import tasksPicture from 'assets/xp/folderoptions/tasks.png';
import browsePicture from 'assets/xp/folderoptions/browse.png';
import clickPicture from 'assets/xp/folderoptions/click.png';
import offlineIcon from 'assets/xp/folderoptions/offline.png';

const WIDTH = 386;
const HEIGHT = 475;

/**
 * XP Folder Options (Tools > Folder Options... / Control Panel applet).
 * The functional settings are the classic hidden-file and extension
 * controls, persisted per user in the profile hive as 'explorerView':
 *   { showHidden: bool, hideProtectedOS: bool, hideExt: bool }
 * Everything else on the View tab is faithful-but-inert.
 */
export default function FolderOptions({ onClose }) {
  const vfs = useVFS();
  const dlg = useDialog();
  const stored = (() => {
    try {
      return vfs.getUserConfig('explorerView', null) || {};
    } catch {
      return {};
    }
  })();

  const [tab, setTab] = useState('general');
  const [showHidden, setShowHidden] = useState(!!stored.showHidden);
  const [hideProtectedOS, setHideProtectedOS] = useState(
    stored.hideProtectedOS !== false,
  );
  const [hideExt, setHideExt] = useState(stored.hideExt !== false);
  // Off by default: lets move/rename/delete touch WINDOWS, Program Files
  // and the profiles' Desktop / My Documents — for people who want to
  // break their install on purpose.
  const [allowSystemChanges, setAllowSystemChanges] = useState(
    !!stored.allowSystemChanges,
  );
  const [dirty, setDirty] = useState(false);
  // File Types tab: per-user "always use this program" overrides, the same
  // map the Open With dialog writes.
  const [assocOverrides, setAssocOverrides] = useState(() => {
    try {
      return vfs.getUserConfig('fileAssocOverrides', null) || {};
    } catch {
      return {};
    }
  });
  const [selectedExt, setSelectedExt] = useState(null);
  const [changingExt, setChangingExt] = useState(null);
  // General tab look-alike state (visual only)
  const [tasksStyle, setTasksStyle] = useState('common');
  const [browseStyle, setBrowseStyle] = useState('same');
  const [clickStyle, setClickStyle] = useState('double');
  const restoreGeneral = () => {
    setTasksStyle('common');
    setBrowseStyle('same');
    setClickStyle('double');
  };
  const [inert, setInert] = useState({
    netFolders: false,
    sizeTips: true,
    sysContents: false,
    fullPath: false,
    rememberView: true,
    restoreLogon: false,
  });

  const apply = () => {
    try {
      vfs.setUserConfig('explorerView', {
        showHidden,
        hideProtectedOS,
        hideExt,
        allowSystemChanges,
      });
    } catch {
      // hive unavailable — session only
    }
    setDirty(false);
  };

  const onProtectedToggle = async () => {
    if (!hideProtectedOS) {
      setHideProtectedOS(true);
      setDirty(true);
      return;
    }
    const yes = await dlg.confirm(
      'You have chosen to display protected operating system files (files labeled System and Hidden) in Windows Explorer.\n\nThese files are required to start and run Windows. Deleting or editing them can make your computer inoperable.\n\nAre you sure you want to display these files?',
      'Warning',
    );
    if (yes) {
      setHideProtectedOS(false);
      setDirty(true);
    }
  };

  const restoreDefaults = () => {
    setShowHidden(false);
    setHideProtectedOS(true);
    setHideExt(true);
    setDirty(true);
  };

  // Every registered extension, plus any the user has pointed somewhere else
  const fileTypes = useMemo(() => {
    const exts = new Set([
      ...Object.keys(FILE_ASSOCIATIONS),
      ...Object.keys(assocOverrides),
    ]);
    return [...exts].sort().map(ext => {
      const assoc = FILE_ASSOCIATIONS[ext] || null;
      const overrideExe = assocOverrides[ext] || null;
      const overrideProgram = overrideExe
        ? getProgramByPath(overrideExe)
        : null;
      return {
        ext,
        // The same label Explorer's Type column shows
        typeName: EXT_TYPE_LABELS[ext] || `${ext.slice(1).toUpperCase()} File`,
        icon: (assoc && assoc.icon) || documentIcon,
        opensWith: overrideProgram
          ? overrideProgram.displayName
          : (assoc && assoc.appName) || null,
        // Whether this row is pointed somewhere other than the shell default
        custom: !!overrideProgram,
      };
    });
  }, [assocOverrides]);

  const selectedType = fileTypes.find(t => t.ext === selectedExt) || null;

  const setAssociation = (ext, exePath) => {
    const next = { ...assocOverrides, [ext]: exePath };
    setAssocOverrides(next);
    try {
      vfs.setUserConfig('fileAssocOverrides', next);
    } catch {
      // hive unavailable — session only
    }
  };

  const restoreAssociation = ext => {
    const next = { ...assocOverrides };
    delete next[ext];
    setAssocOverrides(next);
    try {
      vfs.setUserConfig('fileAssocOverrides', next);
    } catch {
      // hive unavailable — session only
    }
  };

  // the View tab's tree rows sit in flow layout
  const radioRow = (checked, onChange, label, name) => (
    <label className="fo__row">
      <input type="radio" name={name} checked={checked} onChange={onChange} />
      <span>{label}</span>
    </label>
  );
  // the General tab is laid out at the sheet's own pixel positions
  const radio = (x, y, checked, onChange, label, name, disabled = false) => (
    <label
      className={`fo__check${disabled ? ' fo__check--disabled' : ''}`}
      style={dialogAt(x, y)}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
      <span>{label}</span>
    </label>
  );
  const inertCheck = (key, label) => (
    <label className="fo__row">
      <input
        type="checkbox"
        checked={inert[key]}
        onChange={() => setInert(s => ({ ...s, [key]: !s[key] }))}
      />
      <span>{label}</span>
    </label>
  );

  return (
    <XPDialogFrame
      title="Folder Options"
      width={WIDTH}
      onClose={onClose}
      zIndex={99975}
    >
      <Body style={dialogClient(WIDTH, HEIGHT)}>
        <div className="fo__tabs" style={dialogAt(11, 36)}>
          {[
            { key: 'general', label: 'General' },
            { key: 'view', label: 'View' },
            { key: 'filetypes', label: 'File Types' },
            { key: 'offline', label: 'Offline Files' },
          ].map(t => (
            <div
              key={t.key}
              className={`fo__tab${tab === t.key ? ' fo__tab--active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </div>
          ))}
        </div>
        <div className="fo__page" style={dialogAt(9, 56, 368, 380)}>
          {tab === 'view' ? (
            <>
              <div className="fo__adv-label">Advanced settings:</div>
              <div className="fo__adv">
                <div className="fo__tree-head">
                  <img src={folderIcon} alt="" />
                  Files and Folders
                </div>
                <div className="fo__indent">
                  {inertCheck(
                    'netFolders',
                    'Automatically search for network folders and printers',
                  )}
                  {inertCheck(
                    'sizeTips',
                    'Display file size information in folder tips',
                  )}
                  {inertCheck(
                    'sysContents',
                    'Display the contents of system folders',
                  )}
                  {inertCheck(
                    'fullPath',
                    'Display the full path in the title bar',
                  )}
                  <div className="fo__tree-head fo__tree-head--sub">
                    <img src={folderIcon} alt="" />
                    Hidden files and folders
                  </div>
                  <div className="fo__indent">
                    {radioRow(
                      !showHidden,
                      () => {
                        setShowHidden(false);
                        setDirty(true);
                      },
                      'Do not show hidden files and folders',
                      'fo-hidden',
                    )}
                    {radioRow(
                      showHidden,
                      () => {
                        setShowHidden(true);
                        setDirty(true);
                      },
                      'Show hidden files and folders',
                      'fo-hidden',
                    )}
                  </div>
                  <label className="fo__row">
                    <input
                      type="checkbox"
                      checked={hideExt}
                      onChange={() => {
                        setHideExt(v => !v);
                        setDirty(true);
                      }}
                    />
                    <span>Hide extensions for known file types</span>
                  </label>
                  <label className="fo__row">
                    <input
                      type="checkbox"
                      checked={hideProtectedOS}
                      onChange={onProtectedToggle}
                    />
                    <span>
                      Hide protected operating system files (Recommended)
                    </span>
                  </label>
                  <label className="fo__row">
                    <input
                      type="checkbox"
                      checked={allowSystemChanges}
                      onChange={() => {
                        setAllowSystemChanges(v => !v);
                        setDirty(true);
                      }}
                    />
                    <span>
                      Allow moving or deleting protected operating system
                      folders (Not recommended)
                    </span>
                  </label>
                  {inertCheck(
                    'rememberView',
                    "Remember each folder's view settings",
                  )}
                  {inertCheck(
                    'restoreLogon',
                    'Restore previous folder windows at logon',
                  )}
                </div>
              </div>
              <div className="fo__restore">
                <XPButton onClick={restoreDefaults}>Restore Defaults</XPButton>
              </div>
            </>
          ) : tab === 'filetypes' ? (
            <>
              <div className="fo__adv-label">Registered file types:</div>
              <div className="fo__types">
                <div className="fo__types-head">
                  <span className="fo__types-col fo__types-col--ext">
                    Extensions
                  </span>
                  <span className="fo__types-col">File Types</span>
                </div>
                <div className="fo__types-list">
                  {fileTypes.map(t => (
                    <div
                      key={t.ext}
                      className={`fo__types-row${
                        selectedExt === t.ext ? ' selected' : ''
                      }`}
                      onClick={() => setSelectedExt(t.ext)}
                      onDoubleClick={() => setChangingExt(t.ext)}
                    >
                      <span className="fo__types-col fo__types-col--ext">
                        <img src={t.icon} alt="" />
                        {t.ext.slice(1).toUpperCase()}
                      </span>
                      <span className="fo__types-col">{t.typeName}</span>
                    </div>
                  ))}
                </div>
              </div>
              <fieldset className="fo__group fo__details">
                <legend>
                  {selectedType
                    ? `Details for '${selectedType.ext
                        .slice(1)
                        .toUpperCase()}' extension`
                    : 'Details'}
                </legend>
                <div className="fo__details-row">
                  <span className="fo__details-label">Opens with:</span>
                  <span className="fo__details-value">
                    {selectedType ? (
                      <>
                        {selectedType.opensWith || 'Unknown application'}
                        {selectedType.custom && ' (you chose this)'}
                      </>
                    ) : (
                      ''
                    )}
                  </span>
                  <XPButton
                    disabled={!selectedType}
                    onClick={() => setChangingExt(selectedExt)}
                  >
                    Change...
                  </XPButton>
                </div>
                <div className="fo__details-note">
                  {selectedType
                    ? `Files of type '${selectedType.typeName}' open with the program shown above. Click Change to pick a different one.`
                    : 'Select a file type above to see which program opens it.'}
                </div>
                <div className="fo__restore">
                  <XPButton
                    disabled={!selectedType || !selectedType.custom}
                    onClick={() => restoreAssociation(selectedExt)}
                  >
                    Restore
                  </XPButton>
                </div>
              </fieldset>
            </>
          ) : null}
        </div>
        {tab === 'general' && (
          <>
            <fieldset className="xp-group" style={dialogAt(24, 69, 339, 60)}>
              <legend>Tasks</legend>
            </fieldset>
            <img
              className="fo__picture"
              style={dialogAt(34, 89, 32, 28)}
              src={tasksPicture}
              alt=""
              draggable={false}
            />
            {radio(
              75,
              88,
              tasksStyle === 'common',
              () => setTasksStyle('common'),
              'Show common tasks in folders',
              'fo-tasks',
            )}
            {radio(
              75,
              106,
              tasksStyle === 'classic',
              () => setTasksStyle('classic'),
              'Use Windows classic folders',
              'fo-tasks',
            )}
            <fieldset className="xp-group" style={dialogAt(24, 141, 339, 62)}>
              <legend>Browse folders</legend>
            </fieldset>
            <img
              className="fo__picture"
              style={dialogAt(34, 162, 32, 28)}
              src={browsePicture}
              alt=""
              draggable={false}
            />
            {radio(
              75,
              161,
              browseStyle === 'same',
              () => setBrowseStyle('same'),
              'Open each folder in the same window',
              'fo-browse',
            )}
            {radio(
              75,
              179,
              browseStyle === 'own',
              () => setBrowseStyle('own'),
              'Open each folder in its own window',
              'fo-browse',
            )}
            <fieldset className="xp-group" style={dialogAt(24, 214, 339, 98)}>
              <legend>Click items as follows</legend>
            </fieldset>
            <img
              className="fo__picture"
              style={dialogAt(37, 234, 25, 30)}
              src={clickPicture}
              alt=""
              draggable={false}
            />
            {radio(
              75,
              235,
              clickStyle === 'single',
              () => setClickStyle('single'),
              'Single-click to open an item (point to select)',
              'fo-click',
            )}
            {radio(
              93,
              253,
              false,
              () => {},
              'Underline icon titles consistent with my browser',
              'fo-underline',
              true,
            )}
            {radio(
              93,
              271,
              false,
              () => {},
              'Underline icon titles only when I point at them',
              'fo-underline',
              true,
            )}
            {radio(
              75,
              289,
              clickStyle === 'double',
              () => setClickStyle('double'),
              'Double-click to open an item (single-click to select)',
              'fo-click',
            )}
            <div className="fo__abs" style={dialogAt(255, 325, 108, 23)}>
              <XPButton onClick={restoreGeneral}>Restore Defaults</XPButton>
            </div>
          </>
        )}
        {tab === 'offline' && (
          <>
            <img
              className="fo__picture"
              style={dialogAt(24, 71, 31, 27)}
              src={offlineIcon}
              alt=""
              draggable={false}
            />
            <div className="fo__text" style={dialogAt(67, 69, 300)}>
              Use Offline Files to work with files and programs stored on the
              network even when you are not connected.
            </div>
            <div className="fo__text" style={dialogAt(63, 128, 300)}>
              Fast User Switching is enabled on this computer. Offline Files
              cannot be enabled while Fast User Switching is enabled.
            </div>
            <div className="fo__text" style={dialogAt(63, 167, 300)}>
              To change your Fast User Switching setting, open User Accounts in
              Control Panel and select &quot;Change the way users log on or
              off.&quot;
            </div>
          </>
        )}
        <div className="fo__abs" style={dialogAt(140, 442, 75, 23)}>
          <XPButton
            onClick={() => {
              apply();
              onClose();
            }}
          >
            OK
          </XPButton>
        </div>
        <div className="fo__abs" style={dialogAt(221, 442, 75, 23)}>
          <XPButton onClick={onClose}>Cancel</XPButton>
        </div>
        <div className="fo__abs" style={dialogAt(302, 442, 75, 23)}>
          <XPButton disabled={!dirty} onClick={apply}>
            Apply
          </XPButton>
        </div>
      </Body>
      {changingExt && (
        <OpenWithDialog
          mode="choose"
          title="Open With"
          headerText={`Choose the program you want to use to open files of this type:\n${changingExt.toUpperCase()}`}
          onLaunch={exePath => {
            setAssociation(changingExt, exePath);
            setChangingExt(null);
          }}
          onClose={() => setChangingExt(null)}
        />
      )}
    </XPDialogFrame>
  );
}

const Body = styled.div`
  position: relative;
  box-sizing: border-box;
  font-size: 11px;
  font-family: Tahoma, 'Noto Sans', sans-serif;
  color: #000;

  .fo__tabs {
    position: absolute;
    display: flex;
    align-items: flex-end;
  }
  .fo__tab {
    cursor: default;
  }
  .fo__page {
    position: absolute;
    box-sizing: border-box;
    padding: 12px 10px;
  }
  .fo__abs {
    position: absolute;
    box-sizing: border-box;
    z-index: 1;
  }
  .fo__abs > .xp-button {
    width: 100%;
    height: 100%;
    min-width: 0;
    padding: 0 2px;
  }
  .xp-group {
    position: absolute;
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    min-width: 0;
    z-index: 1;
    pointer-events: none;
  }
  .xp-group > legend {
    box-sizing: border-box;
    height: 13px;
    margin-left: 8px;
    padding: 0 2px;
    line-height: 13px;
    color: var(--xp-group-box-text, #0046d5);
  }
  .fo__picture {
    position: absolute;
    display: block;
    image-rendering: pixelated;
    z-index: 1;
  }
  .fo__check {
    position: absolute;
    display: flex;
    align-items: flex-start;
    gap: 3px;
    height: 13px;
    line-height: 13px;
    white-space: nowrap;
    cursor: default;
    z-index: 1;
    input {
      margin: 0;
      flex-shrink: 0;
    }
  }
  .fo__check--disabled span {
    color: var(--xp-gray-text, #aca899);
  }
  .fo__text {
    position: absolute;
    line-height: 13px;
    z-index: 1;
  }
  .fo__row {
    display: flex;
    align-items: flex-start;
    gap: 5px;
    margin: 3px 0;
    cursor: default;
    input {
      margin: 0;
      flex-shrink: 0;
    }
    span {
      line-height: 14px;
    }
  }
  .fo__adv-label {
    margin-bottom: 4px;
  }
  .fo__adv {
    border: 1px solid var(--xp-select-border, #7f9db9);
    background: #fff;
    height: 250px;
    overflow-y: auto;
    padding: 4px 6px;
  }
  .fo__tree-head {
    display: flex;
    align-items: center;
    gap: 5px;
    margin: 2px 0;
    img {
      width: 16px;
      height: 16px;
    }
  }
  .fo__tree-head--sub {
    margin-top: 4px;
  }
  .fo__indent {
    margin-left: 20px;
  }
  .fo__restore {
    display: flex;
    justify-content: flex-end;
    margin-top: 8px;
  }

  /* ---- File Types tab ---- */
  .fo__types {
    border: 1px solid var(--xp-select-border, #7f9db9);
    background: #fff;
    height: 150px;
    display: flex;
    flex-direction: column;
  }
  .fo__types-head {
    display: flex;
    background: #fcfcfe;
    border-bottom: 1px solid #d8d2bd;
    flex-shrink: 0;
  }
  .fo__types-head .fo__types-col {
    padding: 2px 5px;
    border-right: 1px solid #d8d2bd;
  }
  .fo__types-list {
    flex: 1;
    overflow-y: auto;
  }
  .fo__types-row {
    display: flex;
    align-items: center;
    height: 17px;
    cursor: default;
    &:hover {
      background-color: rgba(49, 106, 197, 0.08);
    }
    &.selected {
      background-color: var(--xp-highlight, #316ac5);
      color: #fff;
    }
  }
  .fo__types-col {
    padding: 0 5px;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .fo__types-col--ext {
    flex: 0 0 100px;
    display: flex;
    align-items: center;
    gap: 4px;
    img {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }
  }
  .fo__details {
    margin-top: 10px;
  }
  .fo__details-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 2px 0 8px;
  }
  .fo__details-label {
    flex-shrink: 0;
  }
  .fo__details-value {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .fo__details-note {
    line-height: 15px;
    color: #000;
  }
`;
