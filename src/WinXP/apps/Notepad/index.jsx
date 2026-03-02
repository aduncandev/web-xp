import React, { useState, useRef, useEffect, useCallback } from 'react';
import styled from 'styled-components';

import { WindowDropDowns } from 'components';
import dropDownData from './dropDownData';
import { useVFS } from '../../../context/VFSContext';
import { useDialog } from '../../../context/DialogContext';
import { getBaseName } from '../../../context/vfsUtils';
import { SPECIAL_FOLDERS } from '../../../context/vfsDefaults';

const MY_DOCS_PATH = SPECIAL_FOLDERS['My Documents'];

export default function Notepad({ onClose, onSetTitle, filePath: initialFilePath }) {
  const vfs = useVFS();
  const dialog = useDialog();

  const [docText, setDocText] = useState('');
  const [wordWrap, setWordWrap] = useState(false);
  const [showStatusBar, setShowStatusBar] = useState(false);
  const [cursorPos, setCursorPos] = useState({ col: 1, line: 1 });
  const [currentFilePath, setCurrentFilePath] = useState(initialFilePath || null);

  // Ref for the invisible file input (native File API fallback)
  const fileInputRef = useRef(null);

  const getTitle = useCallback(() => {
    if (currentFilePath) {
      return getBaseName(currentFilePath);
    }
    return 'Untitled';
  }, [currentFilePath]);

  // Update window title when file path changes
  useEffect(() => {
    if (onSetTitle) {
      onSetTitle(`${getTitle()} - Notepad`);
    }
  }, [getTitle, onSetTitle]);

  // Load file from VFS on mount if filePath is provided
  useEffect(() => {
    if (initialFilePath) {
      const node = vfs.readFile(initialFilePath);
      if (node && node.type === 'file') {
        setDocText(node.content || '');
        setCurrentFilePath(initialFilePath);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save to VFS
  const saveToVFS = useCallback(async () => {
    if (currentFilePath) {
      vfs.writeFile(currentFilePath, docText);
    } else {
      const name = await dialog.prompt({
        title: 'Save As',
        message: 'Enter filename:',
        defaultValue: 'Untitled.txt',
      });
      if (name) {
        const path = `${MY_DOCS_PATH}/${name}`;
        vfs.writeFile(path, docText);
        setCurrentFilePath(path);
      }
    }
  }, [currentFilePath, docText, vfs, dialog]);

  async function onClickOptionItem(item) {
    switch (item) {
      case 'Exit':
        onClose();
        break;
      case 'New':
        setDocText('');
        setCurrentFilePath(null);
        break;
      case 'Open...':
        fileInputRef.current.click();
        break;
      case 'Save':
        saveToVFS();
        break;
      case 'Save As...':
        {
          const name = await dialog.prompt({
            title: 'Save As',
            message: 'Enter filename:',
            defaultValue: getTitle(),
          });
          if (name) {
            const path = `${MY_DOCS_PATH}/${name}`;
            vfs.writeFile(path, docText);
            setCurrentFilePath(path);
          }
        }
        break;
      case 'Word Wrap':
        setWordWrap(!wordWrap);
        break;
      case 'Status Bar':
        setShowStatusBar(!showStatusBar);
        break;
      case 'Time/Date':
        {
          const date = new Date();
          const timeString = `${date.toLocaleTimeString()} ${date.toLocaleDateString()}`;
          setDocText(prev => prev + timeString);
        }
        break;
      case 'About Notepad':
        await dialog.alert({
          title: 'About Notepad',
          message: 'Notepad for Windows XP\nVersion 2026 (Web Remake)\n\nCreated by you!',
          icon: 'info',
        });
        break;
      default:
    }
  }

  const onFileChange = event => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = e => {
        setDocText(e.target.result);
        setCurrentFilePath(null);
      };
      reader.readAsText(file);
    }
    event.target.value = null;
  };

  const updateCursorPos = e => {
    const val = e.target.value;
    const sel = e.target.selectionStart;
    const lines = val.substr(0, sel).split('\n');
    const currentLine = lines.length;
    const currentCol = lines[lines.length - 1].length + 1;
    setCursorPos({ line: currentLine, col: currentCol });
  };

  function onTextAreaKeyDown(e) {
    updateCursorPos(e);

    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveToVFS();
      return;
    }

    if (e.which === 9) {
      e.preventDefault();
      e.persist();
      var start = e.target.selectionStart;
      var end = e.target.selectionEnd;
      const newText = `${docText.substring(0, start)}\t${docText.substring(end)}`;
      setDocText(newText);

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
    <Div>
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept=".txt"
        onChange={onFileChange}
      />

      <section className="np__toolbar">
        <WindowDropDowns items={dropDownData} onClickItem={onClickOptionItem} />
      </section>

      <StyledTextarea
        wordWrap={wordWrap}
        value={docText}
        onChange={e => {
          setDocText(e.target.value);
          updateCursorPos(e);
        }}
        onKeyDown={onTextAreaKeyDown}
        onKeyUp={updateCursorPos}
        onClick={updateCursorPos}
        spellCheck={false}
      />

      {showStatusBar && (
        <StatusBar>
          <div className="left" />
          <div className="right">
            Ln {cursorPos.line}, Col {cursorPos.col}
          </div>
        </StatusBar>
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
  ${props => (props.wordWrap ? '' : 'white-space: nowrap; overflow-x: scroll;')}
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
