import { css } from 'styled-components';

import { getArt } from '../xpArt';

// Luna scrollbar chrome (bitmaps cropped from real XP screenshots), shared
// by the desktop container and portaled dialogs — portals render outside
// the WinXP container, so its scoped scrollbar styles don't reach them.
const sbUrl = name => {
  const url = getArt(name, null);
  return url ? `url(${url})` : 'none';
};

export const lunaScrollbars = css`
  & ::-webkit-scrollbar {
    width: 17px;
    height: 17px;
  }
  & ::-webkit-scrollbar-track:vertical {
    background: ${sbUrl('scroll-track-v')} repeat-y;
  }
  & ::-webkit-scrollbar-track:horizontal {
    background: ${sbUrl('scroll-track-h')} repeat-x;
  }
  & ::-webkit-scrollbar-thumb:vertical {
    background-image: ${sbUrl('scroll-thumb-v-grip')},
      ${sbUrl('scroll-thumb-v-top')}, ${sbUrl('scroll-thumb-v-bottom')},
      ${sbUrl('scroll-thumb-v-mid')};
    background-repeat: no-repeat, no-repeat, no-repeat, repeat-y;
    background-position: center, left top, left bottom, left top;
  }
  & ::-webkit-scrollbar-thumb:horizontal {
    background-image: ${sbUrl('scroll-thumb-h-grip')},
      ${sbUrl('scroll-thumb-h-left')}, ${sbUrl('scroll-thumb-h-right')},
      ${sbUrl('scroll-thumb-h-mid')};
    background-repeat: no-repeat, no-repeat, no-repeat, repeat-x;
    background-position: center, left top, right top, left top;
  }
  & ::-webkit-scrollbar-button {
    width: 17px;
    height: 17px;
    background-repeat: no-repeat;
  }
  & ::-webkit-scrollbar-button:vertical:decrement {
    background-image: ${sbUrl('scroll-up')};
  }
  & ::-webkit-scrollbar-button:vertical:increment {
    background-image: ${sbUrl('scroll-down')};
  }
  & ::-webkit-scrollbar-button:horizontal:decrement {
    background-image: ${sbUrl('scroll-left')};
  }
  & ::-webkit-scrollbar-button:horizontal:increment {
    background-image: ${sbUrl('scroll-right')};
  }
  & ::-webkit-scrollbar-button:vertical:start:increment,
  & ::-webkit-scrollbar-button:vertical:end:decrement,
  & ::-webkit-scrollbar-button:horizontal:start:increment,
  & ::-webkit-scrollbar-button:horizontal:end:decrement {
    display: none;
  }
  & ::-webkit-scrollbar-thumb:hover,
  & ::-webkit-scrollbar-button:hover {
    filter: brightness(1.05);
  }
`;

export default lunaScrollbars;
