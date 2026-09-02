// The title page (B_05): the Details panel and the buy button.
import { css } from 'styled-components';

import { P } from './tokens';
import bannerShadow from 'assets/store/wii/banner03_shadow.gif';
import buyBanner from 'assets/store/wii/buy_a.gif';
import buyBannerHover from 'assets/store/wii/buy_b.gif';
import detailsPanel from 'assets/store/wii/Details.gif';

export const titlePage = css`
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
`;
