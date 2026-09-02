import React from 'react';
import styled from 'styled-components';

function HeaderButtons({
  buttons,
  onMaximize,
  onMinimize,
  onClose,
  onHelp,
  maximized,
  resizable,
  className,
}) {
  const buttonElements = {
    help: (
      <button
        key="help"
        className="header__button header__button--help"
        onMouseUp={onHelp}
      />
    ),
    minimize: (
      <button
        key="minimize"
        className="header__button header__button--minimize"
        onMouseUp={onMinimize}
      />
    ),
    maximize: (
      <button
        key="maximize"
        className={`header__button ${
          maximized ? 'header__button--maximized' : 'header__button--maximize'
        } ${resizable ? '' : 'header__button--disable'}`}
        onMouseUp={onMaximize}
      />
    ),
    close: (
      <button
        key="close"
        className="header__button header__button--close"
        onMouseUp={onClose}
      />
    ),
  };

  return (
    <div className={`${className} header__buttons`}>
      {buttons ? (
        buttons.map(b => buttonElements[b])
      ) : (
        <>
          {buttonElements.minimize}
          {buttonElements.maximize}
          {buttonElements.close}
        </>
      )}
    </div>
  );
}

// State strips run normal, hot, pressed, disabled for an active window,
// then the same four for an inactive one
const state = (isFocus, n) => (isFocus ? n : n + 4);
const part = (kind, n) => `var(--xp-p-window-${kind}-${n}, none)`;
const glyph = (kind, n) => `var(--xp-g-window-${kind}-${n}, none)`;
const button = (cls, kind, isFocus) => `
  .header__button--${cls} {
    border-image: ${part(kind, state(isFocus, 1))};
  }
  .header__button--${cls}::after {
    background-image: ${glyph(kind, state(isFocus, 1))};
  }
  .header__button--${cls}:hover {
    border-image: ${part(kind, state(isFocus, 2))};
  }
  .header__button--${cls}:hover::after {
    background-image: ${glyph(kind, state(isFocus, 2))};
  }
  .header__button--${cls}:hover:active {
    border-image: ${part(kind, state(isFocus, 3))};
  }
  .header__button--${cls}:hover:active::after {
    background-image: ${glyph(kind, state(isFocus, 3))};
  }
  .header__button--${cls}.header__button--disable,
  .header__button--${cls}.header__button--disable:hover {
    border-image: ${part(kind, state(isFocus, 4))};
  }
  .header__button--${cls}.header__button--disable::after,
  .header__button--${cls}.header__button--disable:hover::after {
    background-image: ${glyph(kind, state(isFocus, 4))};
  }
`;

export default styled(HeaderButtons)`
  height: 21px;
  display: flex;
  align-items: center;
  align-self: flex-start;
  /* 5px from the window's top, 6px from its right (the style's offsets) */
  margin-top: 1px;
  margin-right: 2px;
  gap: 3px;
  .header__button {
    position: relative;
    width: 21px;
    height: 21px;
    padding: 0;
    border: 0 solid transparent;
    background: transparent;
    image-rendering: pixelated;
    cursor: default;
  }
  /* the glyph sits above the face: a border-image paints over any background */
  .header__button::after {
    content: '';
    position: absolute;
    inset: 0;
    background-repeat: no-repeat;
    background-position: center;
    image-rendering: pixelated;
    pointer-events: none;
  }
  .header__button--disable {
    outline: none;
  }
  ${({ isFocus }) => button('minimize', 'minbutton', isFocus)}
  ${({ isFocus }) => button('maximize', 'maxbutton', isFocus)}
  ${({ isFocus }) => button('maximized', 'restorebutton', isFocus)}
  ${({ isFocus }) => button('close', 'closebutton', isFocus)}
  ${({ isFocus }) => button('help', 'helpbutton', isFocus)}
`;
