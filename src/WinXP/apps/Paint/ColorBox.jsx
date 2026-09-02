// The color box: the foreground over background indicator and the palette.
// Left button sets the foreground, right the background, a double-click
// opens the color editor on that slot.
import React from 'react';

export default function ColorBox({ fg, bg, palette, onPickFg, onPickBg, onEdit }) {
  return (
    <div className="paint__colorbox">
      <div className="paint__indicator">
        <div className="paint__indicator-swatch paint__indicator-swatch--bg">
          <div style={{ backgroundColor: bg }} />
        </div>
        <div className="paint__indicator-swatch paint__indicator-swatch--fg">
          <div style={{ backgroundColor: fg }} />
        </div>
      </div>
      <div className="paint__swatches">
        {palette.map((color, i) => (
          <div
            key={i}
            className="paint__swatch"
            onMouseDown={e => {
              if (e.button === 0) onPickFg(color, i);
            }}
            onContextMenu={e => {
              e.preventDefault();
              onPickBg(color);
            }}
            onDoubleClick={() => onEdit(i)}
          >
            <div style={{ backgroundColor: color }} />
          </div>
        ))}
      </div>
    </div>
  );
}
