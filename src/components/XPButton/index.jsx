import styled from 'styled-components';

/**
 * Luna push button (the standard Windows XP command button).
 *
 * Usage: <XPButton onClick={...}>OK</XPButton>
 * Forward-refs work (styled.button), so autofocusing the default
 * button of a dialog shows the authentic blue focus ring.
 */
const XPButton = styled.button`
  min-width: 75px;
  height: 23px;
  padding: 0 12px;
  border: 1px solid #003c74;
  border-radius: 3px;
  background: linear-gradient(to bottom, #ffffff 0%, #ecebe5 86%, #d8d0c4 100%);
  font-family: Tahoma, 'Noto Sans', sans-serif;
  font-size: 11px;
  color: #000;
  cursor: default;
  outline: none;
  box-shadow: inset 1px 1px 0 rgba(255, 255, 255, 0.8);

  &:focus:not(:disabled) {
    box-shadow: inset 0 0 0 2px #98b8ea;
  }
  &:hover:not(:disabled) {
    box-shadow: inset 0 -2px 2px #f5c784, inset 0 2px 2px #fff6e1,
      inset 2px 0 2px #fbe3a9, inset -2px 0 2px #fbe3a9;
  }
  &:active:not(:disabled) {
    background: linear-gradient(to bottom, #cdcac3 0%, #e3e3db 100%);
    box-shadow: none;
  }
  &:disabled {
    color: #a0a0a0;
    border-color: #c9c2b8;
    background: #f5f4ea;
    box-shadow: none;
  }
`;

export default XPButton;
