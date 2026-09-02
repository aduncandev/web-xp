// sndvol32's frame: the Luna green-capped thumb on a 2px groove, columns
// of a fixed width separated by etched rules, a device status bar.
import styled from 'styled-components';

import volumeThumb from 'assets/xp/VolumeThumb.png';

/** One column with its separator; the window is sized in these. */
export const COLUMN_WIDTH = 111;
export const BASE_WIDTH = 10;
export const WINDOW_HEIGHT = 300;

export const Root = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: var(--xp-face, #ece9d8);
  font-family: Tahoma, 'Noto Sans', sans-serif;
  font-size: 11px;
  user-select: none;

  .vc__menus {
    height: 20px;
    background: var(--xp-face, #ece9d8);
    border-bottom: 1px solid #d8d2bd;
    padding-left: 2px;
    flex-shrink: 0;
  }
  .vc__body {
    flex: 1;
    display: flex;
    padding: 6px 4px 4px 8px;
    min-height: 0;
  }
  .vc__channel {
    width: 100px;
    display: flex;
    flex-direction: column;
    padding: 2px 6px 4px;
  }
  .vc__sep {
    width: 2px;
    align-self: stretch;
    margin: 2px 2px;
    border-left: 1px solid var(--xp-face-shadow, #aca899);
    border-right: 1px solid #ffffff;
  }
  /* two lines, so a long program name keeps its column in step */
  .vc__title {
    height: 26px;
    line-height: 13px;
    margin-bottom: 2px;
    overflow: hidden;
  }
  .vc__balance-label,
  .vc__volume-label {
    margin-bottom: 3px;
  }
  .vc__balance {
    margin-bottom: 8px;
  }
  .vc__balance-row {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  /* Small horizontal balance slider */
  .vc__hslider {
    width: 52px;
    height: 18px;
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
  }
  .vc__hslider::-webkit-slider-runnable-track {
    height: 2px;
    border-radius: 1px;
    background: #9a9a91;
    box-shadow: 0 1px 0 #ffffff;
  }
  .vc__hslider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 11px;
    height: 18px;
    margin-top: -8px;
    border: none;
    background: url(${volumeThumb}) no-repeat center / 11px 22px;
  }
  .vc__hslider::-moz-range-track {
    height: 2px;
    background: #9a9a91;
    box-shadow: 0 1px 0 #ffffff;
  }
  .vc__hslider::-moz-range-thumb {
    width: 11px;
    height: 18px;
    border: none;
    border-radius: 0;
    background: url(${volumeThumb}) no-repeat center / 11px 22px;
  }

  /* Vertical volume slider: rotated horizontal range, max at the top */
  .vc__vslider-box {
    width: 30px;
    height: 96px;
    position: relative;
    align-self: center;
    flex-shrink: 0;
  }
  .vc__vslider {
    width: 96px;
    height: 30px;
    margin: 0;
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%) rotate(-90deg);
  }
  .vc__vslider::-webkit-slider-runnable-track {
    height: 2px;
    border-radius: 1px;
    background: #9a9a91;
    box-shadow: 0 1px 0 #ffffff;
  }
  .vc__vslider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 11px;
    height: 22px;
    margin-top: -10px;
    border: none;
    background: url(${volumeThumb}) no-repeat center;
  }
  .vc__vslider::-moz-range-track {
    height: 2px;
    background: #9a9a91;
    box-shadow: 0 1px 0 #ffffff;
  }
  .vc__vslider::-moz-range-thumb {
    width: 11px;
    height: 22px;
    border: none;
    border-radius: 0;
    background: url(${volumeThumb}) no-repeat center;
  }

  .vc__mute {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 8px;

    input {
      margin: 0;
    }
  }
  .vc__status {
    flex-shrink: 0;
    border-top: 1px solid #ffffff;
    box-shadow: 0 -1px 0 var(--xp-face-shadow, #aca899);
    padding: 2px 6px;
    background: var(--xp-face, #ece9d8);
  }
`;
