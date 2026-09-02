import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import styled from 'styled-components';

import { WindowDropDowns } from 'components';
import FileDialog from '../../../components/FileDialog';
import XPSelect from '../../../components/XPSelect';
import useEditContextMenu from '../../../components/EditContextMenu';
import { useVFS } from '../../../context/VFSContext';
import { useExplorerView } from '../../shell/useExplorerView';
import { useDialog } from '../../../context/DialogContext';
import { SPECIAL_FOLDERS } from '../../../context/vfsConstants';
import { getBaseName } from '../../../context/vfsUtils';
import { displayName } from '../../shell/fileTypes';
import buildMenus from './menuData';
import {
  NewIcon,
  OpenIcon,
  SaveIcon,
  PrintIcon,
  FindIcon,
  CutIcon,
  CopyIcon,
  PasteIcon,
  UndoIcon,
  DateTimeIcon,
  BulletsIcon,
  AlignLeftIcon,
  AlignCenterIcon,
  AlignRightIcon,
} from './icons';

const WORDPAD_FILTERS = [
  { label: 'Rich Text Format (*.rtf)', extensions: ['.rtf'] },
  { label: 'Text Document (*.txt)', extensions: ['.txt'] },
  { label: 'All Files (*.*)', extensions: null },
];

// Rich documents are stored as this marker + the editor's HTML. Real RTF
// braces would be unreadable garbage to the other apps anyway; the marker
// lets WordPad tell its own rich documents apart from plain text.
const RTF_MARKER = '{\\rtf-webxp}';

const FONT_FAMILIES = [
  'Arial',
  'Times New Roman',
  'Courier New',
  'Tahoma',
  'Verdana',
  'Comic Sans MS',
];

// execCommand fontSize takes 1-7; map WordPad's point sizes onto them.
const SIZE_OPTIONS = [
  8,
  9,
  10,
  11,
  12,
  14,
  16,
  18,
  20,
  22,
  24,
  26,
  28,
  36,
  48,
  72,
];
const HTML_TO_PT = { 1: 8, 2: 10, 3: 12, 4: 14, 5: 18, 6: 24, 7: 36 };
const ptToHtml = pt =>
  pt <= 8
    ? 1
    : pt <= 10
    ? 2
    : pt <= 12
    ? 3
    : pt <= 14
    ? 4
    : pt <= 18
    ? 5
    : pt <= 24
    ? 6
    : 7;

const PALETTE = [
  '#000000',
  '#800000',
  '#008000',
  '#808000',
  '#000080',
  '#800080',
  '#008080',
  '#808080',
  '#C0C0C0',
  '#FF0000',
  '#00FF00',
  '#FFFF00',
  '#0000FF',
  '#FF00FF',
  '#00FFFF',
  '#FFFFFF',
];

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** VFS file content → editor HTML. */
function contentToHtml(content) {
  if (content.startsWith(RTF_MARKER)) return content.slice(RTF_MARKER.length);
  return content
    .split(/\r?\n/)
    .map(l => `<div>${l ? escapeHtml(l) : '<br>'}</div>`)
    .join('');
}

export default function WordPad({
  onClose,
  onSetHeader,
  registerCloseInterceptor,
  filePath,
}) {
  const vfs = useVFS();
  const dlg = useDialog();

  const [currentPath, setCurrentPath] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [bars, setBars] = useState({
    toolbar: true,
    formatBar: true,
    ruler: true,
    statusBar: true,
  });
  const [fmt, setFmt] = useState({
    bold: false,
    italic: false,
    underline: false,
    bullets: false,
    align: 'left',
    font: 'Arial',
    size: 10,
  });
  const [colorOpen, setColorOpen] = useState(false);
  const [color, setColor] = useState('#000000');
  const [fileDialog, setFileDialog] = useState(null); // { mode, resolve }
  const editorRef = useRef(null);
  const fontSelectRef = useRef(null);
  const rafRef = useRef(null);
  const { openEditContextMenu, editContextMenu } = useEditContextMenu();

  // 'Hide extensions for known file types' — XP default is on
  const { hideExt } = useExplorerView();

  // Shell display name of the open document ('notes', not 'notes.rtf')
  const fileTitle = currentPath
    ? displayName(vfs.getNode(currentPath), hideExt) || getBaseName(currentPath)
    : 'Document';

  // --- Window title follows the open document ---
  useEffect(() => {
    if (onSetHeader) onSetHeader({ title: `${fileTitle} - WordPad` });
  }, [fileTitle, onSetHeader]);

  // --- Formatting state from the live selection ---
  const refreshFormatState = useCallback(() => {
    const editor = editorRef.current;
    const sel = window.getSelection();
    if (!editor || !sel || sel.rangeCount === 0) return;
    if (!editor.contains(sel.anchorNode)) return;
    try {
      const sizeIdx = parseInt(document.queryCommandValue('fontSize'), 10);
      setFmt({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        bullets: document.queryCommandState('insertUnorderedList'),
        align: document.queryCommandState('justifyCenter')
          ? 'center'
          : document.queryCommandState('justifyRight')
          ? 'right'
          : 'left',
        font: (document.queryCommandValue('fontName') || 'Arial').replace(
          /["']/g,
          '',
        ),
        size: HTML_TO_PT[sizeIdx] || 10,
      });
    } catch {
      // queryCommand* can throw mid-mutation — keep last known state
    }
  }, []);

  useEffect(() => {
    const handler = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        refreshFormatState();
      });
    };
    document.addEventListener('selectionchange', handler);
    return () => {
      document.removeEventListener('selectionchange', handler);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [refreshFormatState]);

  const exec = useCallback(
    (cmd, val = null) => {
      if (editorRef.current) editorRef.current.focus();
      try {
        document.execCommand(cmd, false, val);
      } catch {
        // unsupported command — ignore
      }
      setDirty(true);
      refreshFormatState();
    },
    [refreshFormatState],
  );

  // --- Load injected file (double-clicked in Explorer / desktop) ---
  const loadedInjectedPath = useRef(null);
  useEffect(() => {
    if (!filePath || !vfs.initialized) return;
    if (loadedInjectedPath.current === filePath) return;
    loadedInjectedPath.current = filePath;
    const content = vfs.readFile(filePath);
    if (content != null && editorRef.current) {
      editorRef.current.innerHTML = contentToHtml(content);
      setCurrentPath(filePath);
      setDirty(false);
      vfs.addRecentDocument(filePath);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePath, vfs.initialized]);

  // --- Save machinery (mirrors Notepad) ---

  const openSaveDialog = useCallback(
    () =>
      new Promise(resolve => {
        setFileDialog({ mode: 'save', resolve });
      }),
    [],
  );

  const openOpenDialog = useCallback(
    () =>
      new Promise(resolve => {
        setFileDialog({ mode: 'open', resolve });
      }),
    [],
  );

  const doSave = useCallback(
    async (forceDialog = false) => {
      let targetPath = currentPath;
      if (!targetPath || forceDialog) {
        targetPath = await openSaveDialog();
        if (!targetPath) return false;
      }
      const editor = editorRef.current;
      if (!editor) return false;
      const isPlain = targetPath.toLowerCase().endsWith('.txt');
      const content = isPlain
        ? editor.innerText.replace(/\u00a0/g, ' ')
        : RTF_MARKER + editor.innerHTML;
      if (vfs.exists(targetPath)) {
        vfs.writeFile(targetPath, content);
      } else {
        vfs.createFile(targetPath, content);
      }
      vfs.addRecentDocument(targetPath);
      setCurrentPath(targetPath);
      setDirty(false);
      return true;
    },
    [currentPath, vfs, openSaveDialog],
  );

  const confirmDiscard = useCallback(async () => {
    if (!dirty) return true;
    const res = await dlg.confirm3(`Save changes to ${fileTitle}?`, 'WordPad');
    if (res === 'cancel') return false;
    if (res === 'no') return true;
    return doSave();
  }, [dirty, dlg, fileTitle, doSave]);

  const confirmDiscardRef = useRef(confirmDiscard);
  confirmDiscardRef.current = confirmDiscard;
  useEffect(() => {
    if (registerCloseInterceptor) {
      registerCloseInterceptor(() => confirmDiscardRef.current());
    }
  }, [registerCloseInterceptor]);

  const doNew = useCallback(async () => {
    if (!(await confirmDiscard())) return;
    if (editorRef.current) editorRef.current.innerHTML = '<div><br></div>';
    setCurrentPath(null);
    setDirty(false);
  }, [confirmDiscard]);

  const doOpen = useCallback(async () => {
    if (!(await confirmDiscard())) return;
    const path = await openOpenDialog();
    if (!path) return;
    const content = vfs.readFile(path);
    if (content == null) {
      await dlg.alert(
        `Cannot open the ${getBaseName(
          path,
        )} file.\n\nMake sure a document file was selected.`,
        'WordPad',
      );
      return;
    }
    if (editorRef.current) editorRef.current.innerHTML = contentToHtml(content);
    setCurrentPath(path);
    setDirty(false);
    vfs.addRecentDocument(path);
  }, [confirmDiscard, openOpenDialog, vfs, dlg]);

  // --- Menu handling ---

  async function onClickOptionItem(item) {
    switch (item) {
      case 'Exit':
        onClose();
        break;
      case 'New':
        doNew();
        break;
      case 'Open...':
        doOpen();
        break;
      case 'Save':
        doSave();
        break;
      case 'Save As...':
        doSave(true);
        break;
      case 'Undo':
        exec('undo');
        break;
      case 'Cut':
        exec('cut');
        break;
      case 'Copy':
        exec('copy');
        break;
      case 'Paste':
        exec('paste');
        break;
      case 'Select All':
        exec('selectAll');
        break;
      case 'Toolbar':
        setBars(b => ({ ...b, toolbar: !b.toolbar }));
        break;
      case 'Format Bar':
        setBars(b => ({ ...b, formatBar: !b.formatBar }));
        break;
      case 'Ruler':
        setBars(b => ({ ...b, ruler: !b.ruler }));
        break;
      case 'Status Bar':
        setBars(b => ({ ...b, statusBar: !b.statusBar }));
        break;
      case 'Date and Time...':
        exec('insertText', new Date().toLocaleString());
        break;
      case 'Font...':
        setBars(b => ({ ...b, formatBar: true }));
        setTimeout(() => {
          if (fontSelectRef.current) fontSelectRef.current.focus();
        }, 50);
        break;
      case 'Bullet Style':
        exec('insertUnorderedList');
        break;
      case 'About WordPad':
        dlg.alert(
          'WordPad for Windows XP\nVersion 2026 (Web Remake)',
          'About WordPad',
        );
        break;
      default:
    }
  }

  // --- Keyboard shortcuts (root: file ops; editor adds B/I/U + Tab) ---
  function onKeyDownShortcuts(e) {
    if (!e.ctrlKey) return;
    const key = e.key.toLowerCase();
    if (key === 's') {
      e.preventDefault();
      doSave(e.shiftKey);
    } else if (key === 'o') {
      e.preventDefault();
      doOpen();
    } else if (key === 'n') {
      e.preventDefault();
      doNew();
    }
  }

  function onEditorKeyDown(e) {
    if (e.ctrlKey) {
      const key = e.key.toLowerCase();
      if (key === 'b') {
        e.preventDefault();
        exec('bold');
        return;
      }
      if (key === 'i') {
        e.preventDefault();
        exec('italic');
        return;
      }
      if (key === 'u') {
        e.preventDefault();
        exec('underline');
        return;
      }
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      exec('insertHTML', '&nbsp;&nbsp;&nbsp;&nbsp;');
    }
  }

  const keepSelection = e => e.preventDefault();

  const tbButton = (title, Icon, onAct, opts = {}) => (
    <button
      type="button"
      className={`wp__tb-btn${opts.active ? ' wp__tb-btn--active' : ''}${
        opts.disabled ? ' wp__tb-btn--disabled' : ''
      }`}
      title={title}
      disabled={opts.disabled}
      onMouseDown={keepSelection}
      onClick={onAct}
    >
      <Icon />
    </button>
  );

  return (
    <Div onKeyDown={onKeyDownShortcuts}>
      <section className="wp__menu">
        <WindowDropDowns
          items={buildMenus(bars)}
          onClickItem={onClickOptionItem}
        />
      </section>

      {bars.toolbar && (
        <section className="wp__toolbar">
          {tbButton('New', NewIcon, doNew)}
          {tbButton('Open', OpenIcon, doOpen)}
          {tbButton('Save', SaveIcon, () => doSave())}
          <span className="wp__tb-sep" />
          {tbButton('Print', PrintIcon, () => {}, { disabled: true })}
          {tbButton('Find', FindIcon, () => {}, { disabled: true })}
          <span className="wp__tb-sep" />
          {tbButton('Cut', CutIcon, () => exec('cut'))}
          {tbButton('Copy', CopyIcon, () => exec('copy'))}
          {tbButton('Paste', PasteIcon, () => exec('paste'))}
          {tbButton('Undo', UndoIcon, () => exec('undo'))}
          <span className="wp__tb-sep" />
          {tbButton('Date/Time', DateTimeIcon, () =>
            exec('insertText', new Date().toLocaleString()),
          )}
        </section>
      )}

      {bars.formatBar && (
        <section className="wp__formatbar">
          <XPSelect
            ref={fontSelectRef}
            className="wp__font-select"
            options={[
              ...FONT_FAMILIES.map(f => ({
                value: f,
                label: f,
                style: { fontFamily: f },
              })),
              ...(FONT_FAMILIES.includes(fmt.font)
                ? []
                : [{ value: fmt.font, label: fmt.font }]),
            ]}
            value={fmt.font}
            onChange={v => exec('fontName', v)}
          />
          <XPSelect
            className="wp__size-select"
            options={[
              ...SIZE_OPTIONS.map(s => ({ value: s, label: s })),
              ...(SIZE_OPTIONS.includes(fmt.size)
                ? []
                : [{ value: fmt.size, label: fmt.size }]),
            ]}
            value={fmt.size}
            onChange={v => exec('fontSize', String(ptToHtml(Number(v))))}
          />
          <XPSelect
            className="wp__script-select"
            options={[{ value: 'Western', label: 'Western' }]}
            value="Western"
          />
          <span className="wp__tb-sep" />
          <span className="wp__color-wrap">
            <button
              type="button"
              className="wp__tb-btn wp__color-btn"
              title="Color"
              onMouseDown={keepSelection}
              onClick={() => setColorOpen(o => !o)}
            >
              <span className="wp__color-a">A</span>
              <span className="wp__color-bar" style={{ background: color }} />
              <span className="wp__color-chevron">▾</span>
            </button>
            {colorOpen && (
              <span className="wp__color-pop">
                {PALETTE.map(c => (
                  <button
                    key={c}
                    type="button"
                    className="wp__color-swatch"
                    style={{ background: c }}
                    onMouseDown={keepSelection}
                    onClick={() => {
                      setColor(c);
                      setColorOpen(false);
                      exec('foreColor', c);
                    }}
                  />
                ))}
              </span>
            )}
          </span>
          <span className="wp__tb-sep" />
          {tbButton(
            'Bold',
            () => (
              <b className="wp__glyph">B</b>
            ),
            () => exec('bold'),
            {
              active: fmt.bold,
            },
          )}
          {tbButton(
            'Italic',
            () => (
              <i className="wp__glyph">I</i>
            ),
            () => exec('italic'),
            {
              active: fmt.italic,
            },
          )}
          {tbButton(
            'Underline',
            () => (
              <u className="wp__glyph">U</u>
            ),
            () => exec('underline'),
            { active: fmt.underline },
          )}
          <span className="wp__tb-sep" />
          {tbButton('Align Left', AlignLeftIcon, () => exec('justifyLeft'), {
            active: fmt.align === 'left',
          })}
          {tbButton('Center', AlignCenterIcon, () => exec('justifyCenter'), {
            active: fmt.align === 'center',
          })}
          {tbButton('Align Right', AlignRightIcon, () => exec('justifyRight'), {
            active: fmt.align === 'right',
          })}
          <span className="wp__tb-sep" />
          {tbButton('Bullets', BulletsIcon, () => exec('insertUnorderedList'), {
            active: fmt.bullets,
          })}
        </section>
      )}

      {bars.ruler && (
        <section className="wp__ruler">
          {Array.from({ length: 12 }, (_, i) => (
            <span
              key={i}
              className="wp__ruler-num"
              style={{ left: `${(i + 1) * 96 - 3}px` }}
            >
              {i + 1}
            </span>
          ))}
        </section>
      )}

      <div
        ref={editorRef}
        className="wp__editor"
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        onInput={() => setDirty(true)}
        onKeyDown={onEditorKeyDown}
        onKeyUp={refreshFormatState}
        onMouseUp={refreshFormatState}
        onContextMenu={openEditContextMenu}
      />
      {editContextMenu}

      {bars.statusBar && (
        <footer className="wp__statusbar">
          <span className="wp__status-panel">For Help, press F1</span>
          <span className="wp__status-panel wp__status-panel--end" />
        </footer>
      )}

      {fileDialog && (
        <FileDialog
          mode={fileDialog.mode}
          initialPath={
            currentPath
              ? currentPath.slice(0, currentPath.lastIndexOf('/'))
              : SPECIAL_FOLDERS.MY_DOCUMENTS
          }
          initialFileName={
            fileDialog.mode === 'save'
              ? currentPath
                ? getBaseName(currentPath)
                : 'Document.rtf'
              : ''
          }
          filters={WORDPAD_FILTERS}
          defaultExtension=".rtf"
          onSelect={path => {
            fileDialog.resolve(path);
            setFileDialog(null);
          }}
          onCancel={() => {
            fileDialog.resolve(null);
            setFileDialog(null);
          }}
        />
      )}
    </Div>
  );
}

const Div = styled.div`
  height: 100%;
  background: #edede5;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  font-family: Tahoma, 'Noto Sans', sans-serif;

  .wp__menu {
    position: relative;
    height: 21px;
    flex-shrink: 0;
    border-bottom: 1px solid white;
  }

  .wp__toolbar,
  .wp__formatbar {
    display: flex;
    align-items: center;
    gap: 1px;
    height: 27px;
    padding: 1px 3px;
    flex-shrink: 0;
    border-bottom: 1px solid #d8d2bd;
  }

  .wp__tb-btn {
    width: 23px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 3px;
    padding: 0;
    cursor: default;
    &:hover:not(.wp__tb-btn--disabled) {
      border-color: #b8c7e8;
      background: #dfe7f5;
    }
    &:active:not(.wp__tb-btn--disabled) {
      background: #c1d2ee;
    }
  }
  .wp__tb-btn--active {
    border-color: #b8c7e8;
    background: #c1d2ee;
  }
  .wp__tb-btn--disabled svg {
    filter: grayscale(100%);
    opacity: 0.45;
  }
  .wp__glyph {
    font-family: 'Times New Roman', serif;
    font-size: 13px;
    line-height: 1;
  }
  .wp__tb-sep {
    width: 1px;
    height: 20px;
    background: #d8d2bd;
    margin: 0 3px;
    flex-shrink: 0;
  }

  .wp__font-select {
    width: 160px;
    margin-right: 7px;
  }
  .wp__size-select {
    width: 50px;
    margin-right: 7px;
  }
  .wp__script-select {
    width: 120px;
  }

  .wp__color-wrap {
    position: relative;
    display: inline-flex;
  }
  .wp__color-btn {
    width: 32px;
    gap: 1px;
  }
  .wp__color-a {
    font-size: 11px;
    font-weight: bold;
    line-height: 9px;
  }
  .wp__color-bar {
    position: absolute;
    left: 4px;
    bottom: 4px;
    width: 13px;
    height: 3px;
  }
  .wp__color-chevron {
    font-size: 7px;
    margin-left: 2px;
  }
  .wp__color-pop {
    position: absolute;
    top: 23px;
    left: 0;
    z-index: 10;
    display: grid;
    grid-template-columns: repeat(4, 16px);
    gap: 2px;
    padding: 4px;
    background: #fff;
    border: 1px solid #808080;
    box-shadow: 2px 2px 3px rgba(0, 0, 0, 0.3);
  }
  .wp__color-swatch {
    width: 16px;
    height: 14px;
    border: 1px solid #808080;
    padding: 0;
    cursor: default;
  }

  .wp__ruler {
    position: relative;
    height: 17px;
    flex-shrink: 0;
    background: #fff;
    border-bottom: 1px solid #d8d2bd;
    overflow: hidden;
    /* minor ticks every 12px along the bottom */
    background-image: repeating-linear-gradient(
      to right,
      transparent 0,
      transparent 11px,
      #9aa7bd 11px,
      #9aa7bd 12px
    );
    background-size: 100% 5px;
    background-position: 0 bottom;
    background-repeat: no-repeat;
  }
  .wp__ruler-num {
    position: absolute;
    top: 1px;
    font-size: 9px;
    color: #4d5a6b;
  }

  .wp__editor {
    flex: auto;
    background: #fff;
    border: 1px solid #96abff;
    border-top: none;
    outline: none;
    overflow-y: auto;
    padding: 8px 10px;
    font-family: Arial, sans-serif;
    font-size: 13px;
    line-height: 1.25;
    user-select: text;
    cursor: text;
  }

  .wp__statusbar {
    height: 20px;
    flex-shrink: 0;
    background: #edede5;
    display: flex;
    gap: 2px;
    padding: 2px;
    font-size: 11px;
    box-sizing: border-box;
  }
  .wp__status-panel {
    flex: 1;
    padding: 0 5px;
    display: flex;
    align-items: center;
    border: 1px solid;
    border-color: #9d9c8f #fff #fff #9d9c8f;
  }
  .wp__status-panel--end {
    max-width: 120px;
  }
`;


