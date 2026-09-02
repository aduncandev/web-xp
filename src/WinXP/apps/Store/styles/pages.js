// The plain content pages: confirmation, download, account, points, settings and the info pages.
import { css } from 'styled-components';

import { P } from './tokens';
export const pages = css`
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
`;
