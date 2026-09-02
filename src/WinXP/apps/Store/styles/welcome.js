// The welcome page (W_01): the themed shelf, its drifting arrows and the Important Info panel.
import { css } from 'styled-components';

import { P } from './tokens';
import gifaNewsOver from 'assets/store/wii/GifA_News_Over.png';
import gifaSoft from 'assets/store/wii/GifA_Soft_noAction.png';
import gifaSoftList from 'assets/store/wii/GifA_SoftList_noAction.png';
import gifaSoftOver from 'assets/store/wii/GifA_Soft_Over.png';

export const welcome = css`
  /* ---------------- welcome (W_01) ---------------- */

  .bgart {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  /* the themed shelf: heading banner, four title capsules, side arrows
     (geometry from the preserved W_01 page) */
  .wg__head {
    position: absolute;
    left: 29px;
    top: 25px;
    width: 551px;
    height: 42px;
    background: url(${gifaSoftList}) no-repeat center / 100% 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 30px;
    color: ${P.blue};
    z-index: 2;
  }
  .wg__cell {
    position: absolute;
    width: 273px;
    height: 74px;
    background: url(${gifaSoft}) no-repeat center / 100% 100%;
    text-align: left;
    z-index: 2;
  }
  .wg__cell:hover {
    background-image: url(${gifaSoftOver});
  }
  /* a white plate fills the capsule's banner slot, so its baked drop
     shadow frames the plate instead of bleeding through our icons */
  .wg__plate {
    position: absolute;
    left: 9px;
    top: 10px;
    width: 72px;
    height: 54px;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .wg__icon {
    width: 44px;
    height: 44px;
    image-rendering: pixelated;
  }
  .wg__new {
    position: absolute;
    left: 6px;
    top: 5px;
    height: 16px;
    z-index: 3;
  }
  .wg__txt {
    position: absolute;
    left: 90px;
    top: 6px;
    right: 12px;
    bottom: 6px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 7px;
    font-size: 14px;
    line-height: 17px;
    color: ${P.ink};
  }
  .wg__name {
    max-height: 34px;
    overflow: hidden;
  }
  /* the arrows breathe and drift like the real page; the component drives
     frame and position, hover swaps in the _S face */
  .wgarrow {
    position: absolute;
    top: 118px;
    width: 44px;
    height: 68px;
    z-index: 3;
  }
  .wgarrow img {
    width: 100%;
    height: 100%;
  }
  .wgarrow:active img {
    filter: brightness(0.9);
  }

  /* the Important Info panel frame is part of Welcome_BG_E.png; these
     position content within it */
  .info__head {
    position: absolute;
    left: 48px;
    top: 234px;
    width: 512px;
    text-align: center;
    font-size: 16px;
    font-weight: bold;
    color: #fff;
  }
  .info__rows {
    position: absolute;
    left: 56px;
    top: 262px;
    width: 496px;
  }
  .info__new {
    height: 15px;
    margin-right: 8px;
    vertical-align: -2px;
  }
  .info__row {
    display: block;
    width: 100%;
    text-align: left;
    font-size: 16px;
    color: ${P.ink};
    padding: 5px 10px;
    box-sizing: border-box;
  }
  .info__row:nth-child(even) {
    background: #e2f5fc;
  }
  .info__row:hover {
    background: url(${gifaNewsOver}) no-repeat center / 100% 100%;
  }
  /* the panel pages three rows at a time; the chevrons ride the ends of
     the Important Info header band */
  .info__nav {
    position: absolute;
    top: 231px;
    width: 26px;
    height: 26px;
    font-size: 21px;
    line-height: 25px;
    color: #fff;
    text-align: center;
    z-index: 2;
  }
  .info__nav:hover {
    text-shadow: 0 0 4px rgba(255, 255, 255, 0.9);
  }
  .info__nav--l {
    left: 52px;
  }
  .info__nav--r {
    left: 530px;
  }
  .info__nav.is-off {
    visibility: hidden;
  }
`;
