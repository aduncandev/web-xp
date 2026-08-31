import React from 'react';
import styled from 'styled-components';

import { getArt } from '../../../xpArt';

/**
 * The shimgvw.dll toolbar, in the real viewer's order.
 *
 * The glyphs are `pfv-<key>.png` in src/assets/xp/ — 16x16 crops of the real
 * shimgvw toolbar, cut at 1:1 from an XP screenshot. The FALLBACKS below are
 * the nearest XPIcons assets, kept only as a safety net if a crop goes
 * missing.
 */
const FALLBACKS = {
  prev: 'Back',
  next: 'Forward',
  fit: 'FullScreen',
  actual: 'Maximize',
  slideshow: 'Slideshow',
  zoomIn: 'IEEnlargeImage',
  zoomOut: 'IEShrinkImage',
  rotateCw: 'ThumbnailView',
  rotateCcw: 'IconView',
  delete: 'Delete',
  print: 'Printer',
  copyTo: 'CopyTo',
  edit: 'IEEdit',
  help: 'Question',
};

export const TOOL_BUTTONS = [
  { key: 'prev', label: 'Previous Image' },
  { key: 'next', label: 'Next Image' },
  { key: 'sep1', type: 'separator' },
  { key: 'fit', label: 'Best Fit' },
  { key: 'actual', label: 'Actual Size' },
  { key: 'slideshow', label: 'Start Slide Show' },
  { key: 'sep2', type: 'separator' },
  { key: 'zoomIn', label: 'Zoom In' },
  { key: 'zoomOut', label: 'Zoom Out' },
  { key: 'sep3', type: 'separator' },
  { key: 'rotateCw', label: 'Rotate Clockwise' },
  { key: 'rotateCcw', label: 'Rotate Counterclockwise' },
  { key: 'sep4', type: 'separator' },
  { key: 'delete', label: 'Delete' },
  { key: 'print', label: 'Print' },
  { key: 'copyTo', label: 'Copy To' },
  { key: 'edit', label: 'Open for editing' },
  { key: 'sep5', type: 'separator' },
  { key: 'help', label: 'Help' },
];

export function ToolIcon({ name, disabled }) {
  const src = getArt(`pfv-${name}`, getArt(FALLBACKS[name], null));
  if (!src) return null;
  return <Glyph src={src} alt="" draggable={false} $disabled={disabled} />;
}

const Glyph = styled.img`
  width: 16px;
  height: 16px;
  /* XP greys a disabled toolbar glyph rather than hiding it */
  filter: ${({ $disabled }) =>
    $disabled ? 'grayscale(1) opacity(0.4)' : 'none'};
`;

export default TOOL_BUTTONS;
