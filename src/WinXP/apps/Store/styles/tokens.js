// The channel's palette, page size and the two keyframes the pages share.
import { keyframes } from 'styled-components';

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

export const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

export const blink = keyframes`
  0%, 55% { opacity: 1; }
  56%, 100% { opacity: 0; }
`;
