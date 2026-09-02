import styled from 'styled-components';

export const DialogBody = styled.div`
  padding: 10px;
  font-family: Tahoma, 'Noto Sans', sans-serif;
  font-size: 11px;

  .dlg-main {
    display: flex;
    gap: 10px;
  }
  .dlg-fields {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .dlg-static {
    color: #000;
  }
  .dlg-row {
    display: flex;
    gap: 10px;
    margin: 4px 0;
    label {
      display: flex;
      align-items: center;
      gap: 4px;
    }
  }
  .dlg-buttons {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .dlg-indent {
    padding-left: 18px;
    display: flex;
    flex-direction: column;
  }
  .dlg-disabled {
    color: var(--xp-face-shadow, #aca899);
  }
  fieldset {
    border: 1px solid #d0d0bf;
    border-radius: 3px;
    padding: 4px 8px 6px;
    display: flex;
    flex-direction: column;
    gap: 3px;
    legend {
      padding: 0 2px;
    }
    label {
      display: flex;
      align-items: center;
      gap: 4px;
    }
  }
  input[type='text'],
  input:not([type]) {
    width: 50px;
    height: 18px;
    border: 1px solid var(--xp-select-border, #7f9db9);
    font-family: Tahoma, 'Noto Sans', sans-serif;
    font-size: 11px;
    padding: 1px 3px;
    outline: none;
  }
`;

export const Div = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  background: var(--xp-face, #ece9d8);
  font-family: Tahoma, 'Noto Sans', sans-serif;
  font-size: 11px;
  user-select: none;

  .paint__menubar {
    position: relative;
    height: 21px;
    flex-shrink: 0;
    border-bottom: 1px solid #fff;
  }

  .paint__mid {
    flex: 1;
    display: flex;
    min-height: 0;
  }

  /* --- Toolbox --- */
  .paint__toolbox {
    width: 56px;
    flex-shrink: 0;
    padding: 3px 2px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .paint__tools {
    display: grid;
    grid-template-columns: 25px 25px;
  }
  .paint__tool {
    width: 25px;
    height: 24px;
    padding: 0;
    margin: 0;
    border: 1px solid transparent;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    outline: none;
    &:hover {
      box-shadow: inset 1px 1px 0 #fff, inset -1px -1px 0 var(--xp-face-shadow, #aca899);
    }
    &:active {
      box-shadow: inset 1px 1px 0 var(--xp-face-shadow, #aca899), inset -1px -1px 0 #fff;
    }
  }
  .paint__tool--active,
  .paint__tool--active:hover {
    box-shadow: inset 1px 1px 0 var(--xp-face-shadow, #aca899), inset -1px -1px 0 #fff;
    background-image: conic-gradient(
      #fff 25%,
      #d6d3ce 0 50%,
      #fff 0 75%,
      #d6d3ce 0
    );
    background-size: 2px 2px;
  }
  .paint__tool-glyph {
    display: block;
    width: 16px;
    height: 16px;
    background-repeat: no-repeat;
  }

  /* --- Tool options box --- */
  .paint__options {
    margin-top: 3px;
    width: 42px;
    height: 66px;
    border: 1px solid;
    border-color: #808080 #fff #fff #808080;
    background: var(--xp-face, #ece9d8);
    overflow: hidden;
  }
  .paint__opt-list {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  .paint__opt--sel {
    background: var(--xp-highlight, #316ac5) !important;
    > div {
      background-color: #fff;
    }
    color: #fff;
  }
  .paint__opt-line {
    flex: 1;
    display: flex;
    align-items: center;
    padding: 0 4px;
    > div {
      width: 100%;
      background-color: #000;
    }
  }
  .paint__opt-fill {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .paint__opt-fill-pict {
    width: 26px;
    height: 14px;
    box-sizing: border-box;
  }
  .paint__opt-fill-pict--outline {
    border: 1px solid #7b7b7b;
  }
  .paint__opt-fill-pict--both {
    border: 1px solid #7b7b7b;
    background-color: #bcbcbc;
    background-clip: padding-box;
  }
  .paint__opt-fill-pict--fill {
    background-color: #7b7b7b;
  }
  .paint__opt--sel .paint__opt-fill-pict--outline {
    border-color: #fff;
    background-color: transparent;
  }
  .paint__opt--sel .paint__opt-fill-pict--both {
    border-color: #fff;
    background-color: #9ab2d9;
  }
  .paint__opt--sel .paint__opt-fill-pict--fill {
    background-color: #fff;
  }
  .paint__opt-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    grid-auto-rows: 1fr;
    height: 100%;
  }
  .paint__opt-grid--spray {
    grid-template-columns: 1fr;
  }
  .paint__opt-cell {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .paint__opt-dot {
    background-color: #000;
  }
  .paint__opt-spray {
    border-radius: 50%;
    background-image: radial-gradient(#000 0.5px, transparent 0.5px);
    background-size: 3px 3px;
  }
  .paint__opt--sel .paint__opt-spray {
    background-image: radial-gradient(#fff 0.5px, transparent 0.5px);
    background-color: transparent;
  }
  .paint__opt-eraser {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .paint__opt-zoom {
    flex: 1;
    display: flex;
    align-items: center;
    padding-left: 6px;
    color: #000;
  }
  .paint__opt--sel.paint__opt-zoom {
    color: #fff;
  }
  .paint__opt-trans {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .paint__opt-trans-img {
    width: 35px;
    height: 22px;
    background-repeat: no-repeat;
  }

  /* --- Canvas area --- */
  .paint__canvas-area {
    flex: 1;
    overflow: auto;
    background: #808080;
    position: relative;
  }
  .paint__sheet-wrap {
    position: relative;
    padding: 3px 12px 12px 3px;
    width: max-content;
  }
  .paint__holder {
    position: relative;
  }
  .paint__canvas,
  .paint__overlay {
    position: absolute;
    left: 0;
    top: 0;
    image-rendering: pixelated;
  }
  .paint__overlay {
    pointer-events: none;
  }
  .paint__marquee {
    position: absolute;
    border: 1px dashed #000;
    box-sizing: border-box;
    pointer-events: none;
  }
  .paint__textbox {
    position: absolute;
    box-sizing: border-box;
    border: 1px dashed #000;
    outline: none;
    resize: none;
    overflow: hidden;
    padding: 0;
    font-family: Arial, sans-serif;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .paint__resize-ghost {
    position: absolute;
    left: 3px;
    top: 3px;
    border: 1px dashed #000;
    box-sizing: border-box;
    pointer-events: none;
  }
  .paint__handle {
    position: absolute;
    width: 3px;
    height: 3px;
    background: var(--xp-highlight, #316ac5);
  }

  /* --- Color box --- */
  .paint__colorbox {
    flex-shrink: 0;
    height: 44px;
    display: flex;
    align-items: center;
    padding: 2px 4px;
  }
  .paint__indicator {
    position: relative;
    width: 30px;
    height: 30px;
    margin-right: 4px;
    flex-shrink: 0;
  }
  .paint__indicator-swatch {
    position: absolute;
    width: 15px;
    height: 15px;
    border: 1px solid;
    border-color: #808080 #fff #fff #808080;
    background: var(--xp-face, #ece9d8);
    > div {
      width: 100%;
      height: 100%;
    }
  }
  .paint__indicator-swatch--fg {
    left: 3px;
    top: 3px;
    z-index: 1;
  }
  .paint__indicator-swatch--bg {
    left: 10px;
    top: 10px;
  }
  .paint__swatches {
    display: grid;
    grid-template-columns: repeat(14, 16px);
    grid-template-rows: 16px 16px;
  }
  .paint__swatch {
    width: 16px;
    height: 16px;
    border: 1px solid;
    border-color: #808080 #fff #fff #808080;
    box-sizing: border-box;
    > div {
      width: 100%;
      height: 100%;
      border: 1px solid #808080;
      box-sizing: border-box;
    }
  }

  /* --- Status bar --- */
  .paint__status {
    flex-shrink: 0;
    height: 22px;
    display: flex;
    gap: 2px;
    padding: 2px;
    box-sizing: border-box;
  }
  .paint__status-help {
    flex: 1;
    border: 1px solid;
    border-color: #808080 #fff #fff #808080;
    padding: 1px 4px;
    white-space: nowrap;
    overflow: hidden;
  }
  .paint__status-pane {
    width: 110px;
    flex-shrink: 0;
    border: 1px solid;
    border-color: #808080 #fff #fff #808080;
    padding: 1px 4px;
    white-space: nowrap;
  }
`;

