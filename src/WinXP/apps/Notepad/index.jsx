import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import styled from 'styled-components';

import { WindowDropDowns } from 'components';
import FileDialog from '../../../components/FileDialog';
import useEditContextMenu from '../../../components/EditContextMenu';
import { useVFS } from '../../../context/VFSContext';
import { useExplorerView } from '../../shell/useExplorerView';
import { useDialog } from '../../../context/DialogContext';
import { SPECIAL_FOLDERS } from '../../../context/vfsConstants';
import { getBaseName } from '../../../context/vfsUtils';
import { displayName } from '../../shell/fileTypes';
import dropDownData from './dropDownData';

const NOTEPAD_FILTERS = [
  {
    label: 'Text Documents (*.txt)',
    extensions: ['.txt', '.log', '.ini', '.cfg'],
  },
  { label: 'All Files (*.*)', extensions: null },
];

export default function Notepad({
  onClose,
  onSetHeader,
  registerCloseInterceptor,
  filePath,
}) {
  const vfs = useVFS();
  const dlg = useDialog();

  const [currentPath, setCurrentPath] = useState(null);
  const [docText, setDocText] = useState('');
  const [dirty, setDirty] = useState(false);
  const [wordWrap, setWordWrap] = useState(false);
  const [showStatusBar, setShowStatusBar] = useState(false);
  const [cursorPos, setCursorPos] = useState({ col: 1, line: 1 });
  const [fileDialog, setFileDialog] = useState(null); // { mode, resolve }
  const textareaRef = useRef(null);
  const { openEditContextMenu, editContextMenu } = useEditContextMenu();

  // 'Hide extensions for known file types' — XP default is on
  const { hideExt } = useExplorerView();

  // Shell display name of the open document ('notes', not 'notes.txt')
  const fileTitle = currentPath
    ? displayName(vfs.getNode(currentPath), hideExt) || getBaseName(currentPath)
    : 'Untitled';

  // --- Window title follows the open document ---
  useEffect(() => {
    if (onSetHeader) onSetHeader({ title: `${fileTitle} - Notepad` });
  }, [fileTitle, onSetHeader]);

  // Notepad opens ANYTHING, like the real one: text loads as-is, binary
  // content decodes to the familiar garbage instead of failing.
  const readAnyAsText = useCallback(
    async path => {
      const content = vfs.readFile(path);
      if (content != null) return content;
      const node = vfs.getNode(path);
      if (node && node.hasBinaryContent) {
        try {
          const blob = await vfs.readBinaryFile(path);
          if (blob) return await blob.text();
        } catch {
          // unreadable
        }
      }
      return null;
    },
    [vfs],
  );

  // --- Load injected file (double-clicked in Explorer / desktop) ---
  const loadedInjectedPath = useRef(null);
  useEffect(() => {
    if (!filePath || !vfs.initialized) return;
    if (loadedInjectedPath.current === filePath) return;
    loadedInjectedPath.current = filePath;
    let cancelled = false;
    (async () => {
      const content = await readAnyAsText(filePath);
      if (content != null && !cancelled) {
        setDocText(content);
        setCurrentPath(filePath);
        setDirty(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePath, vfs.initialized]);

  // --- Save machinery ---

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

  /** Save to current path, or prompt for one. Resolves true if saved. */
  const doSave = useCallback(
    async (forceDialog = false) => {
      let targetPath = currentPath;
      if (!targetPath || forceDialog) {
        targetPath = await openSaveDialog();
        if (!targetPath) return false;
      }
      if (vfs.exists(targetPath)) {
        vfs.writeFile(targetPath, docText);
      } else {
        vfs.createFile(targetPath, docText);
      }
      vfs.addRecentDocument(targetPath);
      setCurrentPath(targetPath);
      setDirty(false);
      return true;
    },
    [currentPath, docText, vfs, openSaveDialog],
  );

  /** Ask to save unsaved changes. Resolves true if it's OK to proceed. */
  const confirmDiscard = useCallback(async () => {
    if (!dirty) return true;
    const res = await dlg.confirm3(
      `The text in the ${fileTitle} file has changed.\n\nDo you want to save the changes?`,
      'Notepad',
    );
    if (res === 'cancel') return false;
    if (res === 'no') return true;
    return doSave();
  }, [dirty, dlg, fileTitle, doSave]);

  // Close button (X) asks about unsaved changes too
  const confirmDiscardRef = useRef(confirmDiscard);
  confirmDiscardRef.current = confirmDiscard;
  useEffect(() => {
    if (registerCloseInterceptor) {
      registerCloseInterceptor(() => confirmDiscardRef.current());
    }
  }, [registerCloseInterceptor]);

  const doNew = useCallback(async () => {
    if (!(await confirmDiscard())) return;
    setDocText('');
    setCurrentPath(null);
    setDirty(false);
  }, [confirmDiscard]);

  const doOpen = useCallback(async () => {
    if (!(await confirmDiscard())) return;
    const path = await openOpenDialog();
    if (!path) return;
    const content = await readAnyAsText(path);
    if (content == null) {
      await dlg.alert(
        `Cannot open the ${getBaseName(
          path,
        )} file.\n\nMake sure a text file was selected.`,
        'Notepad',
      );
      return;
    }
    setDocText(content);
    setCurrentPath(path);
    setDirty(false);
    vfs.addRecentDocument(path);
  }, [confirmDiscard, openOpenDialog, vfs, dlg, readAnyAsText]);

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
      case 'Select All':
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.select();
        }
        break;
      case 'Word Wrap':
        setWordWrap(!wordWrap);
        break;
      case 'Status Bar':
        setShowStatusBar(!showStatusBar);
        break;
      case 'Time/Date': {
        const date = new Date();
        const timeString = `${date.toLocaleTimeString()} ${date.toLocaleDateString()}`;
        setDocText(prev => prev + timeString);
        setDirty(true);
        break;
      }
      case 'About Notepad':
        dlg.alert(
          'Notepad for Windows XP\nVersion 2026 (Web Remake)',
          'About Notepad',
        );
        break;
      default:
    }
  }

  // --- Keyboard shortcuts ---
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

  // --- Cursor position for the status bar ---
  const updateCursorPos = e => {
    const val = e.target.value;
    const sel = e.target.selectionStart;
    const lines = val.substr(0, sel).split('\n');
    setCursorPos({
      line: lines.length,
      col: lines[lines.length - 1].length + 1,
    });
  };

  function onTextAreaKeyDown(e) {
    updateCursorPos(e);

    // handle tabs in text area
    if (e.which === 9) {
      e.preventDefault();
      e.persist();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const newText = `${docText.substring(0, start)}\t${docText.substring(
        end,
      )}`;
      setDocText(newText);
      setDirty(true);

      requestAnimationFrame(() => {
        e.target.selectionStart = start + 1;
        e.target.selectionEnd = start + 1;
        updateCursorPos({
          target: { value: newText, selectionStart: start + 1 },
        });
      });
    }
  }

  return (
    <Div onKeyDown={onKeyDownShortcuts}>
      <section className="np__toolbar">
        <WindowDropDowns items={dropDownData} onClickItem={onClickOptionItem} />
      </section>

      <StyledTextarea
        ref={textareaRef}
        $wordWrap={wordWrap}
        value={docText}
        onChange={e => {
          setDocText(e.target.value);
          setDirty(true);
          updateCursorPos(e);
        }}
        onKeyDown={onTextAreaKeyDown}
        onKeyUp={updateCursorPos}
        onClick={updateCursorPos}
        onContextMenu={openEditContextMenu}
        spellCheck={false}
      />
      {editContextMenu}

      {showStatusBar && (
        <StatusBar>
          <div className="left" />
          <div className="right">
            Ln {cursorPos.line}, Col {cursorPos.col}
          </div>
        </StatusBar>
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
                : '*.txt'
              : ''
          }
          filters={NOTEPAD_FILTERS}
          defaultExtension=".txt"
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
  .np__toolbar {
    position: relative;
    height: 21px;
    flex-shrink: 0;
    border-bottom: 1px solid white;
  }
`;

const StyledTextarea = styled.textarea`
  flex: auto;
  outline: none;
  font-family: 'Lucida Console', monospace;
  font-size: 13px;
  line-height: 14px;
  resize: none;
  padding: 2px;
  ${props =>
    props.$wordWrap ? '' : 'white-space: nowrap; overflow-x: scroll;'}
  overflow-y: scroll;
  border: 1px solid #96abff;
  border-top: none;
`;

const StatusBar = styled.div`
  height: 20px;
  background: #edede5;
  border-top: 1px solid #d3d3d3;
  display: flex;
  font-family: Tahoma, sans-serif;
  font-size: 11px;
  padding: 2px;
  box-sizing: border-box;

  .left {
    flex: 1;
    border-right: 1px solid #d3d3d3;
  }

  .right {
    width: 120px;
    padding-left: 5px;
    display: flex;
    align-items: center;
    border-left: 1px solid white;
  }
`;


