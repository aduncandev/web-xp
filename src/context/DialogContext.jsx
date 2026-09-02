import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import styled from 'styled-components';

import XPDialogFrame from 'components/XPDialogFrame';
import XPButton from 'components/XPButton';
import useEditContextMenu from 'components/EditContextMenu';
import { playSystemSound } from 'WinXP/sounds';

import errorIconDrawn from 'assets/windowsIcons/897(32x32).png';
import questionIcon from 'assets/windowsIcons/747(32x32).png';
import warningIconDrawn from 'assets/windowsIcons/msg-warning.svg';
import infoIconDrawn from 'assets/windowsIcons/msg-info.svg';
import { getArt } from '../xpArt';

// Real user32.dll icons win when dropped into src/assets/xp/
const errorIcon = getArt('msg-error', errorIconDrawn);
const warningIcon = getArt('msg-warning', warningIconDrawn);
const infoIcon = getArt('msg-info', infoIconDrawn);

const ICON_SRC = {
  error: errorIcon,
  warning: warningIcon,
  question: questionIcon,
  info: infoIcon,
};
// Each message box icon has its stock sound in the XP scheme
const SOUND_FOR_ICON = {
  error: 'error',
  warning: 'exclamation',
  question: 'ding',
  info: 'ding',
};

const DialogContext = createContext(null);

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used within a DialogProvider');
  return ctx;
}

export function DialogProvider({ children }) {
  const [dialogs, setDialogs] = useState([]);
  const dialogsRef = useRef(dialogs);
  dialogsRef.current = dialogs;
  const idRef = useRef(0);

  const push = useCallback(
    spec =>
      new Promise(resolve => {
        idRef.current += 1;
        setDialogs(ds => [...ds, { ...spec, id: idRef.current, resolve }]);
      }),
    [],
  );

  const close = useCallback((id, result) => {
    const d = dialogsRef.current.find(x => x.id === id);
    setDialogs(ds => ds.filter(x => x.id !== id));
    if (d) d.resolve(result);
  }, []);

  const confirm = useCallback(
    (message, title = 'Confirm', opts = {}) =>
      push({ type: 'confirm', message, title, icon: opts.icon || 'question' }),
    [push],
  );

  const alert = useCallback(
    (message, title = 'Alert', opts = {}) =>
      push({ type: 'alert', message, title, icon: opts.icon || 'warning' }),
    [push],
  );

  const prompt = useCallback(
    (message, defaultValue = '', title = 'Input', opts = {}) =>
      push({
        type: 'prompt',
        message,
        title,
        defaultValue,
        icon: opts.icon || 'none',
      }),
    [push],
  );

  /** Yes/No/Cancel prompt. Resolves 'yes' | 'no' | 'cancel'. */
  const confirm3 = useCallback(
    (message, title = 'Confirm', opts = {}) =>
      push({ type: 'confirm3', message, title, icon: opts.icon || 'question' }),
    [push],
  );

  return (
    <DialogContext.Provider value={{ confirm, alert, prompt, confirm3 }}>
      {children}
      {dialogs.map((d, i) => (
        <MessageBox
          key={d.id}
          dialog={d}
          zIndex={99992 + i}
          onResult={result => close(d.id, result)}
        />
      ))}
    </DialogContext.Provider>
  );
}

/*
 * A key press is keydown, keypress, keyup. Enter in a Save As name field opens
 * the "already exists" box on keydown and Chromium activates the freshly
 * focused default button on the keypress, so a new box ignores Enter briefly.
 */
const OPENING_KEYSTROKE_MS = 300;

function MessageBox({ dialog, zIndex, onResult }) {
  const [inputValue, setInputValue] = useState(dialog.defaultValue || '');
  const inputRef = useRef(null);
  const defaultBtnRef = useRef(null);
  const openedAt = useRef(performance.now());
  const { openEditContextMenu, editContextMenu } = useEditContextMenu();

  useEffect(() => {
    const sound = SOUND_FOR_ICON[dialog.icon];
    if (sound) playSystemSound(sound);
    if (dialog.type === 'prompt' && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    } else if (defaultBtnRef.current) {
      defaultBtnRef.current.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const swallowOpeningKeystroke = e => {
    if (
      e.key === 'Enter' &&
      performance.now() - openedAt.current < OPENING_KEYSTROKE_MS
    ) {
      e.preventDefault();
    }
  };

  const accept = () => {
    if (dialog.type === 'confirm') onResult(true);
    else if (dialog.type === 'confirm3') onResult('yes');
    else if (dialog.type === 'prompt') onResult(inputValue);
    else onResult(undefined);
  };
  const cancel = () => {
    if (dialog.type === 'confirm') onResult(false);
    else if (dialog.type === 'confirm3') onResult('cancel');
    else if (dialog.type === 'prompt') onResult(null);
    else onResult(undefined);
  };

  const handleKeyDown = e => {
    if (e.key === 'Enter') {
      // Focused buttons handle Enter natively as a click
      if (e.target.tagName !== 'BUTTON') {
        e.preventDefault();
        accept();
      }
    } else if (e.key === 'Escape') {
      cancel();
    }
  };

  const iconSrc = ICON_SRC[dialog.icon];

  return (
    <XPDialogFrame
      title={dialog.title}
      onClose={cancel}
      zIndex={zIndex}
      onKeyDown={handleKeyDown}
    >
      <BoxBody onKeyPress={swallowOpeningKeystroke}>
        <div className="msg-main">
          {iconSrc && <img src={iconSrc} alt="" className="msg-icon" />}
          <div className="msg-text">
            <div className="msg-message">{dialog.message}</div>
            {dialog.type === 'prompt' && (
              <input
                ref={inputRef}
                className="msg-input"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onContextMenu={openEditContextMenu}
                spellCheck={false}
              />
            )}
          </div>
        </div>
        <div className="msg-buttons">
          {dialog.type === 'confirm' && (
            <>
              <XPButton ref={defaultBtnRef} onClick={() => onResult(true)}>
                Yes
              </XPButton>
              <XPButton onClick={() => onResult(false)}>No</XPButton>
            </>
          )}
          {dialog.type === 'confirm3' && (
            <>
              <XPButton ref={defaultBtnRef} onClick={() => onResult('yes')}>
                Yes
              </XPButton>
              <XPButton onClick={() => onResult('no')}>No</XPButton>
              <XPButton onClick={() => onResult('cancel')}>Cancel</XPButton>
            </>
          )}
          {dialog.type === 'alert' && (
            <XPButton ref={defaultBtnRef} onClick={() => onResult(undefined)}>
              OK
            </XPButton>
          )}
          {dialog.type === 'prompt' && (
            <>
              <XPButton
                ref={defaultBtnRef}
                onClick={() => onResult(inputValue)}
              >
                OK
              </XPButton>
              <XPButton onClick={() => onResult(null)}>Cancel</XPButton>
            </>
          )}
        </div>
        {editContextMenu}
      </BoxBody>
    </XPDialogFrame>
  );
}

const BoxBody = styled.div`
  min-width: 320px;
  max-width: 460px;

  .msg-main {
    display: flex;
    padding: 14px 14px 8px;
    min-height: 48px;
  }
  .msg-icon {
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    margin-right: 14px;
  }
  .msg-text {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-width: 0;
  }
  .msg-message {
    line-height: 16px;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .msg-input {
    margin-top: 8px;
    height: 20px;
    border: 1px solid #7f9db9;
    padding: 0 4px;
    font-family: Tahoma, 'Noto Sans', sans-serif;
    font-size: 11px;
    outline: none;
    &:focus {
      border-color: #316ac5;
    }
  }
  .msg-buttons {
    display: flex;
    justify-content: center;
    gap: 6px;
    padding: 10px 14px 12px;
  }
`;
