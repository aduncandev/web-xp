// Presentational layer for the Properties dialog: the main sheet body plus
// the Advanced Attributes and Change Icon sub-dialog bodies.
import styled from 'styled-components';

export const Body = styled.div`
  padding: 8px 12px 12px;
  font-size: 11px;

  .pr-tabs {
    display: flex;
    margin-bottom: -1px;
    position: relative;
    z-index: 1;
  }
  .pr-tab {
    padding: 3px 10px;
    border: 1px solid #919b9c;
    border-bottom: none;
    border-top-left-radius: 3px;
    border-top-right-radius: 3px;
    background: linear-gradient(to bottom, #fff, #ece9d8);
    margin-right: 2px;
    cursor: default;
    &.active {
      position: relative;
      top: -2px;
      padding-top: 5px;
      background: #fff;
      border-top: 2px solid #e68b2c;
    }
    &.disabled {
      color: #888;
    }
  }
  .pr-page {
    border: 1px solid #919b9c;
    background: #fff;
    padding: 14px 14px;
    min-height: 300px;
    display: flex;
    flex-direction: column;
  }
  .pr-row {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
    gap: 6px;
    flex-shrink: 0;
    /* Buttons sitting at the end of a row keep their natural size; the value
       beside them is what gives way. */
    > button {
      flex: 0 0 auto;
      white-space: nowrap;
    }
  }
  .pr-row--head {
    margin-bottom: 10px;
  }
  .pr-icon {
    width: 32px;
    height: 32px;
    margin-right: 8px;
    flex-shrink: 0;
  }
  .pr-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .pr-field {
    flex: 1;
    min-width: 0;
    font-size: 11px;
    font-family: Tahoma, 'Noto Sans', sans-serif;
    border: 1px solid #7f9db9;
    padding: 2px 3px;
    outline: none;
    background: #fff;
    color: #000;
    &:disabled,
    &[readonly] {
      background: #f5f5f0;
      color: #6d6d6d;
    }
  }
  .pr-label {
    width: 92px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
  }
  .pr-value {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .pr-value--opens {
    flex: 1;
  }
  .pr-opens-name {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .pr-mini-icon {
    width: 16px;
    height: 16px;
    margin-right: 4px;
    flex-shrink: 0;
  }
  .pr-sep {
    height: 1px;
    background: #d0d0bf;
    margin: 10px 0;
    flex-shrink: 0;
  }
  .pr-btnrow {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    margin-top: 12px;
    flex-shrink: 0;
  }
  .pr-swatch {
    display: inline-block;
    width: 9px;
    height: 9px;
    margin-right: 5px;
    &--used {
      background: #2a44a5;
    }
    &--free {
      background: #c545c5;
    }
  }
  .pr-bar {
    height: 14px;
    border: 1px solid #919b9c;
    background: #c545c5;
    margin-top: 4px;
    overflow: hidden;
  }
  .pr-bar__used {
    height: 100%;
    background: #2a44a5;
  }
  .pr-attrs {
    gap: 16px;
    flex: 0 1 auto;
    label {
      display: flex;
      align-items: center;
      gap: 4px;
      cursor: default;
      white-space: nowrap;
      flex-shrink: 0;
    }
  }

  /* ---- Version tab ---- */
  .pr-vergroup {
    border: 1px solid #d0d0bf;
    border-radius: 3px;
    margin: 10px 0 0;
    padding: 6px 10px 10px;
    flex: 1;
    display: flex;
    flex-direction: column;
    legend {
      color: #0046d5;
      padding: 0 2px;
    }
  }
  .pr-vergroup__cols {
    display: flex;
    gap: 10px;
    flex: 1;
    min-height: 0;
  }
  .pr-vercol {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .pr-vercol__label {
    margin-bottom: 3px;
  }
  .pr-verlist,
  .pr-vervalue {
    border: 1px solid #7f9db9;
    background: #fff;
    flex: 1;
    min-height: 110px;
    overflow: auto;
    padding: 1px;
  }
  .pr-verlist__row {
    padding: 0 3px;
    line-height: 13px;
    cursor: default;
    white-space: nowrap;
    &.selected {
      background: #316ac5;
      color: #fff;
    }
  }
  .pr-vervalue {
    padding: 1px 3px;
    line-height: 14px;
    word-break: break-word;
  }

  /* ---- Summary tab ---- */
  .pr-props {
    border: 1px solid #7f9db9;
    background: #fff;
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .pr-props-head {
    display: flex;
    border-bottom: 1px solid #d8d2bd;
    flex-shrink: 0;
    .pr-props-col {
      padding: 2px 5px;
      border-right: 1px solid #d8d2bd;
    }
  }
  .pr-props-body {
    flex: 1;
    overflow-y: auto;
    padding-bottom: 4px;
  }
  .pr-props-section {
    font-weight: bold;
    padding: 6px 5px 2px;
    border-bottom: 1px solid #a8bcd4;
    margin-bottom: 4px;
  }
  .pr-props-row {
    display: flex;
    align-items: center;
    height: 16px;
    &:hover {
      background: rgba(49, 106, 197, 0.08);
    }
  }
  .pr-props-col {
    flex: 1;
    padding: 0 5px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .pr-props-col--name {
    flex: 0 0 150px;
    display: flex;
    align-items: center;
    gap: 4px;
    img {
      width: 14px;
      height: 14px;
      flex-shrink: 0;
    }
  }
  .pr-summary {
    flex: 1;
    .pr-label {
      width: 70px;
    }
  }
  .pr-footer {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    padding-top: 10px;
  }
`;

export const AdvBody = styled.div`
  padding: 10px 12px 12px;
  font-size: 11px;
  font-family: Tahoma, 'Noto Sans', sans-serif;

  .adv-head {
    margin-bottom: 10px;
    line-height: 15px;
  }
  fieldset {
    border: 1px solid #d0d0bf;
    border-radius: 3px;
    margin: 0 0 10px;
    padding: 6px 10px 8px;
    legend {
      color: #0046d5;
      padding: 0 2px;
    }
  }
  label {
    display: flex;
    align-items: flex-start;
    gap: 5px;
    margin: 3px 0;
    line-height: 14px;
    cursor: default;
  }
  .adv-footer {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    margin-top: 12px;
  }
`;

export const IconBody = styled.div`
  padding: 10px 12px 12px;
  font-size: 11px;
  font-family: Tahoma, 'Noto Sans', sans-serif;

  .ci-label {
    margin-bottom: 4px;
  }
  .ci-grid {
    border: 1px solid #7f9db9;
    background: #fff;
    height: 150px;
    overflow-y: auto;
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    gap: 2px;
    padding: 4px;
  }
  .ci-cell {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid transparent;
    cursor: default;
    img {
      width: 32px;
      height: 32px;
    }
    &:hover {
      background: rgba(49, 106, 197, 0.1);
    }
    &.selected {
      background: #316ac5;
      border-color: #316ac5;
    }
  }
  .ci-footer {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    margin-top: 12px;
  }
`;

