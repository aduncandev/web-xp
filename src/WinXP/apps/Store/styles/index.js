/*
 * The XP Shop's stylesheet, a port of the Wii Shop Channel's oss.css split
 * by page. `Shell` fills the window; `.cvs` is the channel's 608x456 page,
 * scaled to fit. The fragments concatenate in their original order, so a
 * rule's position relative to the others is unchanged.
 */
import styled from 'styled-components';

import { P, CANVAS_W, CANVAS_H } from './tokens';
import handCursor from 'assets/store/wii/cursor.png';
import { chrome } from './chrome';
import { welcome } from './welcome';
import { mainMenu } from './mainMenu';
import { lists } from './lists';
import { titlePage } from './titlePage';
import { pages } from './pages';
import { keyboard } from './keyboard';

export { P, CANVAS_W, CANVAS_H } from './tokens';

export const Shell = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #fff;
  user-select: none;

  .cvs {
    position: absolute;
    left: 50%;
    top: 50%;
    width: ${CANVAS_W}px;
    height: ${CANVAS_H}px;
    background: #fff;
    font-family: 'Wii NTLG PGothic', 'Rodin', 'Hiragino Maru Gothic ProN',
      'Arial Rounded MT Bold', sans-serif;
    color: ${P.ink};
    cursor: url(${handCursor}) 9 1, auto;
  }
  .cvs button {
    cursor: url(${handCursor}) 9 1, pointer;
  }

  button {
    font: inherit;
    color: inherit;
    border: none;
    background: none;
    padding: 0;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  img {
    -webkit-user-drag: none;
  }

  ${chrome}
  ${welcome}
  ${mainMenu}
  ${lists}
  ${titlePage}
  ${pages}
  ${keyboard}
`;
