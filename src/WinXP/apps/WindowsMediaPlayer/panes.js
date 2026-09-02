/*
 * The insides of the content pane — everything the skin hands over to the
 * current task (Now Playing, Media Library, …). The frame around it lives in
 * chrome.js and is real WMP8 artwork; this is the task UI drawn to match the
 * reference capture of the stock player.
 */
import styled from 'styled-components';

import { FONT } from './chrome';

/* ---- Now Playing -------------------------------------------------------- */

export const NowPlayingRoot = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  background: #000;
`;

export const VideoColumn = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: #000;
`;

export const TitleBlock = styled.div`
  flex: none;
  padding: 6px 0 4px 4px;
  color: #fff;
  background: #000;
  overflow: hidden;
  white-space: nowrap;

  .wmp__artist {
    font-size: 11px;
    line-height: 14px;
    min-height: 14px;
  }
  .wmp__title {
    font-size: 15px;
    line-height: 20px;
    min-height: 20px;
  }
`;

export const Screen = styled.div`
  flex: 1;
  min-height: 0;
  position: relative;
  background: #000;
  overflow: hidden;
`;

/** The strip under the video: viz pulldowns on the left, its name, and the
 *  full-screen button on the right. */
export const VizStrip = styled.div`
  flex: none;
  height: 21px;
  position: relative;
  background: #000;

  .wmp__vizname {
    position: absolute;
    left: 76px;
    right: 30px;
    top: 2px;
    font-family: ${FONT.face};
    font-size: 12px;
    font-weight: bold;
    line-height: 17px;
    color: #fff;
    white-space: nowrap;
    overflow: hidden;
  }
`;

export const Splitter = styled.div`
  flex: none;
  width: 5px;
  background: #000;
  position: relative;
  cursor: col-resize;

  &::after {
    content: '';
    position: absolute;
    left: 1px;
    top: 50%;
    width: 3px;
    height: 32px;
    margin-top: -16px;
    background: repeating-linear-gradient(
      to bottom,
      #5f5f69 0 1px,
      transparent 1px 3px
    );
  }
`;

export const PlaylistPane = styled.div`
  flex: none;
  width: ${({ $width }) => $width}px;
  display: flex;
  flex-direction: column;
  background: #000;
`;

export const PlaylistList = styled.div`
  flex: 1;
  min-height: 0;
  overflow: auto;
  background: #000;
  padding-top: 4px;

  &::-webkit-scrollbar {
    width: 13px;
  }
  &::-webkit-scrollbar-track {
    background: #101010;
  }
  &::-webkit-scrollbar-thumb {
    background: #4a5aa0;
    border: 1px solid #6a7ac0;
  }
`;

export const PlaylistRow = styled.div`
  display: flex;
  align-items: center;
  height: 15px;
  padding: 0 4px 0 10px;
  font-size: 11px;
  white-space: nowrap;
  color: ${({ $current }) => ($current ? '#00ff00' : '#fff')};
  background: ${({ $current }) => ($current ? '#222222' : 'transparent')};

  .wmp__pl-title {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .wmp__pl-time {
    flex: none;
    padding-left: 8px;
  }
`;

export const PlaylistTotal = styled.div`
  flex: none;
  height: 15px;
  padding-right: 6px;
  text-align: right;
  font-size: 11px;
  color: #fff;
  background: #000;
`;

/* ---- the playlist picker, which lives up in the frame ------------------- */

export const PlaylistDropdown = styled.div`
  position: absolute;
  /* svUpperRightCorner is right-anchored at width 298 and the dropdown sits
     at left 89 inside it, so its right edge lands 9px in from the frame. */
  top: 7px;
  right: 9px;
  width: 200px;
  height: 21px;
  display: flex;
  align-items: center;
  background: #fff;
  border: 1px solid var(--xp-select-border, #7f9db9);
  font-size: 11px;
  color: #000;
  z-index: 5;
  cursor: default;

  .wmp__combo-label {
    flex: 1;
    padding-left: 4px;
    overflow: hidden;
    white-space: nowrap;
  }
  .wmp__combo-arrow {
    flex: none;
    width: 16px;
    height: 17px;
    margin: 1px;
    background: linear-gradient(to bottom, #f6f9ff 0, #c3d3f5 100%);
    border: 1px solid var(--xp-select-border, #7f9db9);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 8px;
    color: #123;
  }
`;

export const DropdownList = styled.div`
  position: absolute;
  left: -1px;
  right: -1px;
  top: 20px;
  background: #fff;
  border: 1px solid var(--xp-select-border, #7f9db9);
  z-index: 20;

  > div {
    padding: 2px 4px;
  }
  > div[data-selected='true'] {
    background: var(--xp-highlight, #316ac5);
    color: #fff;
  }
`;

/* ---- feature panes ------------------------------------------------------ */

export const Pane = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: #000;
  color: #fff;
  overflow: hidden;
`;

export const PaneHeading = styled.div`
  flex: none;
  padding: 8px 10px 6px;
  font-weight: bold;
  font-size: 13px;
  color: #fff;
  background: linear-gradient(to bottom, #29347c 0, #171d54 100%);
  border-bottom: 1px solid #000;
`;

export const PaneBody = styled.div`
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 12px 14px;
  font-size: 11px;
  line-height: 15px;
  color: #d8d8e4;
`;

/* Header and rows share one scroll container, with the header stuck to its
   top. That keeps them aligned when the list scrolls sideways and leaves the
   vertical scrollbar outside the header instead of clipping the last
   column. */
export const ListScroller = styled.div`
  flex: 1;
  min-height: 0;
  overflow: auto;
`;

export const ListHeader = styled.div`
  display: flex;
  position: sticky;
  top: 0;
  z-index: 2;
  width: max-content;
  min-width: 100%;
  height: 17px;
  font-size: 11px;
  color: #000;
  /* the bar carries the background so it spans the list whatever the
     columns add up to */
  background: linear-gradient(to bottom, #fff 0, #e6e6e6 50%, #cfcfcf 100%);
  border-bottom: 1px solid #7f7f7f;

  > div {
    position: relative;
    box-sizing: border-box;
    padding: 2px 5px 0;
    border-right: 1px solid #b0b0b0;
    overflow: hidden;
    white-space: nowrap;
  }
`;

export const ListRow = styled.div`
  display: flex;
  width: max-content;
  min-width: 100%;
  height: 16px;
  font-size: 11px;
  color: ${({ $selected }) => ($selected ? '#fff' : '#d8d8e4')};
  background: ${({ $selected }) => ($selected ? '#0a246a' : 'transparent')};
  cursor: default;

  > div {
    box-sizing: border-box;
    padding: 1px 5px 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
`;

export const Tree = styled.div`
  flex: none;
  width: 140px;
  overflow: auto;
  padding: 4px 0;
  background: #000;
  border-right: 1px solid #2b3566;
`;

export const TreeNode = styled.div`
  display: flex;
  align-items: center;
  height: 17px;
  padding-left: ${({ $depth }) => 6 + $depth * 14}px;
  font-size: 11px;
  color: ${({ $selected }) => ($selected ? '#fff' : '#c8c8d8')};
  background: ${({ $selected }) => ($selected ? '#0a246a' : 'transparent')};
  white-space: nowrap;
  cursor: default;
`;
