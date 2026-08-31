/*
 * Media Tag Editor — bulk tagging and renaming for a folder of music.
 *
 * Windows XP shipped nothing like this: its own Summary page edits one file at
 * a time, and Media Player 8 could only edit a row in its library. Filling in
 * a whole album meant a third-party utility, so this is one, drawn entirely
 * from the stock Luna controls rather than art of its own.
 *
 * The layout is the arrangement those utilities settled on: a tag panel down
 * the left whose fields apply to everything selected, and the folder's files
 * on the right with a column per field. Nothing is written until Save, and
 * every rename shows a before-and-after list first.
 *
 * Tags are kept in the same store the player and Explorer read
 * (`context/tagOverrides`), so an album named here is named everywhere.
 */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import styled from 'styled-components';

import { WindowDropDowns } from 'components';
import FileDialog from '../../../components/FileDialog';
import XPButton from '../../../components/XPButton';
import {
  ColumnDivider,
  sumWidths,
  useColumns,
} from '../../../components/ListView';
import { useVFS } from '../../../context/VFSContext';
import { useDialog } from '../../../context/DialogContext';
import { readMediaTags } from '../../../context/mediaTags';
import {
  applyEditsTo,
  applyTagEdits,
  isTaggedMedia,
  readAllTagEdits,
  saveTagEdits,
} from '../../../context/tagOverrides';
import { SPECIAL_FOLDERS } from '../../../context/vfsConstants';
import { getBaseName, getParentPath } from '../../../context/vfsUtils';
import { ensureFolder } from '../../../context/zipShell';
import dropDownData from './dropDownData';
import ConvertDialog from './ConvertDialog';
import { guessFolder, onlyMissing } from './guess';
import {
  expand,
  extensionOf,
  parse,
  segments,
  trackNumber,
  uniqueName,
} from './rename';

/* ---- chrome ------------------------------------------------------------- */

const Div = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #ece9d8;
  font-family: Tahoma, 'Noto Sans', sans-serif;
  font-size: 11px;
  color: #000;

  .te__menu {
    flex: none;
    border-bottom: 1px solid #d5d2ca;
  }
`;

const Toolbar = styled.div`
  flex: none;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  border-bottom: 1px solid #aca899;

  .te__path {
    flex: 1;
    min-width: 0;
    height: 19px;
    line-height: 17px;
    padding: 0 4px;
    border: 1px solid #7f9db9;
    background: #fff;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    direction: rtl;
    text-align: left;
  }
`;

const Split = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
`;

const Panel = styled.div`
  flex: none;
  width: 186px;
  padding: 8px;
  overflow: auto;
  border-right: 1px solid #aca899;

  h2 {
    margin: 0 0 8px;
    font-size: 11px;
    font-weight: bold;
    color: #0046d5;
  }
  label {
    display: block;
    margin-bottom: 2px;
  }
  input {
    width: 100%;
    height: 19px;
    margin-bottom: 7px;
    padding: 0 3px;
    border: 1px solid #7f9db9;
    font-family: inherit;
    font-size: 11px;
    background: ${({ $enabled }) => ($enabled ? '#fff' : '#f2f0e8')};
    color: ${({ $enabled }) => ($enabled ? '#000' : '#8a8578')};
  }
  .te__panelbtns {
    display: flex;
    gap: 4px;
    margin-top: 4px;
  }
  .te__panelbtns button {
    min-width: 0;
    flex: 1;
  }
`;

const ListArea = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: #fff;
`;

const Scroller = styled.div`
  flex: 1;
  min-height: 0;
  overflow: auto;
  outline: none;
`;

const Header = styled.div`
  display: flex;
  position: sticky;
  top: 0;
  z-index: 1;
  height: 17px;
  background: linear-gradient(to bottom, #fff 0, #f0efe7 100%);

  > div {
    position: relative;
    flex: none;
    height: 17px;
    line-height: 16px;
    padding: 0 4px;
    border-right: 1px solid #d5d2ca;
    border-bottom: 1px solid #aca899;
    overflow: hidden;
    white-space: nowrap;
    box-sizing: border-box;
  }
`;

const Row = styled.div`
  display: flex;
  height: 16px;
  line-height: 16px;
  background: ${({ $selected }) => ($selected ? '#316ac5' : 'transparent')};
  color: ${({ $selected }) => ($selected ? '#fff' : '#000')};

  > div {
    flex: none;
    padding: 0 4px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    box-sizing: border-box;
  }
`;

const Placeholder = styled.div`
  padding: 12px;
  color: #666;
`;

const Status = styled.div`
  flex: none;
  display: flex;
  height: 20px;
  align-items: center;
  padding: 0 6px;
  border-top: 1px solid #fff;
  background: #ece9d8;
  box-shadow: inset 0 1px 0 #aca899;
  color: #333;
`;

/* ---- fields ------------------------------------------------------------- */

const COLUMNS = [
  { id: 'name', label: 'Filename', width: 160 },
  { id: 'title', label: 'Title', width: 140 },
  { id: 'artist', label: 'Artist', width: 100 },
  { id: 'album', label: 'Album', width: 120 },
  { id: 'track', label: 'Track', width: 40 },
  { id: 'year', label: 'Year', width: 40 },
  { id: 'genre', label: 'Genre', width: 80 },
];

const PANEL_FIELDS = [
  { key: 'title', label: 'Title' },
  { key: 'artist', label: 'Artist' },
  { key: 'album', label: 'Album' },
  { key: 'year', label: 'Year' },
  { key: 'track', label: 'Track' },
  { key: 'genre', label: 'Genre' },
  { key: 'comment', label: 'Comment' },
];

// What a field shows when the selected files disagree about it. Leaving it
// alone leaves every file's own value alone, which is how these editors have
// always let you set an album across tracks without flattening their titles.
const KEEP = '<keep>';

const blankPanel = () => Object.fromEntries(PANEL_FIELDS.map(f => [f.key, '']));

/** The value the whole selection shares, or KEEP when they differ. */
function commonValue(files, field) {
  if (!files.length) return '';
  const first = files[0].tags[field] || '';
  return files.every(f => (f.tags[field] || '') === first) ? first : KEEP;
}

/* ---- app ---------------------------------------------------------------- */

export default function TagEditor({ onClose, onSetHeader, filePath }) {
  const vfs = useVFS();
  const { alert, confirm } = useDialog();

  const [folder, setFolder] = useState(null);
  const [files, setFiles] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [panel, setPanel] = useState(blankPanel);
  const [convert, setConvert] = useState(null);
  const [fileDialog, setFileDialog] = useState(null);
  const [undo, setUndo] = useState(null);
  const anchorRef = useRef(null);
  const scrollerRef = useRef(null);
  const { widths, beginResize, autoSize } = useColumns('tageditor', COLUMNS);

  /* ---- loading ---------------------------------------------------------- */

  const scan = useCallback(
    async dir => {
      if (!dir || !vfs.initialized) return;
      setScanning(true);
      let children = [];
      try {
        children = vfs
          .listDir(dir)
          .filter(c => c.type === 'file' && isTaggedMedia(c.name));
      } catch {
        children = [];
      }
      const edits = readAllTagEdits(vfs);
      const out = [];
      for (const child of children) {
        let tags = {};
        try {
          // eslint-disable-next-line no-await-in-loop
          const blob = await vfs.openBinaryFile(child.path);
          // eslint-disable-next-line no-await-in-loop
          tags = blob ? (await readMediaTags(blob, child.path)) || {} : {};
        } catch {
          tags = {};
        }
        out.push({
          path: child.path,
          name: child.name,
          tags: applyTagEdits(tags, edits[child.path.toLowerCase()]),
        });
      }
      setFiles(out);
      setSelected(new Set());
      setPanel(blankPanel());
      setScanning(false);
    },
    [vfs],
  );

  // Opened on a file, or on My Music when launched with nothing
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current || !vfs.initialized) return;
    opened.current = true;
    const start = filePath ? getParentPath(filePath) : SPECIAL_FOLDERS.MY_MUSIC;
    const node = vfs.findNodeCI(start);
    const dir = node ? node.path : SPECIAL_FOLDERS.MY_MUSIC;
    setFolder(dir);
    scan(dir);
  }, [vfs.initialized, filePath, scan, vfs]);

  useEffect(() => {
    if (!onSetHeader) return;
    onSetHeader({
      title: folder
        ? `${getBaseName(folder)} - Media Tag Editor`
        : 'Media Tag Editor',
    });
  }, [folder, onSetHeader]);

  /* ---- selection -------------------------------------------------------- */

  const selectedFiles = useMemo(() => files.filter(f => selected.has(f.path)), [
    files,
    selected,
  ]);

  // The panel always reflects what is selected; typing then overrides it.
  useEffect(() => {
    if (!selectedFiles.length) {
      setPanel(blankPanel());
      return;
    }
    setPanel(
      Object.fromEntries(
        PANEL_FIELDS.map(f => [f.key, commonValue(selectedFiles, f.key)]),
      ),
    );
  }, [selectedFiles]);

  const clickRow = (event, file) => {
    const paths = files.map(f => f.path);
    if (event.shiftKey && anchorRef.current) {
      const from = paths.indexOf(anchorRef.current);
      const to = paths.indexOf(file.path);
      if (from >= 0 && to >= 0) {
        const [a, b] = from < to ? [from, to] : [to, from];
        setSelected(new Set(paths.slice(a, b + 1)));
        return;
      }
    }
    if (event.ctrlKey || event.metaKey) {
      setSelected(prev => {
        const next = new Set(prev);
        if (next.has(file.path)) next.delete(file.path);
        else next.add(file.path);
        return next;
      });
      anchorRef.current = file.path;
      return;
    }
    setSelected(new Set([file.path]));
    anchorRef.current = file.path;
  };

  const selectAll = () => setSelected(new Set(files.map(f => f.path)));

  /* ---- writing tags ----------------------------------------------------- */

  /** Apply a patch to a set of paths and show it in the list immediately. */
  const writeTags = useCallback(
    (paths, patchFor) => {
      let edits = readAllTagEdits(vfs);
      const byPath = new Map();
      for (const path of paths) {
        const patch = patchFor(path);
        if (!patch || !Object.keys(patch).length) continue;
        byPath.set(path, patch);
        edits = applyEditsTo(edits, [path], patch);
      }
      if (!byPath.size) return;
      saveTagEdits(vfs, edits);
      setFiles(prev =>
        prev.map(f =>
          byPath.has(f.path)
            ? { ...f, tags: { ...f.tags, ...byPath.get(f.path) } }
            : f,
        ),
      );
    },
    [vfs],
  );

  const saveTags = () => {
    if (!selectedFiles.length) return;
    // A field left at <keep> is not part of the patch, so files keep their own
    const patch = {};
    for (const field of PANEL_FIELDS) {
      const value = panel[field.key];
      if (value !== KEEP) patch[field.key] = value;
    }
    if (!Object.keys(patch).length) return;
    writeTags(
      selectedFiles.map(f => f.path),
      () => patch,
    );
  };

  const autoNumber = () => {
    const target = selectedFiles.length ? selectedFiles : files;
    if (!target.length) return;
    const order = new Map(target.map((f, i) => [f.path, String(i + 1)]));
    writeTags(
      target.map(f => f.path),
      path => ({ track: order.get(path) }),
    );
  };

  /* ---- renaming --------------------------------------------------------- */

  const applyRenames = useCallback(
    rows => {
      const done = [];
      for (const row of rows) {
        if (!row.ok) continue;
        const result = vfs.rename(row.path, row.to);
        if (result && result.ok === false) continue;
        const parent = getParentPath(row.path);
        done.push({ path: `${parent}/${row.to}`, to: row.from });
      }
      if (done.length) setUndo({ kind: 'rename', ops: done });
      return done.length;
    },
    [vfs],
  );

  const applyMoves = useCallback(
    rows => {
      const done = [];
      for (const row of rows) {
        if (!row.ok) continue;
        ensureFolder(vfs, row.dir);
        const result = vfs.move(row.path, row.dir);
        if (result && result.ok === false) continue;
        done.push({
          path: `${row.dir}/${getBaseName(row.path)}`,
          dir: getParentPath(row.path),
        });
      }
      if (done.length) setUndo({ kind: 'move', ops: done });
      return done.length;
    },
    [vfs],
  );

  const undoLast = async () => {
    if (!undo) return;
    for (const op of undo.ops) {
      if (undo.kind === 'rename') vfs.rename(op.path, op.to);
      else vfs.move(op.path, op.dir);
    }
    setUndo(null);
    await scan(folder);
  };

  /* ---- the convert dialogs ---------------------------------------------- */

  const targets = () => (selectedFiles.length ? selectedFiles : files);

  const previewRows = useMemo(() => {
    if (!convert) return [];
    const list = convert.files;
    if (convert.kind === 'toname') {
      const taken = new Set(
        files.filter(f => !list.includes(f)).map(f => f.name.toLowerCase()),
      );
      return list.map(file => {
        const stem = expand(convert.format, file.tags);
        if (!stem)
          return { from: file.name, ok: false, why: 'no value for those tags' };
        const wanted = uniqueName(stem + extensionOf(file.name), taken);
        taken.add(wanted.toLowerCase());
        return {
          from: file.name,
          to: wanted,
          ok: wanted !== file.name,
          why: 'already named that',
          path: file.path,
        };
      });
    }
    if (convert.kind === 'guess') {
      const guessed = guessFolder(list, folder);
      return list.map(file => {
        const raw = guessed.get(file.path) || {};
        const patch = convert.onlyEmpty ? onlyMissing(raw, file.tags) : raw;
        const shown = Object.entries(patch)
          .map(([k, v]) => `${k}: ${v}`)
          .join('   ');
        return {
          from: file.name,
          to: shown,
          ok: !!shown,
          why: convert.onlyEmpty ? 'nothing missing' : 'nothing to go on',
          path: file.path,
          tags: patch,
        };
      });
    }
    if (convert.kind === 'totag') {
      return list.map(file => {
        const stem = file.name.slice(
          0,
          file.name.length - extensionOf(file.name).length,
        );
        const found = parse(convert.format, stem);
        return {
          from: file.name,
          to: found
            ? Object.entries(found)
                .map(([k, v]) => `${k}: ${v}`)
                .join('   ')
            : '',
          ok: !!found,
          why: 'does not match',
          path: file.path,
          tags: found,
        };
      });
    }
    // organize
    return list.map(file => {
      const parts = segments(convert.format, file.tags);
      if (!parts.length)
        return { from: file.name, ok: false, why: 'no value for those tags' };
      const dir = `${convert.root}/${parts.join('/')}`;
      return {
        from: file.name,
        to: `${parts.join('\\')}\\${file.name}`,
        ok: dir !== getParentPath(file.path),
        why: 'already there',
        path: file.path,
        dir,
      };
    });
  }, [convert, files, folder]);

  const runConvert = async () => {
    const rows = previewRows;
    let changed = 0;
    if (convert.kind === 'toname') changed = applyRenames(rows);
    else if (convert.kind === 'totag' || convert.kind === 'guess') {
      const byPath = new Map(rows.filter(r => r.ok).map(r => [r.path, r.tags]));
      writeTags([...byPath.keys()], path => byPath.get(path));
      changed = byPath.size;
    } else changed = applyMoves(rows);
    setConvert(null);
    if (convert.kind !== 'totag' && convert.kind !== 'guess')
      await scan(folder);
    if (!changed) await alert('Nothing was changed.', 'Media Tag Editor');
  };

  /* ---- cover art -------------------------------------------------------- */

  const setCoverArt = async source => {
    const blob = await vfs.readBinaryFile(source);
    if (!blob) {
      await alert('That picture could not be read.', 'Media Tag Editor');
      return;
    }
    // One cover per folder: the player looks for Folder.* beside the tracks
    const dirs = [...new Set(targets().map(f => getParentPath(f.path)))];
    const name = `Folder${extensionOf(getBaseName(source)) || '.jpg'}`;
    for (const dir of dirs) {
      const existing = vfs.findNodeCI(`${dir}/${name}`);
      if (existing) vfs.deleteNodePermanently(existing.path);
      vfs.createFile(`${dir}/${name}`, blob, blob.type);
    }
    await alert(
      `${name} was placed in ${dirs.length} folder${
        dirs.length === 1 ? '' : 's'
      }.`,
      'Media Tag Editor',
    );
  };

  /* ---- menu ------------------------------------------------------------- */

  const onMenu = async item => {
    switch (item) {
      case 'Open Folder...':
        setFileDialog({
          mode: 'open',
          title: 'Open Folder',
          initialPath: folder || SPECIAL_FOLDERS.MY_MUSIC,
          onPick: async picked => {
            const dir = getParentPath(picked);
            setFolder(dir);
            await scan(dir);
          },
        });
        break;
      case 'Refresh':
        await scan(folder);
        break;
      case 'Save Tags':
        saveTags();
        break;
      case 'Exit':
        onClose();
        break;
      case 'Select All':
        selectAll();
        break;
      case 'Invert Selection':
        setSelected(
          new Set(files.filter(f => !selected.has(f.path)).map(f => f.path)),
        );
        break;
      case 'Undo Last Rename':
        await undoLast();
        break;
      case 'Tag to Filename...':
        setConvert({
          kind: 'toname',
          format: '%track% - %title%',
          files: targets(),
        });
        break;
      case 'Filename to Tag...':
        setConvert({
          kind: 'totag',
          format: '%track% - %title%',
          files: targets(),
        });
        break;
      case 'Organize into Folders...': {
        const root = SPECIAL_FOLDERS.MY_MUSIC;
        const ok = await confirm(
          `Files will be moved into folders under ${root}.`,
          'Media Tag Editor',
        );
        if (ok)
          setConvert({
            kind: 'organize',
            format: '%artist%\\%album%',
            files: targets(),
            root,
          });
        break;
      }
      case 'Guess Tags from Filenames...':
        setConvert({ kind: 'guess', files: targets(), onlyEmpty: true });
        break;
      case 'Auto-number Tracks':
        autoNumber();
        break;
      case 'Set Cover Art...':
        setFileDialog({
          mode: 'open',
          title: 'Set Cover Art',
          initialPath: folder || SPECIAL_FOLDERS.MY_MUSIC,
          filters: [
            {
              label: 'Pictures (*.jpg;*.png;*.gif;*.bmp)',
              extensions: ['.jpg', '.jpeg', '.png', '.gif', '.bmp'],
            },
            { label: 'All Files (*.*)', extensions: null },
          ],
          onPick: setCoverArt,
        });
        break;
      case 'About Media Tag Editor':
        await alert(
          [
            'Media Tag Editor 1.0',
            '',
            'Edits tags across a whole folder at once and renames files from',
            'them. Tags are shared with Windows Media Player and Explorer.',
          ].join(String.fromCharCode(10)),
          'About Media Tag Editor',
        );
        break;
      default:
        break;
    }
  };

  /* ---- render ----------------------------------------------------------- */

  const cell = (file, id) => {
    if (id === 'name') return file.name;
    if (id === 'track') return trackNumber(file.tags.track);
    return file.tags[id] || '';
  };

  const total = sumWidths(COLUMNS, widths);
  const panelEnabled = selectedFiles.length > 0;

  const dialogTitles = {
    toname: 'Tag to Filename',
    totag: 'Filename to Tag',
    organize: 'Organize into Folders',
    guess: 'Guess Tags from Filenames',
  };
  const dialogLeads = {
    toname: 'Rename the files below from their tags.',
    totag: 'Read tags out of the file names below.',
    organize: 'Move the files below into folders built from their tags.',
    guess:
      'Tags are worked out from each file name and the folders above it. Check them before applying.',
  };

  return (
    <Div>
      <section className="te__menu">
        <WindowDropDowns items={dropDownData} onClickItem={onMenu} />
      </section>
      <Toolbar>
        <XPButton
          style={{ minWidth: 0, padding: '0 8px' }}
          onClick={() => onMenu('Open Folder...')}
        >
          Open Folder...
        </XPButton>
        <div className="te__path" title={folder || ''}>
          {folder ? folder.replace(/\//g, '\\') : ''}
        </div>
      </Toolbar>
      <Split>
        <Panel $enabled={panelEnabled}>
          <h2>Tag Panel</h2>
          {PANEL_FIELDS.map(field => (
            <React.Fragment key={field.key}>
              <label htmlFor={`te-${field.key}`}>{field.label}</label>
              <input
                id={`te-${field.key}`}
                value={panel[field.key]}
                disabled={!panelEnabled}
                spellCheck={false}
                onChange={e =>
                  setPanel(p => ({ ...p, [field.key]: e.target.value }))
                }
                onKeyDown={e => {
                  if (e.key === 'Enter') saveTags();
                }}
              />
            </React.Fragment>
          ))}
          <div className="te__panelbtns">
            <XPButton disabled={!panelEnabled} onClick={saveTags}>
              Save
            </XPButton>
            <XPButton
              disabled={!panelEnabled}
              onClick={() =>
                setPanel(
                  Object.fromEntries(
                    PANEL_FIELDS.map(f => [
                      f.key,
                      commonValue(selectedFiles, f.key),
                    ]),
                  ),
                )
              }
            >
              Revert
            </XPButton>
          </div>
        </Panel>
        <ListArea>
          <Scroller
            ref={scrollerRef}
            tabIndex={0}
            onKeyDown={e => {
              if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
                e.preventDefault();
                selectAll();
              }
            }}
          >
            <Header style={{ width: total }}>
              {COLUMNS.map(c => (
                <div key={c.id} style={{ width: widths[c.id] }}>
                  {c.label}
                  <ColumnDivider
                    columnId={c.id}
                    onResize={beginResize}
                    onAutoSize={id => autoSize(id, scrollerRef.current)}
                  />
                </div>
              ))}
            </Header>
            {scanning ? (
              <Placeholder>Reading tags...</Placeholder>
            ) : !files.length ? (
              <Placeholder>
                There are no media files in this folder. Use File &gt; Open
                Folder to pick another one.
              </Placeholder>
            ) : (
              files.map(file => (
                <Row
                  key={file.path}
                  $selected={selected.has(file.path)}
                  style={{ width: total }}
                  onClick={e => clickRow(e, file)}
                >
                  {COLUMNS.map(c => (
                    <div
                      key={c.id}
                      data-col={c.id}
                      style={{ width: widths[c.id] }}
                    >
                      {cell(file, c.id)}
                    </div>
                  ))}
                </Row>
              ))
            )}
          </Scroller>
        </ListArea>
      </Split>
      <Status>
        {files.length} file{files.length === 1 ? '' : 's'}
        {selected.size ? `, ${selected.size} selected` : ''}
        {undo ? '  |  Edit > Undo Last Rename' : ''}
      </Status>
      {convert && (
        <ConvertDialog
          title={dialogTitles[convert.kind]}
          lead={dialogLeads[convert.kind]}
          label={convert.kind === 'totag' ? 'Read as:' : 'Format string:'}
          format={convert.format}
          onFormatChange={
            convert.kind === 'guess'
              ? undefined
              : format => setConvert(c => ({ ...c, format }))
          }
          hint={
            convert.kind === 'guess'
              ? undefined
              : '%artist%  %album%  %title%  %track%  %year%  %genre%'
          }
          option={
            convert.kind === 'guess'
              ? {
                  label: 'Leave tags that already have a value alone',
                  checked: convert.onlyEmpty,
                  onChange: onlyEmpty => setConvert(c => ({ ...c, onlyEmpty })),
                }
              : undefined
          }
          rows={previewRows}
          applyLabel={convert.kind === 'organize' ? 'Move' : 'OK'}
          onApply={runConvert}
          onClose={() => setConvert(null)}
        />
      )}
      {fileDialog && (
        <FileDialog
          mode={fileDialog.mode}
          title={fileDialog.title}
          initialPath={fileDialog.initialPath}
          filters={fileDialog.filters}
          onSelect={path => {
            setFileDialog(null);
            fileDialog.onPick(path);
          }}
          onCancel={() => setFileDialog(null)}
        />
      )}
    </Div>
  );
}


