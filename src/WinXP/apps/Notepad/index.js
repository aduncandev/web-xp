import React, { useState, useRef } from 'react';
import styled from 'styled-components';

import { WindowDropDowns } from 'components';
import dropDownData from './dropDownData';

export default function Notepad({ onClose }) {
  const [docText, setDocText] = useState('');
  const [wordWrap, setWordWrap] = useState(false);
  const [showStatusBar, setShowStatusBar] = useState(false);
  const [cursorPos, setCursorPos] = useState({ col: 1, line: 1 });

  // Ref for the invisible file input
  const fileInputRef = useRef(null);

  function onClickOptionItem(item) {
    switch (item) {
      case 'Exit':
        onClose();
        break;
      case 'New':
        setDocText('');
        break;
      case 'Open...':
        fileInputRef.current.click();
        break;
      case 'Save':
      case 'Save As...':
        downloadFile();
        break;
      case 'Word Wrap':
        setWordWrap(!wordWrap);
        break;
      case 'Status Bar':
        setShowStatusBar(!showStatusBar);
        break;
      case 'Time/Date':
        const date = new Date();
        const timeString = `${date.toLocaleTimeString()} ${date.toLocaleDateString()}`;
        // Insert at end for simplicity, or could insert at cursor
        setDocText(prev => prev + timeString);
        break;
      case 'About Notepad':
        alert(
          'Notepad for Windows XP\nVersion 2026 (Web Remake)\n\nCreated by you!',
        );
        break;
      default:
    }
  }

  // Handle file opening
  const onFileChange = event => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = e => {
        setDocText(e.target.result);
      };
      reader.readAsText(file);
    }
    // Reset input so you can open the same file twice if needed
    event.target.value = null;
  };

  // Handle file saving
  const downloadFile = () => {
    const blob = new Blob([docText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'Untitled.txt';
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Calculate cursor position for Status Bar
  const updateCursorPos = e => {
    const val = e.target.value;
    const sel = e.target.selectionStart;

    // Split text up to the selection point to count lines
    const lines = val.substr(0, sel).split('\n');
    const currentLine = lines.length;
    // Length of the last line segment is the column
    const currentCol = lines[lines.length - 1].length + 1;

    setCursorPos({ line: currentLine, col: currentCol });
  };

  function onTextAreaKeyDown(e) {
    // Update cursor immediately on navigation keys
    updateCursorPos(e);

    // handle tabs in text area
    if (e.which === 9) {
      e.preventDefault();
      e.persist();
      var start = e.target.selectionStart;
      var end = e.target.selectionEnd;
      const newText = `${docText.substring(0, start)}\t${docText.substring(
        end,
      )}`;
      setDocText(newText);

      // asynchronously update textarea selection to include tab
      requestAnimationFrame(() => {
        e.target.selectionStart = start + 1;
        e.target.selectionEnd = start + 1;
        // Update cursor again after insertion
        updateCursorPos({
          target: { value: newText, selectionStart: start + 1 },
        });
      });
    }
  }

  return (
    <Div>
      {/* Hidden File Input */}
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
  background: #edede5; /* Solid XP gray usually better than gradient for notepad, but keep preference */
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
  border-top: none; /* Merges slightly better with toolbar */
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
