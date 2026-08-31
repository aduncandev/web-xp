import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';

import XPButton from 'components/XPButton';

import errorIconDrawn from 'assets/windowsIcons/897(32x32).png';
import warningIconDrawn from 'assets/windowsIcons/msg-warning.svg';
import { getArt } from '../../../xpArt';
import { playSystemSound } from '../../sounds';

// Real user32.dll icons win when dropped into src/assets/xp/
const errorIcon = getArt('msg-error', errorIconDrawn);
const warningIcon = getArt('msg-warning', warningIconDrawn);

const ICON_SRC = {
  error: errorIcon,
  warning: warningIcon,
};
const SOUND_KEY = {
  error: 'error',
  warning: 'exclamation',
};

function lineBreak(str) {
  return str.split('\n').map((s, i) => (
    <p key={i} className="error__message">
      {s}
    </p>
  ));
}

function Error({
  onClose,
  onSetHeader,
  message = "Something's wrong!",
  title,
  iconType = 'error',
}) {
  const defaultBtnRef = useRef(null);
  useEffect(() => {
    // Critical Stop for errors, Exclamation for warnings — once per box
    playSystemSound(SOUND_KEY[iconType] || 'error');
    // Compatibility boxes pass their title via injectProps — reflect it in
    // the window chrome
    if (title && onSetHeader) onSetHeader({ title });
    if (defaultBtnRef.current) defaultBtnRef.current.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') {
      e.preventDefault();
      onClose();
    }
  }

  return (
    <Div tabIndex={-1} onKeyDown={onKeyDown}>
      <div className="error__top">
        <img
          src={ICON_SRC[iconType] || errorIcon}
          alt=""
          className="error__img"
          draggable={false}
        />
        <div className="error__messages">{lineBreak(message)}</div>
      </div>
      <div className="error__bottom">
        <XPButton ref={defaultBtnRef} onClick={onClose}>
          OK
        </XPButton>
      </div>
    </Div>
  );
}

const Div = styled.div`
  background-color: #ece9d8;
  width: 100%;
  height: 100%;
  font-size: 11px;
  display: flex;
  flex-direction: column;
  outline: none;
  .error__top {
    display: flex;
    flex: 1;
    padding: 14px 14px 8px;
    min-height: 48px;
  }
  .error__img {
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    margin-right: 14px;
  }
  .error__messages {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-width: 0;
  }
  .error__message {
    line-height: 16px;
    word-break: break-word;
  }
  .error__bottom {
    display: flex;
    width: 100%;
    justify-content: center;
    padding: 10px 14px 12px;
  }
`;

export default Error;
