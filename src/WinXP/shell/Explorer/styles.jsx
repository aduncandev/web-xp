// Explorer's presentational layer: the window-wide styled-components
// blob plus the small stateless visual pieces that hang off it.
import React from 'react';
import styled, { css } from 'styled-components';

import { getArt } from '../../../xpArt';

// Genuine XP shortcut-arrow badge (bottom-left of shortcut icons)
const shortcutOverlay = getArt('shortcut-overlay', null);

/** Item icon with the shortcut-arrow badge and hidden-file ghosting. */
export const ItemIcon = ({ node, src, className }) => (
  <span
    className={`com__icon-wrap${node.hidden ? ' com__icon-wrap--ghost' : ''}`}
  >
    <img src={src} alt="" className={className} draggable={false} />
    {node.type === 'shortcut' && shortcutOverlay && (
      <img
        src={shortcutOverlay}
        alt=""
        className="com__shortcut-arrow"
        draggable={false}
      />
    )}
  </span>
);

/** Luna task-pane roll-up chevron: white circle, blue double chevron */
export function TaskChevron({ collapsed }) {
  return (
    <svg
      className="com__task-chevron"
      width="18"
      height="18"
      viewBox="0 0 18 18"
    >
      <circle
        cx="9"
        cy="9"
        r="8"
        fill="#fff"
        stroke="#b5c6ef"
        strokeWidth="1"
      />
      {collapsed ? (
        <g stroke="#4e6bbb" strokeWidth="1.7" fill="none">
          <polyline points="5.5,5 9,8.5 12.5,5" />
          <polyline points="5.5,9.5 9,13 12.5,9.5" />
        </g>
      ) : (
        <g stroke="#4e6bbb" strokeWidth="1.7" fill="none">
          <polyline points="5.5,8.5 9,5 12.5,8.5" />
          <polyline points="5.5,13 9,9.5 12.5,13" />
        </g>
      )}
    </svg>
  );
}

/**
 * The Luna task pane: the blue column of roll-up cards left of a listing.
 * Explorer's window and Control Panel both include it, so the two panes
 * cannot drift apart.
 */
export const taskPaneCss = css`
  .com__content__left {
    width: 200px;
    background: linear-gradient(to bottom, #7ba2e7 0%, #6375d6 100%);
    overflow-y: auto;
    padding: 12px 10px;
    flex-shrink: 0;
  }

  .com__content__left__card {
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;
    width: 100%;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.45);
  }
  .com__content__left__card:not(:last-child) {
    margin-bottom: 12px;
  }
  .com__content__left__card__header {
    display: flex;
    align-items: center;
    height: 25px;
    padding-left: 10px;
    padding-right: 4px;
    cursor: pointer;
    background: linear-gradient(to right, #ffffff 0%, #c6d3f7 100%);
  }
  .com__content__left__card__header:hover {
    & .com__content__left__card__header__text {
      color: #428eff;
    }
  }
  .com__content__left__card__header__text {
    font-weight: 700;
    font-size: 11px;
    color: #215dc6;
    flex: 1;
  }
  .com__task-chevron {
    flex-shrink: 0;
    cursor: pointer;
  }
  .com__content__left__card__content {
    padding: 8px 10px 10px;
    background: #d6dff7;
  }
  .com__content__left__card__row {
    display: flex;
    align-items: flex-start;
    margin-bottom: 5px;
  }
  .com__content__left__card__row:last-child {
    margin-bottom: 0;
  }

  .com__content__left__card__img {
    width: 16px;
    height: 16px;
    margin-right: 6px;
    flex-shrink: 0;
  }
  .com__content__left__card__text {
    font-size: 11px;
    line-height: 14px;
    color: #000;
    word-break: break-word;
    &.black {
      color: #000;
    }
    &.bold {
      font-weight: bold;
    }
    &.link {
      color: #215dc6;
    }
    &.link:hover {
      cursor: pointer;
      color: #428eff;
      text-decoration: underline;
    }
    &.link.inert:hover {
      cursor: default;
      color: #215dc6;
      text-decoration: none;
    }
  }
  .com__content__left__card__header__img {
    width: 22px;
    height: 22px;
    margin-right: 6px;
  }
`;

export const Div = styled.div`
  height: 100%;
  width: 100%;
  position: absolute;
  display: flex;
  overflow: hidden;
  flex-direction: column;
  background: linear-gradient(to right, #edede5 0%, #ede8cd 100%);
  outline: none;

  .com__toolbar {
    position: relative;
    display: flex;
    align-items: center;
    line-height: 100%;
    height: 24px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.7);
    flex-shrink: 0;
  }
  .com__options {
    height: 23px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    border-right: 1px solid rgba(0, 0, 0, 0.1);
    padding: 1px 0 1px 2px;
    border-left: 0;
    flex: 1;
  }
  .com__windows-logo {
    height: 100%;
    border-left: 1px solid white;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  }
  .com__function_bar {
    height: 37px;
    display: flex;
    align-items: center;
    font-size: 11px;
    padding: 1px 3px 0;
    border-bottom: 1px solid #d8d2bd;
    flex-shrink: 0;
  }
  .com__function_bar__button {
    display: flex;
    height: 32px;
    align-items: center;
    padding: 0 2px;
    border: 1px solid transparent;
    border-radius: 3px;
    &:hover {
      border: 1px solid #b8c7e8;
      background-color: #dfe7f5;
    }
    &:hover:active {
      border: 1px solid #98b1de;
      background-color: #c1d2ee;
    }
  }
  .com__function_bar__button--active {
    border: 1px solid #aca899 !important;
    background-color: #e3dfd2;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.15);
  }
  .com__function_bar__button--disable {
    filter: grayscale(1);
    opacity: 0.45;
    display: flex;
    height: 32px;
    align-items: center;
    padding: 0 2px;
    border: 1px solid transparent;
  }
  .com__function_bar__text {
    margin-right: 4px;
  }
  .com__function_bar__icon {
    height: 30px;
    width: 30px;
    &--normalize {
      height: 22px;
      width: 22px;
      margin: 0 4px 0 1px;
    }
    &--margin12 {
      height: 22px;
      width: 22px;
      margin: 0 1px 0 2px;
    }
  }
  .com__function_bar__separate {
    height: 90%;
    width: 1px;
    background-color: rgba(0, 0, 0, 0.2);
    margin: 0 2px;
  }
  .com__function_bar__arrow {
    height: 100%;
    display: flex;
    align-items: center;
    padding: 0 4px;
    border-radius: 2px;
    &:hover {
      background-color: rgba(152, 177, 222, 0.35);
    }
    &:before {
      content: '';
      display: block;
      border-width: 3px 3px 0;
      border-color: #000 transparent;
      border-style: solid;
    }
  }
  .com__address_bar {
    flex-shrink: 0;
    border-top: 1px solid rgba(255, 255, 255, 0.7);
    height: 24px;
    font-size: 11px;
    display: flex;
    align-items: center;
    padding: 1px 2px;
    box-shadow: inset 0 -2px 3px -1px #b0b0b0;
  }
  .com__address_bar__title {
    line-height: 100%;
    color: rgba(0, 0, 0, 0.5);
    padding: 5px;
  }
  .com__address_bar__content {
    border: rgba(122, 122, 255, 0.6) 1px solid;
    height: 100%;
    display: flex;
    flex: 1;
    align-items: center;
    background-color: white;
    position: relative;
    &__img {
      width: 14px;
      height: 14px;
      margin-left: 1px;
      flex-shrink: 0;
    }
    &__dropdown {
      width: 15px;
      height: 15px;
      right: 1px;
      position: absolute;
      cursor: pointer;
      &:hover {
        filter: brightness(1.1);
      }
    }
  }
  .com__address_bar__dropdown-list {
    position: absolute;
    top: 100%;
    left: -1px;
    right: -1px;
    background: #fff;
    border: 1px solid #7f9db9;
    box-shadow: 2px 2px 3px rgba(0, 0, 0, 0.3);
    z-index: 10;
  }
  .com__address_bar__dropdown-item {
    display: flex;
    align-items: center;
    height: 20px;
    padding: 0 4px;
    img {
      width: 16px;
      height: 16px;
      margin-right: 4px;
    }
    &:hover {
      background: #316ac5;
      color: #fff;
    }
  }
  .com__address_bar__input {
    border: none;
    outline: none;
    font-size: 11px;
    font-family: Tahoma, 'Noto Sans', sans-serif;
    flex: 1;
    height: 100%;
    padding: 0 18px 0 2px;
    min-width: 0;
  }
  .com__address_bar__go {
    display: flex;
    align-items: center;
    padding: 0 18px 0 5px;
    height: 100%;
    position: relative;
    cursor: pointer;
    &__img {
      height: 95%;
      border: 1px solid rgba(255, 255, 255, 0.2);
      margin-right: 3px;
    }
  }
  .com__content {
    flex: 1;
    border: 1px solid rgba(0, 0, 0, 0.4);
    border-top-width: 0;
    background-color: #f1f1f1;
    overflow: auto;
    font-size: 11px;
    position: relative;
  }
  .com__content__inner {
    display: flex;
    height: 100%;
    overflow: auto;
  }
  ${taskPaneCss}
  .com__content__right {
    overflow-y: auto;
    background-color: #fff;
    flex: 1;
    padding: 5px;
    display: flex;
    flex-direction: column;
    user-select: none;
    position: relative; /* anchors the rubber-band overlay */
  }
  /* Shell folder watermark: pinned to the bottom-right of the file area and
     clipped by it, exactly where the real shell draws it. */
  .com__watermark {
    position: absolute;
    right: 0;
    bottom: 0;
    pointer-events: none;
    user-select: none;
    z-index: 0;
  }
  /* "These files are hidden" — the shell's guard over its own folders */
  .com__hidden-panel {
    position: absolute;
    inset: 0;
    background: #6375d6;
    color: #fff;
    padding: 28px 30px;
    overflow: hidden;
    z-index: 1;
  }
  .com__hidden-panel__art {
    position: absolute;
    right: 0;
    bottom: 0;
    pointer-events: none;
  }
  .com__hidden-panel__title {
    position: relative;
    font-size: 20px;
    margin-bottom: 16px;
  }
  .com__hidden-panel__body {
    position: relative;
    font-size: 12px;
    line-height: 17px;
    max-width: 480px;
    margin-bottom: 16px;
  }
  .com__hidden-panel__link {
    position: relative;
    font-size: 11px;
    font-weight: bold;
    cursor: pointer;
    display: inline-block;
    &:hover {
      text-decoration: underline;
    }
  }
  .com__rubberband {
    background: rgba(49, 106, 197, 0.3);
    border: 1px solid #316ac5;
    z-index: 50;
    pointer-events: none;
  }
  .com__icon-wrap {
    position: relative;
    display: inline-flex;
    flex-shrink: 0;
    vertical-align: middle;
  }
  .com__icon-wrap--ghost {
    opacity: 0.55;
  }
  /* High specificity: view-level descendant img rules must not resize it */
  .com__icon-wrap img.com__shortcut-arrow {
    position: absolute;
    left: 0;
    bottom: 0;
    width: 42%;
    height: 42%;
    margin: 0;
    pointer-events: none;
  }
  .com__content__right__card__header {
    font-weight: 700;
    color: #003399;
    padding: 2px 0 3px 12px;
    position: relative;
    &:after {
      content: '';
      display: block;
      background: linear-gradient(to right, #70bfff 0, #fff 100%);
      position: absolute;
      bottom: 0;
      left: 0;
      height: 1px;
      width: calc(100% - 12px);
    }
  }
  .com__content__right__card__content {
    display: flex;
    flex-wrap: wrap;
    padding: 15px 0 0 12px;
  }
  .com__content__empty {
    color: #888;
    padding: 20px;
    font-style: italic;
    flex: 1;
  }

  /* ---- Shared item bits ---- */
  .com__item-name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .cut {
    opacity: 0.5;
  }
  .com__view {
    flex: 1;
    min-height: 60px;
    /* Keeps the file items above the shell folder watermark */
    position: relative;
    z-index: 1;
  }

  /* ---- Tiles view ---- */
  .com__view--tiles {
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    padding: 10px 0 0 12px;
  }
  .com__view-tile {
    display: flex;
    align-items: center;
    width: 200px;
    margin: 0 10px 15px 0;
    border: 1px solid transparent;
    padding: 2px;
    &:hover {
      background-color: rgba(49, 106, 197, 0.1);
      border: 1px solid rgba(49, 106, 197, 0.6);
      cursor: default;
    }
    &.selected {
      background-color: #316ac5;
      border: 1px solid #316ac5;
      .com__view-tile__name,
      .com__view-tile__type {
        color: white;
      }
    }
  }
  .com__view-tile__img {
    width: 48px;
    height: 48px;
    margin-right: 5px;
    flex-shrink: 0;
  }
  .com__view-tile__text {
    min-width: 0;
  }
  .com__view-tile__name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .com__view-tile__type {
    color: #7f7f7f;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* ---- Icons view ---- */
  .com__view--icons {
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    padding: 10px 0 0 12px;
  }
  .com__view-icon {
    width: 75px;
    margin: 0 8px 14px 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    border: 1px solid transparent;
    padding: 4px 2px 2px;
    &:hover {
      background-color: rgba(49, 106, 197, 0.1);
      border: 1px solid rgba(49, 106, 197, 0.6);
      cursor: default;
    }
    &.selected {
      background-color: #316ac5;
      border: 1px solid #316ac5;
      color: white;
    }
  }
  .com__view-icon__img {
    width: 32px;
    height: 32px;
    margin-bottom: 4px;
  }
  .com__view-icon__name {
    max-width: 100%;
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* ---- Thumbnails view ---- */
  .com__view--thumbs {
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    padding: 10px 0 0 12px;
  }
  .com__view-thumb {
    width: 110px;
    margin: 0 10px 14px 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    border: 1px solid transparent;
    padding: 4px;
    &:hover {
      background-color: rgba(49, 106, 197, 0.1);
      border: 1px solid rgba(49, 106, 197, 0.6);
      cursor: default;
    }
    &.selected {
      background-color: #316ac5;
      border: 1px solid #316ac5;
      color: white;
    }
  }
  .com__view-thumb__box {
    width: 96px;
    height: 72px;
    background: #fff;
    border: 1px solid #ccc;
    box-shadow: 2px 2px 3px rgba(0, 0, 0, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 4px;
    img {
      width: 48px;
      height: 48px;
    }
  }
  .com__view-thumb__name {
    max-width: 100%;
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* ---- List view ---- */
  .com__view--list {
    display: flex;
    flex-direction: column;
    flex-wrap: wrap;
    align-content: flex-start;
    padding: 5px 0 0 5px;
    overflow-x: auto;
  }
  .com__view-listitem {
    display: flex;
    align-items: center;
    width: 160px;
    height: 17px;
    padding: 0 2px;
    border: 1px solid transparent;
    &:hover {
      background-color: rgba(49, 106, 197, 0.1);
      cursor: default;
    }
    &.selected {
      background-color: #316ac5;
      color: white;
    }
  }
  .com__view-listitem__img {
    width: 16px;
    height: 16px;
    margin-right: 4px;
    flex-shrink: 0;
  }

  /* ---- Details view ---- */
  .com__view--details {
    padding: 0;
    overflow: auto;
    min-height: 0;
    /* The header bar runs the width of the view. Painting it here means the
       columns can stop short without leaving a bite out of the bar, and
       costs no extra column. */
    background-color: #fff;
    background-image: linear-gradient(
      to bottom,
      #fff 0,
      #f7f7f1 12px,
      #ebeadb 17px,
      #d8d8d8 17px
    );
    background-size: 100% 18px;
    background-repeat: no-repeat;
  }
  .com__table {
    /* The width is set inline to the sum of the columns. It has to be a
       definite length: a fixed-layout table wider than its columns shares
       the surplus out among them, and one sized to max-content ignores the
       colgroup and measures the cells instead — either way a column would
       not keep the width it was dragged to. */
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 11px;
  }
  .com__th {
    text-align: left;
    font-weight: normal;
    padding: 2px 6px;
    border-bottom: 1px solid #d8d8d8;
    border-right: 1px solid #d8d8d8;
    background: linear-gradient(to bottom, #fff 0%, #f7f7f1 70%, #ebeadb 100%);
    position: sticky;
    top: 0;
    z-index: 1;
    white-space: nowrap;
    cursor: default;
    &:hover {
      background: #fdfaf1;
    }
  }
  .com__th--size {
    text-align: right;
  }
  .com__td {
    padding: 1px 6px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .com__td--name {
    display: flex;
    align-items: center;
    gap: 4px;
    img {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }
  }
  .com__td--size {
    text-align: right;
  }
  .com__tr {
    cursor: default;
    &:hover {
      background-color: rgba(49, 106, 197, 0.08);
    }
    &.selected {
      background-color: #316ac5;
      color: #fff;
    }
  }

  /* Inline rename editor: floats over the item so growing it to fit the whole
     name never reflows the list around it. */
  .com__rename-wrap {
    position: relative;
    display: inline-block;
    width: 100%;
    min-width: 60px;
    height: 15px;
    vertical-align: middle;
  }
  .com__rename-sizer {
    position: absolute;
    left: 0;
    top: 0;
    visibility: hidden;
    pointer-events: none;
    white-space: pre;
    font-size: 11px;
    font-family: Tahoma, 'Noto Sans', sans-serif;
  }
  .com__rename-input {
    position: absolute;
    left: 0;
    top: 0;
    z-index: 6;
    font-size: 11px;
    line-height: 13px;
    font-family: Tahoma, 'Noto Sans', sans-serif;
    border: 1px solid #316ac5;
    padding: 1px 3px;
    outline: none;
    min-width: 100%;
    background: #fff;
    color: #000;
    text-shadow: none;
    user-select: text;
  }
  .com__rename-input--wrap {
    /* Icon-ish views: fixed width, wraps and grows downward */
    width: 100%;
    min-width: 0;
    text-align: center;
    resize: none;
    overflow: hidden;
    overflow-wrap: break-word;
    display: block;
  }
  /* Let the edit box escape the cell it lives in. The icon-ish name blocks are
     shrink-to-fit, so pin them to the tile width or the box collapses. */
  .renaming .com__view-icon__name,
  .renaming .com__view-thumb__name,
  .renaming .com__view-tile__name {
    overflow: visible;
    white-space: normal;
    width: 100%;
  }
  .renaming .com__td--name {
    overflow: visible;
    white-space: normal;
  }
  .com__view-listitem.renaming,
  .com__view-icon.renaming,
  .com__view-thumb.renaming,
  .com__view-tile.renaming,
  .com__tr.renaming {
    overflow: visible;
    position: relative;
    z-index: 6;
  }
  .com__status_bar {
    height: 22px;
    display: flex;
    align-items: stretch;
    font-size: 11px;
    border-top: 1px solid #d8d2bd;
    background: linear-gradient(to right, #edede5 0%, #ede8cd 100%);
    flex-shrink: 0;
    color: #000;
  }
  .com__status_bar__section {
    display: flex;
    align-items: center;
    padding: 0 8px;
    border-right: 1px solid rgba(0, 0, 0, 0.15);
    box-shadow: 1px 0 0 rgba(255, 255, 255, 0.7);
  }
  .com__status_bar__main {
    flex: 1;
  }
  .com__status_bar__zone {
    border-right: none;
    box-shadow: none;
    img {
      width: 14px;
      height: 14px;
      margin-right: 4px;
    }
  }
`;


