/*
 * The Windows Media Player 8 skin, rebuilt from the real thing.
 *
 * Every bitmap under ./skin was extracted from WMPLOC.DLL 8.00.00.4477 (the
 * copy on the Windows XP RTM disc) with its #FF00FF colour key turned into
 * real alpha, and every coordinate below comes from MAINAPPSKIN.WMS — the
 * player's own skin definition, which ships in the same DLL. So this is not
 * an impression of the layout, it is the layout: `taskCntrSubview` really is
 * at left 88 / top 37 with a 9px right and 79px bottom margin, the transport
 * really is a 310x62 panel at left 89, and the play button really does sit
 * at (41,10) inside it.
 *
 * Names in comments are the skin's own element ids so the two can be diffed.
 */
import styled, { css } from 'styled-components';

import apptopleft from './skin/apptopleft.png';
import apptopleftBorder from './skin/apptopleft_border.png';
import apptopleftBorderHide from './skin/apptopleft_border_hide.png';
import appfilltop from './skin/appfilltop.png';
import appfilltopBorder from './skin/appfilltop_border.png';
import apptopright from './skin/apptopright.png';
import apptoprightBorder from './skin/apptopright_border.png';
import appfillleft from './skin/appfillleft.png';
import appfillleftBorder from './skin/appfillleft_border.png';
import appfillleftHide from './skin/appfillleft_hide.png';
import appfillright from './skin/appfillright.png';
import appbottomleft from './skin/appbottomleft.png';
import appbottomleftBorder from './skin/appbottomleft_border.png';
import appbottomCenterBorder from './skin/appbottom_center_border.png';
import appfillbottom from './skin/appfillbottom.png';
import appfillbottomBorder from './skin/appfillbottom_border.png';
import appbottomright from './skin/appbottomright.png';
import appbottomrightBorder from './skin/appbottomright_border.png';
import brandlogoUp from './skin/brandlogo_up.png';
import windowsbrandUp from './skin/windowsbrand_up.png';
import taskGroupUp from './skin/taskbar_buttongroup_up.png';
import taskGroupHover from './skin/taskbar_buttongroup_hover.png';
import taskGroupDown from './skin/taskbar_buttongroup_down.png';
import handleCloseUp from './skin/taskbar_handle_close_up.png';
import handleCloseHover from './skin/taskbar_handle_close_hover.png';
import handleOpenUp from './skin/taskbar_handle_open_up.png';
import handleOpenHover from './skin/taskbar_handle_open_hover.png';
import appscrollup from './skin/appscrollup.png';
import appscrolldown from './skin/appscrolldown.png';

/* ---- metrics, straight out of MAINAPPSKIN.WMS --------------------------- */

export const M = {
  taskbarWidth: 88, // svTaskButtons.width
  taskbarShift: 79, // g_kTaskBarWidth — how far the app slides when hidden
  topLeft: { w: 94, h: 59 }, // apptopleft.bmp
  topRight: { w: 298, h: 53 }, // apptopright.bmp
  fillTopH: 37,
  fillRightW: 9,
  bottomH: 79, // appfillbottom.bmp
  bottomLeft: { w: 308, h: 134 }, // appbottomleft.bmp
  content: { left: 88, top: 37, right: 9, bottom: 79 }, // taskCntrSubview
  marquee: { left: 92, right: 19, height: 17, fromBottom: 59 }, // svMarquee
  transport: { left: 89, width: 310, height: 62 }, // svTransport
  gotoSkin: { left: 380, fromBottom: 32, w: 30, h: 25 }, // svGotoSkin
  taskButtons: { top: 56, fromBottom: 134 },
  // taskbar_buttongroup_map.bmp: seven bands, the first one 42px tall
  taskRows: [0, 42, 82, 122, 162, 202, 242],
  taskRowH: [42, 40, 40, 40, 40, 40, 40],
  taskGroupW: 79,
  taskGroupH: 282,
  captionTops: [5, 45, 85, 125, 165, 205, 245], // taskBtn*Caption
  prevNext: { prev: 29, total: 59, h: 20 }, // btngroup_colormap.bmp
};

// g_kMEDIUM_FONTFACE / SIZE / STYLE are RT_STRING #1891-#1893 ("Arial",
// "10", "bold"); the taskbar captions and the marquee use MEDIUM-1.
export const FONT = {
  face: 'Arial, Helvetica, sans-serif',
  caption: '12px',
};

/* ---- shared pieces ------------------------------------------------------ */

const abs = css`
  position: absolute;
  background-repeat: no-repeat;
`;

export const Body = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #000;
  /* The client area opens with a 1px white rule under the menu bar before
     the skin's own art begins — the reference capture has it across the
     full width. */
  border-top: 1px solid #fff;
  font-family: Tahoma, 'Noto Sans', sans-serif;
  font-size: 11px;
  user-select: none;
  cursor: default;
  /* XP anti-aliased these captions in greyscale; without this the browser
     adds subpixel colour fringing that reads as tinted text. */
  -webkit-font-smoothing: antialiased;
`;

/** Slides the whole player left when the feature taskbar is hidden, exactly
 *  as svEntireApp does. */
export const AppShift = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  /* svEntireApp keeps its right edge on the frame and grows leftwards, so
     only the left offset moves. */
  left: ${({ $taskbar }) => ($taskbar ? 0 : -M.taskbarShift)}px;
  right: 0;
`;

/** A button whose three states are three bitmaps. */
export const SkinBtn = styled.button`
  ${abs};
  padding: 0;
  border: 0;
  background-color: transparent;
  background-image: url(${({ $up }) => $up});
  cursor: pointer;
  &:hover {
    background-image: url(${({ $hover, $up }) => $hover || $up});
  }
  &:active {
    background-image: url(${({ $down, $hover, $up }) =>
      $down || $hover || $up});
  }
  &:disabled {
    cursor: default;
    background-image: url(${({ $disabled, $up }) => $disabled || $up});
  }
`;

/* ---- window frame ------------------------------------------------------- */

/* The corner is three stacked pieces in the skin: svUpperLeftCorner, then
   svUpperLeftCorner_border at zIndex 2, then TaskBarVisibleMaster — which
   only shows while the feature taskbar is out — at top 15, zIndex 10. */
export const TopLeft = styled.div`
  ${abs};
  left: 0;
  top: 0;
  width: ${M.topLeft.w}px;
  height: ${M.topLeft.h}px;
  background-image: url(${apptopleftBorder}), url(${apptopleft});
`;

export const ScrollUp = styled.div`
  ${abs};
  left: 0;
  top: 15px;
  width: 94px;
  height: 44px;
  background-image: url(${appscrollup});
  z-index: 10;
`;

/** svAppScrollDown — the matching piece at the foot of the taskbar. */
export const ScrollDown = styled.div`
  ${abs};
  left: 0;
  /* appscrolldown.bmp is 91x74 and its top lines up with appBottomLeft's */
  bottom: ${M.bottomLeft.h - 74}px;
  width: 91px;
  height: 74px;
  background-image: url(${appscrolldown});
  z-index: 10;
`;

/** The stub of the corner that stays put when the taskbar hides. */
export const TopLeftHide = styled.div`
  ${abs};
  left: 79px;
  top: 0;
  width: 42px;
  height: ${M.topLeft.h}px;
  background-image: url(${apptopleftBorderHide});
`;

export const FillTop = styled.div`
  ${abs};
  left: ${M.topLeft.w}px;
  right: ${M.topRight.w}px;
  top: 0;
  height: ${M.fillTopH}px;
  background-image: url(${appfilltopBorder}), url(${appfilltop});
  background-repeat: repeat-x, repeat-x;
`;

export const TopRight = styled.div`
  ${abs};
  right: 0;
  top: 0;
  width: ${M.topRight.w}px;
  height: ${M.topRight.h}px;
  background-image: url(${apptoprightBorder}), url(${apptopright});
`;

export const FillLeft = styled.div`
  ${abs};
  left: 0;
  top: ${M.taskButtons.top}px;
  bottom: ${M.taskButtons.fromBottom}px;
  width: ${M.taskbarWidth}px;
  background-image: url(${appfillleft});
  background-repeat: repeat-y;

  /* the 1px rule down the very left edge (appfillleft_border.bmp) */
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 1px;
    background: url(${appfillleftBorder}) repeat-y;
  }
`;

/* svAppFillLeft_hide: an 18px box carrying the 9px strip, tiled both ways.
   The app shift puts its left half off the frame, so the visible 9px is the
   second tile — without repeat-x that half comes out empty and the closed
   taskbar loses the piece joining the top corner to the deck. */
export const FillLeftHide = styled.div`
  ${abs};
  left: 70px;
  top: 59px;
  bottom: 132px;
  width: 18px;
  background-image: url(${appfillleftHide});
  background-repeat: repeat;
`;

export const FillRight = styled.div`
  ${abs};
  right: 0;
  top: 53px;
  bottom: ${M.bottomH}px;
  width: ${M.fillRightW}px;
  background-image: url(${appfillright});
  background-repeat: repeat-y;
`;

export const BottomLeft = styled.div`
  ${abs};
  left: 79px;
  bottom: 0;
  width: ${M.bottomLeft.w}px;
  height: ${M.bottomLeft.h}px;
  background-image: url(${appbottomleft});
`;

/** appBottomLeft_border — carries the Windows Media Player wordmark. */
export const BottomLeftBorder = styled.div`
  ${abs};
  left: 0;
  bottom: 0;
  width: ${M.bottomLeft.w + 79}px;
  height: ${M.bottomLeft.h}px;
  background-image: url(${appbottomleftBorder}), url(${appbottomCenterBorder});
  background-position: 0 42px, 329px 102px;
`;

export const BrandLogo = styled.div`
  ${abs};
  left: 15px;
  bottom: ${M.bottomLeft.h - 68 - 61}px;
  width: 67px;
  height: 61px;
  background-image: url(${brandlogoUp});
`;

export const WindowsBrand = styled.div`
  ${abs};
  left: 24px;
  bottom: ${M.bottomLeft.h - 13 - 32}px;
  width: 40px;
  height: 32px;
  background-image: url(${windowsbrandUp});
`;

export const FillBottom = styled.div`
  ${abs};
  left: 387px;
  right: 30px;
  bottom: 0;
  height: ${M.bottomH}px;
  background-image: url(${appfillbottomBorder}), url(${appfillbottom});
  background-repeat: repeat-x, repeat-x;
`;

export const BottomRight = styled.div`
  ${abs};
  right: 0;
  bottom: 0;
  width: 30px;
  height: ${M.bottomH}px;
  background-image: url(${appbottomrightBorder}), url(${appbottomright});
`;

/* ---- feature taskbar ---------------------------------------------------- */

export const TaskButtons = styled.div`
  ${abs};
  left: 0;
  top: ${M.taskButtons.top}px;
  bottom: ${M.taskButtons.fromBottom}px;
  width: ${M.taskbarWidth}px;
  overflow: hidden;
  z-index: 10;
`;

export const TaskGroup = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  width: ${M.taskGroupW}px;
  height: ${M.taskGroupH}px;
  background: url(${taskGroupUp}) no-repeat;
`;

/** Hover and selected are the same sheet, clipped to the one row the skin's
 *  colour map assigns to that button. */
export const TaskRow = styled.div`
  position: absolute;
  left: 0;
  width: ${M.taskGroupW}px;
  background-image: url(${({ $state }) =>
    $state === 'down' ? taskGroupDown : taskGroupHover});
  background-repeat: no-repeat;
  pointer-events: none;
`;

export const TaskCaption = styled.div`
  position: absolute;
  left: 8px;
  margin-top: 1px;
  width: 68px;
  font-family: ${FONT.face};
  font-size: ${FONT.caption};
  font-weight: bold;
  line-height: 15px;
  color: #fff;
  white-space: pre;
  pointer-events: none;
`;

export const TaskHit = styled.button`
  position: absolute;
  left: 0;
  width: ${M.taskGroupW}px;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
`;

export const TaskHandle = styled.button`
  ${abs};
  /* The handle rides with svEntireApp, so it keeps the same offset whether
     the taskbar is out or not — when hidden, the -79 app shift is what
     brings it to the frame's edge. Moving it here as well would push it
     off-screen and leave no way to bring the taskbar back. */
  left: 79px;
  top: 50%;
  margin-top: -37px;
  width: 9px;
  height: 74px;
  padding: 0;
  border: 0;
  background-color: transparent;
  background-image: url(${({ $open }) =>
    $open ? handleOpenUp : handleCloseUp});
  cursor: pointer;
  z-index: 200;
  &:hover {
    background-image: url(${({ $open }) =>
      $open ? handleOpenHover : handleCloseHover});
  }
`;

/* ---- content pane ------------------------------------------------------- */

export const Content = styled.div`
  position: absolute;
  left: ${M.content.left}px;
  top: ${M.content.top}px;
  right: ${M.content.right}px;
  bottom: ${M.content.bottom}px;
  display: flex;
  background: #000;
  overflow: hidden;
`;

/* ---- marquee (the status strip) ----------------------------------------- */

export const Marquee = styled.div`
  position: absolute;
  left: ${M.marquee.left}px;
  right: ${M.marquee.right}px;
  bottom: ${M.marquee.fromBottom}px;
  height: ${M.marquee.height}px;
  z-index: 2;

  .wmp__state {
    position: absolute;
    left: 9px;
    top: 1px;
  }
  .wmp__meta,
  .wmp__time {
    position: absolute;
    top: 0;
    font-family: ${FONT.face};
    font-size: 12px;
    font-weight: bold;
    line-height: 17px;
    color: #00ff00;
    white-space: nowrap;
    overflow: hidden;
  }
  .wmp__meta {
    left: 52px;
    right: 62px;
  }
  .wmp__time {
    right: 0;
  }
`;

/* ---- transport ---------------------------------------------------------- */

export const Transport = styled.div`
  position: absolute;
  left: ${M.transport.left}px;
  bottom: 0;
  width: ${M.transport.width}px;
  height: ${M.transport.height}px;
  z-index: 4;
`;

/** seekslider / volumeslider: a background, a foreground clipped to the
 *  current value, and a thumb — three bitmaps, as the skin declares. */
export const Slider = styled.div`
  position: absolute;
  height: 22px;
  cursor: pointer;

  .wmp__sl-bkg,
  .wmp__sl-fore {
    position: absolute;
    left: 0;
    top: 0;
    height: 22px;
    background-repeat: no-repeat;
  }
  .wmp__sl-fore {
    overflow: hidden;
  }
  .wmp__sl-thumb {
    position: absolute;
    top: 0;
    width: 22px;
    height: 22px;
    margin-left: -11px;
    background-repeat: no-repeat;
    pointer-events: none;
  }
`;

export const GotoSkin = styled.div`
  position: absolute;
  left: ${M.gotoSkin.left}px;
  bottom: ${M.gotoSkin.fromBottom}px;
  width: ${M.gotoSkin.w}px;
  height: ${M.gotoSkin.h}px;
  z-index: 100;
`;
