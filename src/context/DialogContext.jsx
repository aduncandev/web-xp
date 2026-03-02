import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import styled from 'styled-components';

import errorIcon from 'assets/windowsIcons/897(32x32).png';

const DialogContext = createContext();

export const useDialog = () => useContext(DialogContext);

/**
 * XP-style dialog system. Renders above windows but below the power-off modal.
 * Promise-based API:
 *   confirm({ title, message, icon }) → Promise<boolean>
 *   alert({ title, message, icon })   → Promise<void>
 *   prompt({ title, message, defaultValue }) → Promise<string|null>
 */
export function DialogProvider({ children }) {
  const [dialogs, setDialogs] = useState([]);
  const idRef = useRef(0);

  const removeDialog = useCallback(id => {
    setDialogs(prev => prev.filter(d => d.id !== id));
  }, []);

  const confirm = useCallback(({ title = 'Confirm', message = '', icon = 'question' } = {}) => {
    return new Promise(resolve => {
      const id = ++idRef.current;
      setDialogs(prev => [...prev, {
        id, type: 'confirm', title, message, icon, resolve,
      }]);
    });
  }, []);

  const alert = useCallback(({ title = 'Alert', message = '', icon = 'info' } = {}) => {
    return new Promise(resolve => {
      const id = ++idRef.current;
      setDialogs(prev => [...prev, {
        id, type: 'alert', title, message, icon, resolve,
      }]);
    });
  }, []);

  const prompt = useCallback(({ title = 'Input', message = '', defaultValue = '' } = {}) => {
    return new Promise(resolve => {
      const id = ++idRef.current;
      setDialogs(prev => [...prev, {
        id, type: 'prompt', title, message, defaultValue, resolve,
      }]);
    });
  }, []);

  return (
    <DialogContext.Provider value={{ confirm, alert, prompt }}>
      {children}
      {dialogs.length > 0 && ReactDOM.createPortal(
        dialogs.map(d => (
          <DialogOverlay key={d.id}>
            <DialogRenderer dialog={d} onDone={(id, result) => {
              d.resolve(result);
              removeDialog(id);
            }} />
          </DialogOverlay>
        )),
        document.body,
      )}
    </DialogContext.Provider>
  );
}

function DialogRenderer({ dialog, onDone }) {
  const { id, type, title, message, icon, defaultValue } = dialog;
  const [inputValue, setInputValue] = React.useState(defaultValue || '');
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    if (type === 'prompt' && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [type]);

  const iconSrc = icon === 'error' ? errorIcon : null;

  const handleYes = () => onDone(id, true);
  const handleNo = () => onDone(id, false);
  const handleOk = () => onDone(id, type === 'prompt' ? inputValue : undefined);
  const handleCancel = () => onDone(id, type === 'prompt' ? null : undefined);

  const handleKeyDown = e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (type === 'confirm') handleYes();
      else handleOk();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (type === 'confirm') handleNo();
      else handleCancel();
    }
  };

  return (
    <DialogBox onKeyDown={handleKeyDown}>
      <div className="dialog-titlebar">{title}</div>
      <div className="dialog-body">
        <div className="dialog-icon-area">
          {iconSrc ? (
            <img src={iconSrc} alt="" className="dialog-icon-img" />
          ) : icon === 'question' ? (
            <QuestionIcon>?</QuestionIcon>
          ) : (
            <InfoIcon>i</InfoIcon>
          )}
        </div>
        <div className="dialog-message">
          {message.split('\n').map((line, i) => (
            <React.Fragment key={i}>
              {i > 0 && <br />}
              {line}
            </React.Fragment>
          ))}
        </div>
      </div>
      {type === 'prompt' && (
        <div className="dialog-input-area">
          <input
            ref={inputRef}
            className="dialog-input"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); handleOk(); }
              if (e.key === 'Escape') { e.preventDefault(); handleCancel(); }
            }}
          />
        </div>
      )}
      <div className="dialog-buttons">
        {type === 'confirm' ? (
          <>
            <button className="dialog-btn" onClick={handleYes} autoFocus>Yes</button>
            <button className="dialog-btn" onClick={handleNo}>No</button>
          </>
        ) : type === 'prompt' ? (
          <>
            <button className="dialog-btn" onClick={handleOk}>OK</button>
            <button className="dialog-btn" onClick={handleCancel}>Cancel</button>
          </>
        ) : (
          <button className="dialog-btn" onClick={handleOk} autoFocus>OK</button>
        )}
      </div>
    </DialogBox>
  );
}

const DialogOverlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: transparent;
  z-index: 9998;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const DialogBox = styled.div`
  background: #ece9d8;
  border: 2px solid #0054e3;
  border-radius: 4px;
  min-width: 340px;
  max-width: 450px;
  box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.3);
  font-family: Tahoma, 'Noto Sans', sans-serif;
  font-size: 11px;

  .dialog-titlebar {
    background: linear-gradient(to right, #0058ee, #3593ff);
    color: white;
    font-weight: bold;
    font-size: 12px;
    padding: 4px 8px;
    border-radius: 2px 2px 0 0;
  }

  .dialog-body {
    display: flex;
    align-items: flex-start;
    padding: 16px 12px 8px;
    gap: 12px;
  }

  .dialog-icon-area {
    flex-shrink: 0;
  }

  .dialog-icon-img {
    width: 32px;
    height: 32px;
  }

  .dialog-message {
    line-height: 1.4;
    padding-top: 4px;
    word-break: break-word;
  }

  .dialog-input-area {
    padding: 0 12px 8px;
  }

  .dialog-input {
    width: 100%;
    box-sizing: border-box;
    padding: 2px 4px;
    font-family: Tahoma, 'Noto Sans', sans-serif;
    font-size: 11px;
    border: 1px solid #7f9db9;
  }

  .dialog-buttons {
    display: flex;
    justify-content: center;
    gap: 8px;
    padding: 4px 12px 12px;
  }

  .dialog-btn {
    min-width: 75px;
    padding: 2px 12px;
    font-family: Tahoma, 'Noto Sans', sans-serif;
    font-size: 11px;
    background: #ece9d8;
    border: 1px solid #003c74;
    border-radius: 3px;
    cursor: pointer;
    &:hover { background: #d4d0c8; }
    &:active { background: #c0bcb0; }
    &:focus { outline: 1px dotted #000; outline-offset: -3px; }
  }
`;

const QuestionIcon = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #316ac5;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: bold;
`;

const InfoIcon = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #316ac5;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: bold;
  font-style: italic;
`;
