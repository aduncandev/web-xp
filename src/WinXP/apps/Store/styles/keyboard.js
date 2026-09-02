// Search by Game Title: the Wii keyboard.
import { css } from 'styled-components';

import { P, blink } from './tokens';

export const keyboard = css`
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
