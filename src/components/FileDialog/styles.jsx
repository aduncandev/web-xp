// Presentational layer for the common file dialog: the single window-wide
// styled-components blob.
import styled from 'styled-components';

export const Body = styled.div`
  padding: 8px 10px 10px;
  font-size: 11px;

  /* --- Look in row --- */
  .fd-lookin-row {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
  }
  .fd-lookin-label {
    width: 70px;
    text-align: left;
  }
  .fd-lookin-select {
    width: 300px;
  }
  .fd-toolbar {
    display: flex;
    margin-left: 8px;
  }
  .fd-tool-btn {
    width: 24px;
    height: 24px;
    border: 1px solid transparent;
    background: transparent;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    img {
      width: 20px;
      height: 20px;
    }
    &:hover:not(:disabled) {
      border: 1px solid rgba(0, 0, 0, 0.15);
      box-shadow: inset 0 -1px 1px rgba(0, 0, 0, 0.1);
      border-radius: 2px;
    }
    &:disabled {
      filter: grayscale(1);
      opacity: 0.5;
      cursor: default;
    }
  }

  /* --- Main area --- */
  .fd-main {
    display: flex;
    height: 250px;
    margin-bottom: 8px;
  }
  .fd-places {
    width: 88px;
    background: #dcdcd4;
    border: 1px solid var(--xp-select-border, #7f9db9);
    border-right: none;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    padding: 4px 0;
    gap: 2px;
    overflow-y: auto;
  }
  .fd-place {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8px 2px;
    cursor: default;
    text-align: center;
    color: #333;
    img {
      width: 32px;
      height: 32px;
      margin-bottom: 4px;
    }
    span {
      font-size: 10px;
      line-height: 12px;
    }
    &:hover {
      color: #000;
    }
    /* No network in this build, so the place is present but inert */
    &.fd-place--disabled {
      color: #808080;
      img {
        filter: grayscale(1) opacity(0.55);
      }
    }
    &.active {
      background: rgba(49, 106, 197, 0.15);
    }
  }
  .fd-list {
    flex: 1;
    background: #fff;
    border: 1px solid var(--xp-select-border, #7f9db9);
    overflow: auto;
    display: flex;
    flex-direction: column;
    flex-wrap: wrap;
    align-content: flex-start;
    padding: 2px;
  }
  .fd-item {
    display: flex;
    align-items: center;
    width: 150px;
    height: 18px;
    padding: 0 2px;
    border: 1px solid transparent;
    img {
      width: 16px;
      height: 16px;
      margin-right: 4px;
      flex-shrink: 0;
    }
    span {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    &:hover {
      background: rgba(49, 106, 197, 0.1);
    }
    &.selected {
      background: var(--xp-highlight, #316ac5);
      color: #fff;
    }
  }
  .fd-empty {
    flex: 1;
  }

  /* --- Bottom rows --- */
  .fd-bottom {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .fd-bottom-row {
    display: flex;
    align-items: center;
  }
  .fd-bottom-label {
    width: 70px;
  }
  .fd-name-input {
    flex: 1;
    box-sizing: border-box;
    height: 21px;
    border: 1px solid var(--xp-select-border, #7f9db9);
    padding: 0 4px;
    font-family: Tahoma, 'Noto Sans', sans-serif;
    font-size: 11px;
    outline: none;
    margin-right: 8px;
  }
  .fd-type-select {
    flex: 1;
    margin-right: 8px;
  }
`;

