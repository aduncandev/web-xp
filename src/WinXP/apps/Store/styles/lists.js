// Title lists (B_04) with their page arrows, the catalog front page (B_01), the category choice (B_23) and the category cards (B_16).
import { css } from 'styled-components';

import { P } from './tokens';
import catCard from 'assets/store/wii/B_04_half_genre_a.png';
import catCardOver from 'assets/store/wii/B_04_half_genre_b.png';
import hubFull from 'assets/store/wii/B01_banner_a.png';
import hubFullOver from 'assets/store/wii/B01_banner_b.png';
import hubHalf from 'assets/store/wii/B01_halfbanner_a.png';
import hubHalfOver from 'assets/store/wii/B01_halfbanner_b.png';
import pgArrowL from 'assets/store/wii/arrowL_page_a.gif';
import pgArrowLOver from 'assets/store/wii/arrowL_page_b.gif';
import pgArrowR from 'assets/store/wii/arrowR_page_a.gif';
import pgArrowROver from 'assets/store/wii/arrowR_page_b.gif';
import pgShadow from 'assets/store/wii/top_help_shadow02.gif';
import scrollDown from 'assets/store/wii/scroll-arrowdown.png';
import scrollUp from 'assets/store/wii/scroll-arrowup.png';
import softRow from 'assets/store/wii/B_04_softbanner_a.gif';
import softRowOver from 'assets/store/wii/B_04_softbanner_b.gif';
import sortBanner from 'assets/store/wii/B023_VCsort_a.png';
import sortBannerOver from 'assets/store/wii/B023_VCsort_b.png';

export const lists = css`
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
`;
