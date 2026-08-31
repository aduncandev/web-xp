/*
 * Wii Shop Channel styling, taken from the channel's own oss.css: a 608x456
 * page (NTSC TV safe area) scaled to fit the window, the real palette
 * (#34BEED blue, #323232 ink, #8C8C8C grey), the real type ramp in the real
 * Wii font, the footer geometry (underButtonL/R at y=378, points at x=241),
 * dotted rules at y=59 and y=363, and the glossy banner buttons drawn with
 * the channel's own images.
 */
import styled, { keyframes } from 'styled-components';

import underBanner from 'assets/store/wii/under_banner_a.gif';
import underBannerHover from 'assets/store/wii/under_banner_b.gif';
import underBannerShadow from 'assets/store/wii/under_banner_shadow.gif';
import buyBanner from 'assets/store/wii/buy_a.gif';
import buyBannerHover from 'assets/store/wii/buy_b.gif';
import bannerShadow from 'assets/store/wii/banner03_shadow.gif';
import wiipointBanner from 'assets/store/wii/Wiipoint_banner_a.gif';
import wiipointBannerHover from 'assets/store/wii/Wiipoint_banner_b.gif';
import optionPill from 'assets/store/wii/option2_a.png';
import optionPillHover from 'assets/store/wii/option2_b.png';
import goShop from 'assets/store/wii/GifA_GoShop_noAction.png';
import goShopHover from 'assets/store/wii/GifA_GoShop_Over.png';
import handCursor from 'assets/store/wii/cursor.png';
import gifaSoft from 'assets/store/wii/GifA_Soft_noAction.png';
import gifaSoftOver from 'assets/store/wii/GifA_Soft_Over.png';
import gifaSoftList from 'assets/store/wii/GifA_SoftList_noAction.png';
import gifaNewsOver from 'assets/store/wii/GifA_News_Over.png';
import hubHalf from 'assets/store/wii/B01_halfbanner_a.png';
import hubHalfOver from 'assets/store/wii/B01_halfbanner_b.png';
import hubFull from 'assets/store/wii/B01_banner_a.png';
import hubFullOver from 'assets/store/wii/B01_banner_b.png';
import sortBanner from 'assets/store/wii/B023_VCsort_a.png';
import sortBannerOver from 'assets/store/wii/B023_VCsort_b.png';
import catCard from 'assets/store/wii/B_04_half_genre_a.png';
import catCardOver from 'assets/store/wii/B_04_half_genre_b.png';
import plateC from 'assets/store/wii/nameplate_C_W_03.png';
import softRow from 'assets/store/wii/B_04_softbanner_a.gif';
import softRowOver from 'assets/store/wii/B_04_softbanner_b.gif';
import pgArrowL from 'assets/store/wii/arrowL_page_a.gif';
import pgArrowLOver from 'assets/store/wii/arrowL_page_b.gif';
import pgArrowR from 'assets/store/wii/arrowR_page_a.gif';
import pgArrowROver from 'assets/store/wii/arrowR_page_b.gif';
import pgShadow from 'assets/store/wii/top_help_shadow02.gif';
import scrollUp from 'assets/store/wii/scroll-arrowup.png';
import scrollDown from 'assets/store/wii/scroll-arrowdown.png';
import detailsPanel from 'assets/store/wii/Details.gif';

export const P = {
  blue: '#34BEED',
  ink: '#323232',
  grey: '#8C8C8C',
  red: '#FF0000',
  orange: '#AA4941',
};

/** The channel's page size (NTSC safe area), scaled to fit the window. */
export const CANVAS_W = 608;
export const CANVAS_H = 456;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const blink = keyframes`
  0%, 55% { opacity: 1; }
  56%, 100% { opacity: 0; }
`;

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

  /* ---------------- the channel's shared chrome ---------------- */

  .pgtitle {
    position: absolute;
    left: 29px;
    top: 22px;
    width: 442px;
    height: 36px;
    font-size: 28px;
    font-weight: bold;
    color: ${P.blue};
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
  }
  .pgtitle--black {
    color: ${P.ink};
  }
  .dots {
    position: absolute;
    left: 4px;
    width: 600px;
    height: 0;
    border-top: 4px dotted #b9b9b9;
    z-index: 4;
    pointer-events: none;
  }
  .dots--top {
    top: 62px;
  }
  .dots--bottom {
    top: 368px;
  }

  /* glossy footer buttons (underButtonL/R geometry from oss.css):
     shadow behind, banner face above it, label on top — the channel's own
     three-layer stack, with the real _b image swap on hover */
  .underbtn {
    position: absolute;
    width: 187px;
    height: 55px;
    font-size: 18px;
    color: ${P.ink};
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 19px;
    z-index: 3;
  }
  .underbtn::before {
    content: '';
    position: absolute;
    left: -12px;
    top: -9px;
    width: 211px;
    height: 75px;
    background: url(${underBannerShadow}) no-repeat center / 100% 100%;
    z-index: 0;
    pointer-events: none;
  }
  .underbtn::after {
    content: '';
    position: absolute;
    inset: 0;
    background: url(${underBanner}) no-repeat center / 100% 100%;
    z-index: 1;
    pointer-events: none;
  }
  .underbtn:hover::after {
    background-image: url(${underBannerHover});
  }
  .underbtn > span {
    position: relative;
    z-index: 2;
  }
  .underbtn--l {
    left: 25px;
    top: 378px;
  }
  .underbtn--r {
    left: 399px;
    top: 378px;
  }
  .underbtn--mid {
    left: 211px;
    top: 378px;
  }
  /* the mid slot lifted above the bottom rule, so the points badge keeps
     its place in the footer */
  .underbtn--midup {
    left: 211px;
    top: 296px;
  }

  /* the Wii Points balance between the footer buttons */
  .points {
    position: absolute;
    left: 241px;
    top: 378px;
    width: 130px;
    text-align: center;
    font-size: 22px;
    color: ${P.blue};
    z-index: 3;
  }
  .points small {
    display: block;
    font-size: 16px;
    color: ${P.blue};
  }

  /* ---------------- splash / loading ---------------- */

  .splashmsg {
    position: absolute;
    left: 0;
    right: 0;
    top: 108px;
    text-align: center;
    font-size: 30px;
    color: ${P.blue};
  }
  .ringwrap {
    position: absolute;
    left: 254px;
    top: 252px;
    width: 100px;
    height: 100px;
  }
  .ringwrap img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  .ringwrap .shadow {
    left: 10px;
    top: 8px;
    opacity: 0.25;
  }
  .ringwrap--spin img.ring,
  .ringwrap--spin img.shadow {
    animation: ${spin} 0.9s linear infinite;
  }

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

  /* ---------------- title lists ---------------- */

  /* the bordered, scrolling title list (B_04): capsule rows on the left,
     the channel's chunky 52px scrollbar on the right */
  .catalogFrame {
    position: absolute;
    left: 36px;
    top: 88px;
    width: 542px;
    height: 266px;
    border: 1px solid #35beed;
    overflow-x: hidden;
    overflow-y: auto;
    padding-top: 24px;
    box-sizing: border-box;
    z-index: 1;
  }
  /* the desktop's Luna scrollbar skin reaches in here with :vertical
     selectors, so these carry the same pseudo-classes to outrank it */
  .catalogFrame::-webkit-scrollbar {
    width: 52px;
  }
  .catalogFrame::-webkit-scrollbar-track,
  .catalogFrame::-webkit-scrollbar-track:vertical {
    background: #cecbce;
    background-image: none;
  }
  .catalogFrame::-webkit-scrollbar-thumb,
  .catalogFrame::-webkit-scrollbar-thumb:vertical {
    background: #f0fbff;
    background-image: none;
  }
  .catalogFrame::-webkit-scrollbar-button:vertical {
    display: block;
    width: 52px;
    height: 52px;
    background: none;
  }
  .catalogFrame::-webkit-scrollbar-button:vertical:decrement {
    background: url(${scrollUp}) no-repeat center / 52px 52px;
  }
  .catalogFrame::-webkit-scrollbar-button:vertical:increment {
    background: url(${scrollDown}) no-repeat center / 52px 52px;
  }
  .catalogFrame::-webkit-scrollbar-button:vertical:start:increment,
  .catalogFrame::-webkit-scrollbar-button:vertical:end:decrement {
    display: none;
  }
  .row {
    display: block;
    position: relative;
    width: 488px;
    height: 91px;
    margin: 0 0 21px 0;
    background: url(${softRow}) no-repeat center / 100% 100%;
    text-align: left;
  }
  .row:hover {
    background-image: url(${softRowOver});
  }
  .row__plate {
    position: absolute;
    left: 18px;
    top: 9px;
    width: 96px;
    height: 72px;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .row__plate img {
    width: 56px;
    height: 56px;
    image-rendering: pixelated;
  }
  .row__name {
    position: absolute;
    left: 120px;
    top: 9px;
    width: 350px;
    font-size: 16px;
    color: ${P.ink};
    white-space: nowrap;
    overflow: hidden;
  }
  .row__new {
    height: 20px;
    margin-left: 10px;
    vertical-align: -4px;
  }
  .row__pub {
    position: absolute;
    left: 120px;
    top: 46px;
    font-size: 14px;
    color: ${P.ink};
  }
  .row__cat {
    position: absolute;
    left: 120px;
    top: 64px;
    font-size: 14px;
    color: ${P.ink};
  }
  .row__price {
    position: absolute;
    right: 18px;
    top: 62px;
    font-size: 16px;
    font-weight: bold;
    color: ${P.ink};
  }

  /* page arrows: the channel's blue squircle buttons beside the counter */
  .pgarrow {
    position: absolute;
    top: 385px;
    width: 52px;
    height: 52px;
    z-index: 3;
    background: no-repeat center / 100% 100%;
  }
  .pgarrow::before {
    content: '';
    position: absolute;
    left: -10px;
    top: -8px;
    width: 72px;
    height: 75px;
    background: url(${pgShadow}) no-repeat center / 100% 100%;
    z-index: -1;
    pointer-events: none;
  }
  .pgarrow--l {
    left: 366px;
    background-image: url(${pgArrowL});
  }
  .pgarrow--l:hover {
    background-image: url(${pgArrowLOver});
  }
  .pgarrow--r {
    left: 526px;
    background-image: url(${pgArrowR});
  }
  .pgarrow--r:hover {
    background-image: url(${pgArrowROver});
  }
  .pgnum {
    position: absolute;
    left: 428px;
    top: 396px;
    width: 92px;
    text-align: center;
    font-size: 18px;
    color: ${P.ink};
    z-index: 3;
  }

  .list__empty {
    margin-top: 86px;
    text-align: center;
    font-size: 18px;
    color: ${P.grey};
  }

  /* ---------------- catalog front page (B_01) ---------------- */

  .hub__sub {
    position: absolute;
    left: 29px;
    top: 80px;
    width: 545px;
    text-align: left;
    font-size: 16px;
    color: ${P.blue};
  }
  .hubbtn {
    position: absolute;
    height: 85px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    color: ${P.ink};
    z-index: 2;
  }
  .hubbtn--half {
    top: 105px;
    width: 260px;
    background: url(${hubHalf}) no-repeat center / 100% 100%;
  }
  .hubbtn--half:hover {
    background-image: url(${hubHalfOver});
  }
  .hubbtn--full {
    left: 28px;
    width: 552px;
    background: url(${hubFull}) no-repeat center / 100% 100%;
  }
  .hubbtn--full:hover {
    background-image: url(${hubFullOver});
  }

  /* the category choice (B_23) and the per-category cards (B_16) */
  .sortbtn {
    position: absolute;
    left: 100px;
    width: 409px;
    height: 86px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    color: ${P.ink};
    background: url(${sortBanner}) no-repeat center / 100% 100%;
    z-index: 2;
  }
  .sortbtn:hover {
    background-image: url(${sortBannerOver});
  }
  .cardbtn {
    position: absolute;
    width: 244px;
    height: 91px;
    background: url(${catCard}) no-repeat center / 100% 100%;
    z-index: 2;
  }
  .cardbtn:hover {
    background-image: url(${catCardOver});
  }
  .cardbtn__name {
    position: absolute;
    left: 12px;
    right: 12px;
    top: 20px;
    text-align: center;
    font-size: 16px;
    color: ${P.ink};
    white-space: nowrap;
    overflow: hidden;
  }
  .cardbtn__count {
    position: absolute;
    right: 22px;
    top: 62px;
    font-size: 14px;
    color: ${P.ink};
  }

  /* ---------------- title page (B_05) ---------------- */

  /* the Details panel (B_05): the channel's own frame art, the banner
     slot at (44,104), info lines at x207, the title centered under the
     baked divider */
  /* drawn at 92% of the template's height so the buy button clears both
     the panel and the bottom rule; x geometry is untouched */
  .b05 {
    position: absolute;
    left: 36px;
    top: 73px;
    width: 537px;
    height: 200px;
    background: url(${detailsPanel}) no-repeat center / 100% 100%;
    z-index: 1;
    text-align: left;
  }
  .b05__shelf {
    position: absolute;
    left: 3px;
    top: 1px;
    font-size: 14px;
    color: #fff;
  }
  .b05__photo {
    position: absolute;
    left: 8px;
    top: 29px;
    width: 160px;
    height: 110px;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .b05__photo img {
    width: 92px;
    height: 92px;
    image-rendering: pixelated;
  }
  .b05__photo img.b05__shot {
    width: 100%;
    height: 100%;
    object-fit: cover;
    image-rendering: auto;
  }
  .b05__desc {
    position: absolute;
    left: 171px;
    top: 26px;
    width: 357px;
    height: 60px;
    overflow: hidden;
    font-size: 12px;
    line-height: 15px;
    color: ${P.ink};
  }
  .b05__released {
    position: absolute;
    left: 171px;
    top: 90px;
    font-size: 16px;
    color: ${P.ink};
  }
  .b05__players {
    position: absolute;
    left: 389px;
    top: 90px;
    font-size: 16px;
    color: ${P.ink};
  }
  .b05__pub {
    position: absolute;
    left: 171px;
    top: 110px;
    width: 357px;
    font-size: 16px;
    color: ${P.ink};
    white-space: nowrap;
    overflow: hidden;
  }
  .b05__cat {
    position: absolute;
    left: 171px;
    top: 129px;
    font-size: 16px;
    color: ${P.ink};
  }
  .b05__name {
    position: absolute;
    left: 0;
    top: 164px;
    width: 100%;
    text-align: center;
    font-size: 17px;
    color: ${P.blue};
    white-space: nowrap;
    overflow: hidden;
  }

  /* the glossy blue buy button (241x76, lifted with the shortened panel
     so it clears the bottom rule) */
  .buybtn {
    position: absolute;
    left: 189px;
    top: 281px;
    width: 241px;
    height: 76px;
    z-index: 2;
    color: #fff;
  }
  .buybtn::before {
    content: '';
    position: absolute;
    left: -17px;
    top: -7px;
    width: 274px;
    height: 90px;
    background: url(${bannerShadow}) no-repeat center / 100% 100%;
    z-index: 0;
    pointer-events: none;
  }
  .buybtn::after {
    content: '';
    position: absolute;
    inset: 0;
    background: url(${buyBanner}) no-repeat center / 100% 100%;
    z-index: 1;
    pointer-events: none;
  }
  .buybtn:hover::after {
    background-image: url(${buyBannerHover});
  }
  .buybtn__act {
    position: absolute;
    left: 0;
    top: 6px;
    width: 100%;
    font-size: 24px;
    z-index: 2;
  }
  .buybtn__price {
    position: absolute;
    left: 0;
    top: 40px;
    width: 100%;
    font-size: 24px;
    z-index: 2;
  }

  /* ---------------- plain content pages ---------------- */

  .details__pv {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 22px;
    height: 30px;
    border: none;
    border-radius: 4px;
    background: rgba(50, 50, 50, 0.35);
    color: #fff;
    font-size: 18px;
    line-height: 1;
    cursor: inherit;
    padding: 0;
  }
  .details__pv:hover {
    background: rgba(52, 190, 237, 0.85);
  }
  .details__pv--l {
    left: 2px;
  }
  .details__pv--r {
    right: 2px;
  }
  .details__pvcount {
    position: absolute;
    right: 4px;
    bottom: 2px;
    font-size: 10px;
    color: #fff;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
  }

  .dlc {
    position: absolute;
    left: 44px;
    right: 44px;
    top: 76px;
    background: #fff;
    border: 1px solid #8cd4ee;
    border-radius: 8px;
    overflow: hidden;
  }
  .dlc__name {
    padding: 11px 10px 9px;
    text-align: center;
    color: #34beed;
    font-size: 20px;
    border-bottom: 1px solid #bfe7f6;
  }
  .dlc__rows {
    padding: 12px 24px 12px;
  }
  .dlc__row {
    display: flex;
    align-items: baseline;
    justify-content: flex-end;
    gap: 16px;
    font-size: 17px;
    line-height: 1.7;
    color: #323232;
  }
  .dlc__label {
    flex: 1;
    text-align: right;
  }
  .dlc__value {
    min-width: 56px;
    text-align: right;
  }
  .dlc__unit {
    min-width: 88px;
    text-align: left;
  }
  .dlc__row--due {
    color: #e60012;
  }
  .dlc__caption {
    background: #5bc9ea;
    color: #fff;
    font-size: 14px;
    padding: 7px 14px;
  }
  .dlc__ask {
    position: absolute;
    left: 60px;
    right: 60px;
    top: 300px;
    text-align: center;
    color: #34beed;
    font-size: 20px;
    line-height: 1.4;
  }
  .dlc__ask--warn {
    color: #e60012;
    font-size: 15px;
  }

  .pts {
    position: absolute;
    left: 64px;
    right: 64px;
    top: 96px;
    text-align: center;
    color: #323232;
  }
  .pts__rate {
    font-size: 16px;
    line-height: 1.6;
    max-width: 470px;
    margin: 0 auto;
  }
  .pts__wallet {
    margin-top: 26px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    img {
      width: 34px;
      image-rendering: pixelated;
    }
    span {
      font-size: 28px;
      color: #34beed;
    }
  }
  .pts__hint {
    margin: 20px auto 0;
    max-width: 440px;
    font-size: 14px;
    line-height: 1.55;
    color: #8c8c8c;
  }

  .acct {
    position: absolute;
    left: 48px;
    right: 48px;
    top: 84px;
    font-size: 16px;
    color: #323232;
  }
  .acct__row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 9px 4px 7px;
    border-bottom: 1px dotted #b4b4b4;
  }
  .acct__label {
    color: #646464;
  }
  .acct__value {
    color: #34beed;
  }

  .content {
    position: absolute;
    left: 66px;
    top: 85px;
    width: 476px;
    font-size: 18px;
    line-height: 24px;
    color: ${P.ink};
    text-align: center;
  }
  .content--left {
    text-align: left;
  }
  .content .blue {
    color: ${P.blue};
  }
  .content .grey {
    color: ${P.grey};
  }
  .content .warn {
    color: ${P.red};
    font-size: 20px;
  }
  /* downloading page */
  .dl__info {
    position: absolute;
    left: 0;
    right: 0;
    top: 80px;
    text-align: center;
    font-size: 21px;
    line-height: 30px;
    color: ${P.ink};
  }
  .dl__info .blue {
    color: ${P.blue};
  }

  /* ------------- Search by Game Title (the Wii keyboard) ------------- */

  .kb {
    position: absolute;
    inset: 0;
    background: #fff;
    z-index: 6;
  }
  .kb__layer {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  .kb__field {
    position: absolute;
    left: 20px;
    top: 16px;
    width: 561px;
    height: 100px;
    box-sizing: border-box;
    background: #fff;
    border: 7px double rgb(109, 211, 227);
    border-radius: 13px;
    padding: 12px 14px 0 12px;
    font-size: 28px;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
  }
  .kb__query {
    color: rgb(41, 99, 190);
  }
  .kb__ph {
    color: ${P.grey};
  }
  .kb__caret {
    display: inline-block;
    width: 2px;
    height: 30px;
    margin-left: 2px;
    vertical-align: -5px;
    background: rgb(41, 99, 190);
    animation: ${blink} 1.1s steps(1) infinite;
  }
  /* keys are a state-colored plate under half-transparent key art, so the
     white / light blue / press tint shows through the same way the real
     keyboard's did */
  .kb__key {
    position: absolute;
    transition: transform 0.05s;
    z-index: 1;
  }
  .kb__key:hover {
    transform: scale(1.5);
    z-index: 2;
  }
  .kb__key--wide:hover {
    transform: scale(1.275);
  }
  .kb__color {
    position: absolute;
    inset: 0;
    border-radius: 6px;
    background: #fff;
    transition: background-color 0.05s;
  }
  .kb__key--wide .kb__color {
    background: #b8ecff;
  }
  .kb__key:hover .kb__color {
    background: #c8c8eb;
  }
  .kb__key--lit .kb__color,
  .kb__key--lit:hover .kb__color {
    background: #cdd264;
  }
  .kb__art {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0.5;
  }
  .kb__cap {
    position: absolute;
    inset: 0;
    top: 1px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    color: ${P.ink};
  }
  .kb__backglyph {
    width: 43px;
    height: 20px;
  }
  .kb__confirm {
    position: absolute;
    top: 388px;
    width: 172px;
    height: 54px;
    transition: transform 0.05s;
    z-index: 1;
  }
  .kb__confirm:hover {
    transform: scale(1.1);
    z-index: 2;
  }
  .kb__confirm .kb__art {
    opacity: 1;
  }
  .kb__cap--confirm {
    font-size: 25px;
  }
`;
