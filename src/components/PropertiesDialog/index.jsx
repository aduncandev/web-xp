import React, { useMemo, useRef, useEffect, useState } from 'react';

import XPDialogFrame from 'components/XPDialogFrame';
import XPButton from 'components/XPButton';
import XPSelect from 'components/XPSelect';
import OpenWithDialog from 'components/OpenWithDialog';
import { useVFS } from '../../context/VFSContext';
import { useExplorerView } from '../../WinXP/shell/useExplorerView';
import { useDialog } from '../../context/DialogContext';
import { getFileAssociation } from '../../context/vfsConstants';
import {
  displayPath,
  getParentPath,
  getBaseName,
  getExtension,
  formatSize,
  INVALID_NAME_MESSAGE,
} from '../../context/vfsUtils';
import { getProgramByPath } from '../../WinXP/apps';
import {
  displayName,
  getTypeLabel,
  hiddenExtension,
} from '../../WinXP/shell/fileTypes';
import { readFileMetadata } from './fileMetadata';
import {
  EDITABLE_TAGS,
  isTaggedMedia,
  tagEditsFor,
  writeTagEdits,
} from '../../context/tagOverrides';
import { versionInfoFor, isBinary } from './versionInfo';
import { sizeOnDisk, RUN_MODES, fmtLong } from './helpers';
import { Body } from './styles';
import VersionTab from './VersionTab';
import SummaryTab from './SummaryTab';
import AdvancedAttributes from './AdvancedAttributes';
import ChangeIconDialog from './ChangeIconDialog';

/**
 * XP-style "Properties" window for a VFS node: General for everything, plus
 * a working Shortcut tab for links (retarget, start-in, run mode, comment,
 * Find Target, Change Icon).
 * Props: { path, onClose, onShellOpen? }
 */
export default function PropertiesDialog({ path, onClose, onShellOpen }) {
  const vfs = useVFS();
  const dlg = useDialog();
  const node = vfs.getNode(path);
  const okBtnRef = useRef(null);

  const [tab, setTab] = useState('general');
  const [dirty, setDirty] = useState(false);
  const [changingAssoc, setChangingAssoc] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [changeIconOpen, setChangeIconOpen] = useState(false);
  // Version tab: XP opens with the first item selected
  const [versionItem, setVersionItem] = useState('Company');

  // Editable attributes (real XP lets you set these here); system items
  // and drives stay locked.
  const [attrReadOnly, setAttrReadOnly] = useState(!!(node && node.readOnly));
  const [attrHidden, setAttrHidden] = useState(!!(node && node.hidden));
  const attrsLocked = !node || node.system || node.type === 'drive';

  // 'Hide extensions for known file types' — XP default is on
  const { hideExt } = useExplorerView();

  const shownName = node ? displayName(node, hideExt) : '';
  const [nameValue, setNameValue] = useState(shownName);

  // Shortcut fields
  const isShortcut = !!node && node.type === 'shortcut';
  const [targetValue, setTargetValue] = useState((node && node.target) || '');
  const [startInValue, setStartInValue] = useState(
    (node && node.startIn) ||
      (node && node.target ? getParentPath(node.target) || '' : ''),
  );
  const [runValue, setRunValue] = useState((node && node.runMode) || 'normal');
  const [commentValue, setCommentValue] = useState(
    (node && node.comment) || '',
  );

  useEffect(() => {
    if (okBtnRef.current) okBtnRef.current.focus();
  }, []);

  // --- Summary tab ---
  // A media file's Summary page is its tags, and they can be typed over; any
  // other file gets the document fields, which live only in the profile.
  const isMediaFile =
    !!node && node.type === 'file' && isTaggedMedia(node.name);
  const [metadata, setMetadata] = useState(null);
  const [summaryAdvanced, setSummaryAdvanced] = useState(!isMediaFile);
  const [tagValues, setTagValues] = useState(() => tagEditsFor(vfs, path));
  const [summary, setSummary] = useState(() => {
    try {
      const all = vfs.getUserConfig('fileSummaries', null) || {};
      return all[path] || {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    let live = true;
    if (!node || node.type !== 'file') {
      setMetadata(null);
      return undefined;
    }
    readFileMetadata(vfs, node).then(m => {
      if (!live) return;
      setMetadata(m);
      // Files with no readable metadata open straight into Simple
      if (!m) setSummaryAdvanced(false);
      // Seed the Simple fields from the file's own tags where the user
      // hasn't typed anything of their own.
      const tags = (m && m.tags) || null;
      if (tags && isMediaFile) {
        // Show what the file says, with anything already typed over the top
        setTagValues(prev => {
          const shown = {};
          for (const f of EDITABLE_TAGS) shown[f.key] = tags[f.key] || '';
          return { ...shown, ...prev };
        });
      }
      if (tags && !isMediaFile) {
        setSummary(prev => {
          const seeded = { ...prev };
          if (!seeded.title && tags.title) seeded.title = tags.title;
          if (!seeded.author && tags.artist) seeded.author = tags.artist;
          if (!seeded.subject && tags.album) seeded.subject = tags.album;
          if (!seeded.category && tags.genre) seeded.category = tags.genre;
          if (!seeded.comments && tags.comment) seeded.comments = tags.comment;
          return seeded;
        });
      }
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, vfs.version]);

  const stats = useMemo(() => {
    if (!node || node.type === 'file' || node.type === 'shortcut') return null;
    let files = 0;
    let folders = 0;
    const walk = dir => {
      for (const child of vfs.listDir(dir)) {
        if (child.type === 'folder') {
          folders++;
          walk(child.path);
        } else if (child.type === 'file' || child.type === 'shortcut') {
          files++;
        }
      }
    };
    if (node.type === 'folder' || node.type === 'drive') walk(node.path);
    return { files, folders };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, vfs.version]);

  // Per-user "always use this program" override, same map Open With writes
  const assocOverride = useMemo(() => {
    if (!node || node.type === 'drive' || node.type === 'folder') return null;
    const ext = getExtension(
      isShortcut && node.target ? node.target : node.path,
    ).toLowerCase();
    if (!ext) return null;
    try {
      const ov = vfs.getUserConfig('fileAssocOverrides', null) || {};
      return ov[ext] ? getProgramByPath(ov[ext]) : null;
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, vfs.version, isShortcut]);

  if (!node) return null;

  const isDrive = node.type === 'drive';
  const isFile = node.type === 'file';
  const isFolder = node.type === 'folder';
  // A shortcut reports the association of whatever it points at
  const assocPath = isShortcut && node.target ? node.target : node.path;
  const assoc = isDrive || isFolder ? null : getFileAssociation(assocPath);
  const opensWith = assocOverride
    ? {
        appName: assocOverride.displayName,
        icon: (assocOverride.header && assocOverride.header.icon) || null,
      }
    : assoc;
  const dirSize = !isFile && !isShortcut ? vfs.getDirSize(node.path) : 0;
  const targetNode =
    isShortcut && node.target ? vfs.getNode(node.target) : null;

  const title = isDrive
    ? `${node.driveLabel || 'Local Disk'} (${node.name}) Properties`
    : `${shownName} Properties`;

  const used = isDrive ? (node.totalSpace || 0) - (node.freeSpace || 0) : 0;
  const usedPct =
    isDrive && node.totalSpace ? Math.round((used / node.totalSpace) * 100) : 0;

  const setAssociation = exePath => {
    const ext = getExtension(assocPath).toLowerCase();
    if (!ext) return;
    try {
      const ov = vfs.getUserConfig('fileAssocOverrides', null) || {};
      vfs.setUserConfig('fileAssocOverrides', { ...ov, [ext]: exePath });
    } catch {
      // hive unavailable — session only
    }
  };

  // Commit every edited field. Returns the node's (possibly new) path so a
  // rename doesn't leave the dialog pointing at a path that no longer exists.
  const apply = async () => {
    if (!dirty) return path;
    let livePath = path;

    if (isShortcut) {
      const patch = {};
      const trimmedTarget = targetValue.trim();
      if (trimmedTarget && trimmedTarget !== node.target) {
        if (!vfs.exists(trimmedTarget)) {
          dlg.alert(
            `The name '${trimmedTarget}' specified in the Target box is not valid. Make sure the path and file name are correct.`,
            'Problem with Shortcut',
            { icon: 'error' },
          );
          return livePath;
        }
        patch.target = trimmedTarget;
      }
      if (startInValue !== (node.startIn || '')) patch.startIn = startInValue;
      if (runValue !== (node.runMode || 'normal')) patch.runMode = runValue;
      if (commentValue !== (node.comment || '')) patch.comment = commentValue;
      if (Object.keys(patch).length > 0) vfs.updateShortcut(livePath, patch);
    }

    if (!attrsLocked) {
      vfs.setNodeAttributes(livePath, {
        readOnly: attrReadOnly,
        hidden: attrHidden,
      });
    }

    // Summary fields ride in the hive alongside the rest of the profile
    if (isFile && isMediaFile) {
      // Only what differs from the file's own tags is kept, so clearing a box
      // puts the file's value back rather than blanking it forever.
      const own = (metadata && metadata.tags) || {};
      const patch = {};
      for (const f of EDITABLE_TAGS) {
        const typed = String(tagValues[f.key] || '').trim();
        patch[f.key] = typed === String(own[f.key] || '').trim() ? '' : typed;
      }
      try {
        writeTagEdits(vfs, livePath, patch);
      } catch {
        // hive unavailable — session only
      }
    } else if (isFile) {
      try {
        const all = vfs.getUserConfig('fileSummaries', null) || {};
        vfs.setUserConfig('fileSummaries', { ...all, [livePath]: summary });
      } catch {
        // hive unavailable — session only
      }
    }

    // Rename last: it moves the node, so everything above targets the old path
    const trimmedName = nameValue.trim();
    if (!isDrive && trimmedName && trimmedName !== shownName) {
      const hiddenExt = hiddenExtension(node, hideExt);
      const finalName = `${trimmedName}${hiddenExt}`;
      // Same guard the shell puts on a rename that changes the extension
      if (
        !hiddenExt &&
        node.type === 'file' &&
        getExtension(finalName) !== getExtension(node.name)
      ) {
        const ok = await dlg.confirm(
          'If you change a file name extension, the file may become unusable. Are you sure you want to change it?',
          'Rename',
          { icon: 'warning' },
        );
        if (!ok) {
          setNameValue(shownName);
          return livePath;
        }
      }
      const res = vfs.rename(livePath, finalName);
      if (!res.ok) {
        dlg.alert(
          res.error === 'invalid'
            ? INVALID_NAME_MESSAGE
            : `Cannot rename ${shownName}: A file with the name you specified already exists. Specify a different file name.`,
          'Error Renaming File or Folder',
          { icon: 'error' },
        );
        setNameValue(shownName);
        return livePath;
      }
      livePath = `${getParentPath(livePath)}/${finalName}`;
    }

    setDirty(false);
    return livePath;
  };

  const touch = () => setDirty(true);

  const findTarget = () => {
    if (!onShellOpen || !targetNode) return;
    const parent = getParentPath(targetNode.path);
    if (parent) onShellOpen(parent);
    onClose();
  };

  // An executable carries a VERSIONINFO block instead of an "Opens with".
  // A shortcut to one borrows its description — a link to Notepad reads
  // "Description: Notepad", not "Opens with".
  const versionInfo = versionInfoFor(node, isShortcut ? targetNode : null);
  // An Application never gets an "Opens with" row, even when it carries no
  // version resource to describe itself with.
  const isApplication = isBinary(isShortcut ? targetNode : node);

  const tabs = [{ key: 'general', label: 'General' }];
  if (isShortcut) tabs.push({ key: 'shortcut', label: 'Shortcut' });
  // The Version tab belongs to the binary itself, never to a link, and only
  // when there is actually a version resource to show
  if (versionInfo && !isShortcut)
    tabs.push({ key: 'version', label: 'Version' });
  if (isFile) tabs.push({ key: 'summary', label: 'Summary' });

  return (
    <XPDialogFrame
      title={title}
      width={405}
      onClose={onClose}
      zIndex={99985}
      onKeyDown={e => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <Body>
        <div className="pr-tabs">
          {tabs.map(t => (
            <div
              key={t.key}
              className={`pr-tab${tab === t.key ? ' active' : ''}${
                t.disabled ? ' disabled' : ''
              }`}
              onClick={() => !t.disabled && setTab(t.key)}
            >
              {t.label}
            </div>
          ))}
        </div>

        <div className="pr-page">
          {tab === 'version' && versionInfo ? (
            <VersionTab
              versionInfo={versionInfo}
              versionItem={versionItem}
              setVersionItem={setVersionItem}
            />
          ) : tab === 'summary' ? (
            <SummaryTab
              metadata={metadata}
              summaryAdvanced={summaryAdvanced}
              setSummaryAdvanced={setSummaryAdvanced}
              isMediaFile={isMediaFile}
              tagValues={tagValues}
              setTagValues={setTagValues}
              summary={summary}
              setSummary={setSummary}
              touch={touch}
            />
          ) : tab === 'shortcut' ? (
            <>
              <div className="pr-row pr-row--head">
                <img
                  src={node.iconLarge || node.icon}
                  alt=""
                  className="pr-icon"
                />
                <div className="pr-name">{shownName}</div>
              </div>
              <div className="pr-sep" />
              <div className="pr-row">
                <div className="pr-label">Target type:</div>
                <div className="pr-value">
                  {targetNode ? getTypeLabel(targetNode) : 'Unknown'}
                </div>
              </div>
              <div className="pr-row">
                <div className="pr-label">Target location:</div>
                <div className="pr-value">
                  {targetNode
                    ? getBaseName(getParentPath(targetNode.path) || '') ||
                      'My Computer'
                    : ''}
                </div>
              </div>
              <div className="pr-row">
                <div className="pr-label">Target:</div>
                <input
                  className="pr-field"
                  value={targetValue}
                  onChange={e => {
                    setTargetValue(e.target.value);
                    touch();
                  }}
                  spellCheck={false}
                />
              </div>
              <div className="pr-sep" />
              <div className="pr-row">
                <div className="pr-label">Start in:</div>
                <input
                  className="pr-field"
                  value={startInValue}
                  onChange={e => {
                    setStartInValue(e.target.value);
                    touch();
                  }}
                  spellCheck={false}
                />
              </div>
              <div className="pr-row">
                <div className="pr-label">Shortcut key:</div>
                <input className="pr-field" value="None" readOnly />
              </div>
              <div className="pr-row">
                <div className="pr-label">Run:</div>
                <div className="pr-value">
                  <XPSelect
                    value={runValue}
                    options={RUN_MODES}
                    onChange={v => {
                      setRunValue(v);
                      touch();
                    }}
                  />
                </div>
              </div>
              <div className="pr-row">
                <div className="pr-label">Comment:</div>
                <input
                  className="pr-field"
                  value={commentValue}
                  onChange={e => {
                    setCommentValue(e.target.value);
                    touch();
                  }}
                  spellCheck={false}
                />
              </div>
              <div className="pr-btnrow">
                <XPButton
                  disabled={!targetNode || !onShellOpen}
                  onClick={findTarget}
                >
                  Find Target...
                </XPButton>
                <XPButton onClick={() => setChangeIconOpen(true)}>
                  Change Icon...
                </XPButton>
                <XPButton disabled>Advanced...</XPButton>
              </div>
            </>
          ) : (
            <>
              {/* Icon + editable name */}
              <div className="pr-row pr-row--head">
                <img
                  src={node.iconLarge || node.icon}
                  alt=""
                  className="pr-icon"
                />
                {isDrive ? (
                  <div className="pr-name">
                    {node.driveLabel || 'Local Disk'}
                  </div>
                ) : (
                  <input
                    className="pr-field pr-field--name"
                    value={nameValue}
                    disabled={node.system}
                    onChange={e => {
                      setNameValue(e.target.value);
                      touch();
                    }}
                    spellCheck={false}
                  />
                )}
              </div>
              <div className="pr-sep" />

              {isDrive ? (
                <>
                  <div className="pr-row">
                    <div className="pr-label">Type:</div>
                    <div className="pr-value">{getTypeLabel(node)}</div>
                  </div>
                  <div className="pr-row">
                    <div className="pr-label">File system:</div>
                    <div className="pr-value">{node.fileSystemType}</div>
                  </div>
                  <div className="pr-sep" />
                  <div className="pr-row">
                    <div className="pr-label">
                      <span className="pr-swatch pr-swatch--used" /> Used space:
                    </div>
                    <div className="pr-value">
                      {formatSize(used)} ({usedPct}%)
                    </div>
                  </div>
                  <div className="pr-row">
                    <div className="pr-label">
                      <span className="pr-swatch pr-swatch--free" /> Free space:
                    </div>
                    <div className="pr-value">
                      {formatSize(node.freeSpace || 0)}
                    </div>
                  </div>
                  <div className="pr-sep" />
                  <div className="pr-row">
                    <div className="pr-label">Capacity:</div>
                    <div className="pr-value">
                      {formatSize(node.totalSpace || 0)}
                    </div>
                  </div>
                  <div className="pr-bar">
                    <div
                      className="pr-bar__used"
                      style={{ width: `${usedPct}%` }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="pr-row">
                    <div className="pr-label">
                      Type of {isFolder ? 'folder' : 'file'}:
                    </div>
                    <div className="pr-value">{getTypeLabel(node)}</div>
                  </div>
                  {/* An application describes itself; only documents get an
                      "Opens with" row and its Change... button */}
                  {isApplication
                    ? versionInfo && (
                        <div className="pr-row">
                          <div className="pr-label">Description:</div>
                          <div className="pr-value">
                            {versionInfo.description}
                          </div>
                        </div>
                      )
                    : !isFolder && (
                        <div className="pr-row">
                          <div className="pr-label">Opens with:</div>
                          <div className="pr-value pr-value--opens">
                            {opensWith && opensWith.icon && (
                              <img
                                src={opensWith.icon}
                                alt=""
                                className="pr-mini-icon"
                              />
                            )}
                            <span className="pr-opens-name">
                              {opensWith
                                ? opensWith.appName
                                : 'Unknown application'}
                            </span>
                          </div>
                          <XPButton onClick={() => setChangingAssoc(true)}>
                            Change...
                          </XPButton>
                        </div>
                      )}
                  <div className="pr-sep" />
                  <div className="pr-row">
                    <div className="pr-label">Location:</div>
                    <div className="pr-value">
                      {displayPath(getParentPath(node.path) || node.path)}
                    </div>
                  </div>
                  <div className="pr-row">
                    <div className="pr-label">Size:</div>
                    <div className="pr-value">
                      {isFolder
                        ? formatSize(dirSize)
                        : `${formatSize(node.size)} (${(
                            node.size || 0
                          ).toLocaleString()} bytes)`}
                    </div>
                  </div>
                  <div className="pr-row">
                    <div className="pr-label">Size on disk:</div>
                    <div className="pr-value">
                      {(() => {
                        const raw = isFolder ? dirSize : node.size || 0;
                        const d = sizeOnDisk(raw);
                        return `${formatSize(d)} (${d.toLocaleString()} bytes)`;
                      })()}
                    </div>
                  </div>
                  {isFolder && stats && (
                    <div className="pr-row">
                      <div className="pr-label">Contains:</div>
                      <div className="pr-value">
                        {stats.files} Files, {stats.folders} Folders
                      </div>
                    </div>
                  )}
                  <div className="pr-sep" />
                  <div className="pr-row">
                    <div className="pr-label">Created:</div>
                    <div className="pr-value">{fmtLong(node.createdAt)}</div>
                  </div>
                  {!isFolder && (
                    <>
                      <div className="pr-row">
                        <div className="pr-label">Modified:</div>
                        <div className="pr-value">
                          {fmtLong(node.modifiedAt)}
                        </div>
                      </div>
                      <div className="pr-row">
                        <div className="pr-label">Accessed:</div>
                        <div className="pr-value">
                          {fmtLong(node.accessedAt || node.modifiedAt)}
                        </div>
                      </div>
                    </>
                  )}
                  <div className="pr-sep" />
                  <div className="pr-row">
                    <div className="pr-label">Attributes:</div>
                    <div className="pr-value pr-attrs">
                      <label>
                        <input
                          type="checkbox"
                          checked={attrReadOnly}
                          disabled={attrsLocked}
                          onChange={() => {
                            setAttrReadOnly(v => !v);
                            touch();
                          }}
                        />
                        Read-only
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={attrHidden}
                          disabled={attrsLocked}
                          onChange={() => {
                            setAttrHidden(v => !v);
                            touch();
                          }}
                        />
                        Hidden
                      </label>
                    </div>
                    <XPButton onClick={() => setAdvancedOpen(true)}>
                      Advanced...
                    </XPButton>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <div className="pr-footer">
          <XPButton
            ref={okBtnRef}
            onClick={async () => {
              await apply();
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

      {changingAssoc && (
        <OpenWithDialog
          mode="choose"
          title="Open With"
          headerText="Choose the program you want to use to open this file:"
          onLaunch={exePath => {
            setAssociation(exePath);
            setChangingAssoc(false);
          }}
          onClose={() => setChangingAssoc(false)}
        />
      )}
      {advancedOpen && (
        <AdvancedAttributes onClose={() => setAdvancedOpen(false)} />
      )}
      {changeIconOpen && (
        <ChangeIconDialog
          current={node.icon}
          onPick={(icon, iconLarge) => {
            vfs.updateShortcut(path, { icon, iconLarge });
            setChangeIconOpen(false);
          }}
          onClose={() => setChangeIconOpen(false)}
        />
      )}
    </XPDialogFrame>
  );
}

