import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';

import { POWER_ACTION, POWER_STATE } from 'WinXP/constants';
import XPButton from 'components/XPButton';
import { getArt } from '../../xpArt';

import windowsLogo from 'assets/windowsIcons/windows-off.png';
import offIcon from 'assets/windowsIcons/310(32x32).png';
import restartIcon from 'assets/windowsIcons/restart.ico';
import lockIcon from 'assets/windowsIcons/546(32x32).png';
import switcherIcon from 'assets/windowsIcons/switchuser.png';

// Real msgina.dll orb bitmaps win when dropped into src/assets/xp/
const standbyOrb = getArt('power-standby', offIcon);
const turnOffOrb = getArt('power-turnoff', offIcon);
const restartOrb = getArt('power-restart', restartIcon);
const switchUserOrb = getArt('power-switchuser', switcherIcon);
const logOffOrb = getArt('power-logoff', lockIcon);

/** The Turn Off Computer / Log Off Windows dialog; onClickButton gets a POWER_ACTION. */
function Modal(props) {
  return createPortal(
    <StyledContainer>
      <Menu {...props} />
    </StyledContainer>,
    document.body,
  );
}

const Container = ({ className, children }) => {
  function noop(e) {
    e.preventDefault();
    e.stopPropagation();
  }
  return (
    <div
      className={className}
      onMouseMove={noop}
      onClick={noop}
      onMouseDown={noop}
      onMouseUp={noop}
    >
      {children}
    </div>
  );
};

const Menu = ({ mode, onClose, onClickButton }) => {
  function getHeaderText() {
    if (mode === POWER_STATE.LOG_OFF) {
      return 'Log Off Windows';
    } else if (mode === POWER_STATE.TURN_OFF) {
      return 'Turn off computer';
    }
    return 'System Action';
  }

  useEffect(() => {
    function onKeyDown(e) {
      let handled = true;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (key === 'Escape') {
        onClose();
      } else if (mode === POWER_STATE.TURN_OFF) {
        if (key === 'Enter' || key === 'u' || key === 't')
          onClickButton(POWER_ACTION.TURN_OFF);
        else if (key === 'r') onClickButton(POWER_ACTION.RESTART);
        else handled = false;
      } else if (mode === POWER_STATE.LOG_OFF) {
        if (key === 'Enter' || key === 'l') onClickButton(POWER_ACTION.LOG_OFF);
        else if (key === 's') onClickButton(POWER_ACTION.SWITCH_USER);
        else handled = false;
      } else {
        handled = false;
      }
      if (handled) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [mode, onClose, onClickButton]);

  function renderButtons() {
    if (mode === POWER_STATE.TURN_OFF) {
      return (
        <>
          <ButtonDisabled img={standbyOrb} text="Stand By" underline={0} />
          <Button
            img={turnOffOrb}
            text="Turn Off"
            underline={1}
            action={POWER_ACTION.TURN_OFF}
            onClick={onClickButton}
          />
          <Button
            img={restartOrb}
            text="Restart"
            underline={0}
            action={POWER_ACTION.RESTART}
            onClick={onClickButton}
          />
        </>
      );
    }
    return (
      <>
        <Button
          img={switchUserOrb}
          text="Switch User"
          underline={0}
          action={POWER_ACTION.SWITCH_USER}
          onClick={onClickButton}
        />
        <Button
          img={logOffOrb}
          text="Log Off"
          underline={0}
          action={POWER_ACTION.LOG_OFF}
          onClick={onClickButton}
        />
      </>
    );
  }

  return (
    <div className="modal">
      <header className="header">
        <span className="header__text">{getHeaderText()}</span>
        <img src={windowsLogo} alt="Windows" className="header__img" />
      </header>
      <div className="content">{renderButtons()}</div>
      <footer className="footer">
        <XPButton onClick={onClose} className="footer__button">
          Cancel
        </XPButton>
      </footer>
    </div>
  );
};

const ButtonText = ({ text, underline }) => (
  <span className="button-text">
    {underline == null ? (
      text
    ) : (
      <>
        {text.slice(0, underline)}
        <u>{text.charAt(underline)}</u>
        {text.slice(underline + 1)}
      </>
    )}
  </span>
);

const Button = ({ style, img, text, underline, action, onClick }) => {
  function _onClick() {
    if (onClick) {
      onClick(action);
    }
  }
  // Like real XP, both the icon and its label are clickable
  return (
    <div className="button-container" onClick={_onClick}>
      <img style={{ ...style }} src={img} alt={text} className="button-img" />
      <ButtonText text={text} underline={underline} />
    </div>
  );
};

const ButtonDisabled = ({ img, text, underline }) => (
  <div className="button-container disable">
    <img src={img} alt={text} className="button-img" />
    <ButtonText text={text} underline={underline} />
  </div>
);

const StyledContainer = styled(Container)`
  font-family: Tahoma, 'Noto Sans', sans-serif;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  .modal {
    margin-top: 30vh;
    width: 300px;
    height: 190px;
    border: 1px solid black;
    display: flex;
    flex-direction: column;
  }
  .header {
    height: 42px;
    display: flex;
    padding-left: 10px;
    align-items: center;
    background: #092178;
  }
  .header__text {
    font-size: 21px;
    font-family: 'Franklin Gothic Medium', 'Franklin Gothic', 'Trebuchet MS',
      Tahoma, sans-serif;
    color: #fff;
    flex: 1;
  }
  .header__img {
    width: auto;
    height: 30px;
    margin-right: 5px;
  }
  .content {
    flex: 1;
    background: linear-gradient(
      to right,
      #3349e0 0%,
      #617ee6 47%,
      #617ee6 53%,
      #3349e0 100%
    );
    display: flex;
    align-items: center;
    justify-content: space-around;
    padding: 0 30px;
    position: relative;
    &:before {
      content: '';
      display: block;
      position: absolute;
      height: 2px;
      top: 0;
      left: 0;
      right: 0;
      background: linear-gradient(
        to right,
        transparent 0,
        rgba(255, 255, 255, 0.3) 40%,
        rgba(255, 255, 255, 0.3) 60%,
        transparent 100%
      );
    }
  }
  .button-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    color: #fff;
    &.disable {
      .button-img {
        filter: grayscale(1) brightness(1.15);
        &:hover {
          filter: grayscale(1) brightness(1.15);
        }
        &:hover:active {
          filter: grayscale(1) brightness(1.15);
        }
      }
    }
  }
  .button-img {
    height: 33px;
    width: 33px;
    &:hover {
      filter: brightness(1.1);
    }
    &:hover:active {
      filter: brightness(0.7);
    }
  }
  .button-text {
    padding-top: 3px;
    font-weight: bold;
    font-size: 11px;
  }
  .footer {
    height: 42px;
    background: #092178;
    display: flex;
    justify-content: flex-end;
    align-items: center;
  }
  .footer__button {
    margin-right: 10px;
  }
`;

export default Modal;
