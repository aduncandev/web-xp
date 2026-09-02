// The main menu (W_03): the three catalog panels, the nameplate bubble, the points banner, the option pills and Start Shopping.
import { css } from 'styled-components';

import { P } from './tokens';
import goShop from 'assets/store/wii/GifA_GoShop_noAction.png';
import goShopHover from 'assets/store/wii/GifA_GoShop_Over.png';
import optionPill from 'assets/store/wii/option2_a.png';
import optionPillHover from 'assets/store/wii/option2_b.png';
import plateC from 'assets/store/wii/nameplate_C_W_03.png';
import wiipointBanner from 'assets/store/wii/Wiipoint_banner_a.gif';
import wiipointBannerHover from 'assets/store/wii/Wiipoint_banner_b.gif';

export const mainMenu = css`
  /* ---------------- main menu (W_03) ---------------- */

  .panelbtn {
    position: absolute;
    top: 73px;
    width: 191px;
    height: 149px;
    z-index: 2;
  }
  .panelbtn img {
    width: 100%;
    height: 100%;
  }
  .panelbtn__over {
    position: absolute;
    inset: 0;
    opacity: 0;
    pointer-events: none;
  }
  .panelbtn:hover .panelbtn__over {
    opacity: 1;
  }
  /* the blank panel has no preserved hover face; brighten it instead */
  .panelbtn--flat:hover {
    filter: brightness(1.05) saturate(1.1);
  }

  /* the speech bubble that names a hovered catalog (nameplate slices) */
  .plate {
    position: absolute;
    left: 17px;
    top: 48px;
    width: 577px;
    height: 47px;
    display: flex;
    align-items: flex-start;
    z-index: 5;
    pointer-events: none;
  }
  .plate img {
    flex: none;
  }
  .plate__body {
    flex: none;
    max-width: 200px;
    height: 47px;
    background: url(${plateC}) repeat-x;
    display: flex;
    align-items: center;
    font-size: 14px;
    line-height: 17px;
    color: ${P.ink};
    text-align: left;
  }
  .panelbtn--0 {
    left: 17px;
  }
  .panelbtn--1 {
    left: 210px;
  }
  .panelbtn--2 {
    left: 403px;
  }
  .panelbtn__label {
    position: absolute;
    left: 10px;
    right: 10px;
    top: 101px;
    text-align: center;
    font-size: 18px;
    color: ${P.ink};
  }
  /* the XPWare lockup, drawn in the WiiWare logo's manner */
  .panelbtn__logo {
    position: absolute;
    left: 0;
    right: 0;
    top: 34px;
    text-align: center;
    font-size: 38px;
    font-weight: bold;
    color: #7f7f7f;
    letter-spacing: -2px;
  }
  .panelbtn__logo i {
    font-style: italic;
    color: #35b1e4;
    margin-left: 1px;
  }
  .panelbtn__logo b {
    font-size: 12px;
    font-weight: normal;
    color: #9c9c9c;
    vertical-align: 20px;
    letter-spacing: 0;
  }

  /* Add Wii Points: the 292x69 Wiipoint banner at (158,223) */
  .wpbanner {
    position: absolute;
    left: 158px;
    top: 223px;
    width: 292px;
    height: 69px;
    font-size: 18px;
    color: ${P.ink};
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2;
  }
  .wpbanner::after {
    content: '';
    position: absolute;
    inset: 0;
    background: url(${wiipointBanner}) no-repeat center / 100% 100%;
    z-index: 1;
    pointer-events: none;
  }
  .wpbanner:hover::after {
    background-image: url(${wiipointBannerHover});
  }
  .wpbanner > span {
    position: relative;
    z-index: 2;
  }

  /* the three option pills (184x59 option2 image) at y=303 */
  .pill {
    position: absolute;
    top: 303px;
    width: 184px;
    height: 59px;
    font-size: 17px;
    color: ${P.ink};
    line-height: 19px;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    z-index: 2;
  }
  .pill::after {
    content: '';
    position: absolute;
    inset: 0;
    background: url(${optionPill}) no-repeat center / 100% 100%;
    z-index: 1;
    pointer-events: none;
  }
  .pill:hover::after {
    background-image: url(${optionPillHover});
  }
  .pill > span {
    position: relative;
    z-index: 2;
    padding: 0 14px;
  }
  .pill--0 {
    left: 21px;
  }
  .pill--1 {
    left: 212px;
  }
  .pill--2 {
    left: 403px;
  }

  /* the welcome page's big Start Shopping banner */
  .goshop {
    position: absolute;
    left: 122px;
    top: 378px;
    width: 365px;
    height: 76px;
    font-size: 20px;
    color: ${P.ink};
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 3;
  }
  .goshop::after {
    content: '';
    position: absolute;
    inset: 0;
    background: url(${goShop}) no-repeat center / 100% 100%;
    z-index: 1;
    pointer-events: none;
  }
  .goshop:hover::after {
    background-image: url(${goShopHover});
  }
  .goshop > span {
    position: relative;
    z-index: 2;
  }
`;
