import React, { useMemo, useState } from 'react';
import styled from 'styled-components';

import XPDialogFrame from '../XPDialogFrame';
import XPButton from '../XPButton';
import OpenWithDialog from '../OpenWithDialog';
import { useVFS } from '../../context/VFSContext';
import { useDialog } from '../../context/DialogContext';
import { FILE_ASSOCIATIONS } from '../../context/vfsConstants';
import { getProgramByPath } from '../../WinXP/apps';
import { EXT_TYPE_LABELS } from '../../WinXP/shell/fileTypes';

import folderIcon from 'assets/windowsIcons/318(16x16).png';
import documentIcon from 'assets/windowsIcons/308(16x16).png';

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

  const radio = (checked, onChange, label, name) => (
    <label className="fo__row">
      <input type="radio" name={name} checked={checked} onChange={onChange} />
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
      width={372}
      onClose={onClose}
      zIndex={99975}
    >
      <Body>
        <div className="fo__tabs">
          {[
            { key: 'general', label: 'General' },
            { key: 'view', label: 'View' },
            { key: 'filetypes', label: 'File Types' },
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
        <div className="fo__page">
          {tab === 'general' ? (
            <>
              <fieldset className="fo__group">
                <legend>Tasks</legend>
                {radio(
                  tasksStyle === 'common',
                  () => setTasksStyle('common'),
                  'Show common tasks in folders',
                  'fo-tasks',
                )}
                {radio(
                  tasksStyle === 'classic',
                  () => setTasksStyle('classic'),
                  'Use Windows classic folders',
                  'fo-tasks',
                )}
              </fieldset>
              <fieldset className="fo__group">
                <legend>Browse folders</legend>
                {radio(
                  browseStyle === 'same',
                  () => setBrowseStyle('same'),
                  'Open each folder in the same window',
                  'fo-browse',
                )}
                {radio(
                  browseStyle === 'own',
                  () => setBrowseStyle('own'),
                  'Open each folder in its own window',
                  'fo-browse',
                )}
              </fieldset>
              <fieldset className="fo__group">
                <legend>Click items as follows</legend>
                {radio(
                  clickStyle === 'single',
                  () => setClickStyle('single'),
                  'Single-click to open an item (point to select)',
                  'fo-click',
                )}
                {radio(
                  clickStyle === 'double',
                  () => setClickStyle('double'),
                  'Double-click to open an item (single-click to select)',
                  'fo-click',
                )}
              </fieldset>
            </>
          ) : tab === 'view' ? (
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
                    {radio(
                      !showHidden,
                      () => {
                        setShowHidden(false);
                        setDirty(true);
                      },
                      'Do not show hidden files and folders',
                      'fo-hidden',
                    )}
                    {radio(
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
          ) : (
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
          )}
        </div>
        <div className="fo__buttons">
          <XPButton
            onClick={() => {
              apply();
              onClose();
            }}
          >
            OK
          </XPButton>
          <XPButton onClick={onClose}>Cancel</XPButton>
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
  padding: 8px 8px 10px;
  font-size: 11px;
  font-family: Tahoma, 'Noto Sans', sans-serif;

  .fo__tabs {
    display: flex;
    margin-left: 2px;
  }
  .fo__tab {
    padding: 3px 12px 4px;
    border: 1px solid #919b9c;
    border-bottom: none;
    border-radius: 3px 3px 0 0;
    background: linear-gradient(to bottom, #fff, #f0efe4);
    margin-right: 2px;
    cursor: default;
    position: relative;
    top: 1px;
  }
  .fo__tab--active {
    background: #fcfcfe;
    padding-top: 4px;
    top: 0;
    border-top: 2px solid #e68b2c;
    z-index: 1;
  }
  .fo__page {
    border: 1px solid #919b9c;
    background: #fcfcfe;
    padding: 12px 10px;
    min-height: 330px;
  }
  .fo__group {
    border: 1px solid #d0d0bf;
    border-radius: 3px;
    margin: 0 0 10px;
    padding: 6px 10px 8px;
    legend {
      color: #0046d5;
      padding: 0 2px;
    }
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
    border: 1px solid #7f9db9;
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
    border: 1px solid #7f9db9;
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
      background-color: #316ac5;
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
  .fo__buttons {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    margin-top: 10px;
  }
`;
