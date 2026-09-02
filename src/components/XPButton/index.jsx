import styled from 'styled-components';

/**
 * Luna push button (the standard Windows XP command button).
 *
 * Usage: <XPButton onClick={...}>OK</XPButton>
 * Forward-refs work (styled.button), so autofocusing the default
 * button of a dialog shows the authentic blue focus ring.
 */
const XPButton = styled.button.attrs({ className: 'xp-button' })`
  box-sizing: border-box;
  min-width: 75px;
  height: 23px;
  padding: 0 12px;
  border: 0 solid transparent;
  border-image: var(--xp-p-button-pushbutton-1, none);
  background: var(--xp-button-face, none);
  image-rendering: pixelated;
  font-family: Tahoma, 'Noto Sans', sans-serif;
  font-size: 11px;
  color: var(--xp-window-text, #000);
  cursor: default;
  outline: none;

  &:hover:not(:disabled) {
    border-image: var(--xp-p-button-pushbutton-2, none);
  }
  /* the focused button wears the default ring */
  &:focus:not(:disabled) {
    border-image: var(--xp-p-button-pushbutton-5, none);
  }
  &:active:not(:disabled),
  &:focus:active:not(:disabled) {
    border-image: var(--xp-p-button-pushbutton-3, none);
    background: var(--xp-button-pressed, none);
  }
  &:disabled {
    border-image: var(--xp-p-button-pushbutton-4, none);
    color: var(--xp-button-disabled-text, #a0a0a0);
    background: var(--xp-button-disabled-face, none);
  }
`;

export default XPButton;
