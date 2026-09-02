import { css } from 'styled-components';

// Luna scrollbar chrome from the style's own bitmaps (theme tokens), shared
// by the desktop container and portaled dialogs. Arrow buttons run up, down,
// left, right with normal, hot, pressed and disabled states; the thumb has
// four states and a gripper; the shaft is the track.
const part = (name, n) => `var(--xp-p-${name}-${n}, none)`;
const edges = (name, n) => `var(--xp-pn-${name}-${n}, none)`;
const image = (name, n) => `var(--xp-i-${name}-${n}, none)`;
const glyph = (name, n) => `var(--xp-g-${name}-${n}, none)`;
// A border-image paints over the background, so the arrow's face is the
// plain 17x17 state image under the glyph instead of a nine-slice
const arrow = (dir, base) => `
  & ::-webkit-scrollbar-button:${dir} {
    background-image: ${glyph('scrollbar-arrowbtn', base)}, ${image(
  'scrollbar-arrowbtn',
  base,
)};
  }
  & ::-webkit-scrollbar-button:${dir}:hover {
    background-image: ${glyph('scrollbar-arrowbtn', base + 1)}, ${image(
  'scrollbar-arrowbtn',
  base + 1,
)};
  }
  & ::-webkit-scrollbar-button:${dir}:active {
    background-image: ${glyph('scrollbar-arrowbtn', base + 2)}, ${image(
  'scrollbar-arrowbtn',
  base + 2,
)};
  }
`;
// The thumb's rounded ends are the nine-slice edges; its middle is the
// exporter's -mid slice stretched under the gripper
const thumb = (axis, state) => `
    border-image: ${edges(`scrollbar-thumbbtn${axis}`, state)};
    background-image: var(--xp-i-scrollbar-gripper${axis}-${state}, none), ${image(
  `scrollbar-thumbbtn${axis}-mid`,
  state,
)};
`;

export const lunaScrollbars = css`
  & ::-webkit-scrollbar {
    width: 17px;
    height: 17px;
  }
  & ::-webkit-scrollbar-track,
  & ::-webkit-scrollbar-thumb,
  & ::-webkit-scrollbar-button {
    border: 0 solid transparent;
    image-rendering: pixelated;
  }
  & ::-webkit-scrollbar-thumb {
    background-repeat: no-repeat, no-repeat;
    background-position: center, center;
    background-size: auto, 100% 100%;
  }
  & ::-webkit-scrollbar-track:vertical {
    border-image: ${part('scrollbar-lowertrackvert', 1)};
  }
  & ::-webkit-scrollbar-track:horizontal {
    border-image: ${part('scrollbar-lowertrackhorz', 1)};
  }
  & ::-webkit-scrollbar-thumb:vertical {
    ${thumb('vert', 1)}
  }
  & ::-webkit-scrollbar-thumb:vertical:hover {
    ${thumb('vert', 2)}
  }
  & ::-webkit-scrollbar-thumb:vertical:active {
    ${thumb('vert', 3)}
  }
  & ::-webkit-scrollbar-thumb:horizontal {
    ${thumb('horz', 1)}
  }
  & ::-webkit-scrollbar-thumb:horizontal:hover {
    ${thumb('horz', 2)}
  }
  & ::-webkit-scrollbar-thumb:horizontal:active {
    ${thumb('horz', 3)}
  }
  /* Chromium draws no buttons unless they are given display: block */
  & ::-webkit-scrollbar-button {
    display: block;
    width: 17px;
    height: 17px;
    background-repeat: no-repeat, no-repeat;
    background-position: center, center;
  }
  ${arrow('vertical:decrement', 1)}
  ${arrow('vertical:increment', 5)}
  ${arrow('horizontal:decrement', 9)}
  ${arrow('horizontal:increment', 13)}
  & ::-webkit-scrollbar-button:vertical:start:increment,
  & ::-webkit-scrollbar-button:vertical:end:decrement,
  & ::-webkit-scrollbar-button:horizontal:start:increment,
  & ::-webkit-scrollbar-button:horizontal:end:decrement {
    display: none;
  }
  & ::-webkit-scrollbar-corner {
    background: var(--xp-face, #ece9d8);
  }
`;
