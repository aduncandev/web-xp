// The channel's shared chrome (page titles, the dotted rules, the glossy footer buttons, the points badge) and the splash ring.
import { css } from 'styled-components';

import { P, spin } from './tokens';
import underBanner from 'assets/store/wii/under_banner_a.gif';
import underBannerHover from 'assets/store/wii/under_banner_b.gif';
import underBannerShadow from 'assets/store/wii/under_banner_shadow.gif';

export const chrome = css`
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
`;
