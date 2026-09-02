// The box under the tools: the choices the current tool offers (line
// widths, fill styles, brush shapes, eraser and airbrush sizes, zoom
// levels, opaque or transparent selection).
import React from 'react';
import transparencyOptions from 'assets/paint/options-transparency.png';

const pick = (selected, base) =>
  `${base}${selected ? ' paint__opt--sel' : ''}`;

export default function ToolOptions({ tool, options, set }) {
  switch (tool) {
    case 'line':
    case 'curve':
      return (
        <div className="paint__opt-list">
          {[1, 2, 3, 4, 5].map(w => (
            <div
              key={w}
              className={pick(options.lineWidth === w, 'paint__opt-line')}
              onMouseDown={() => set.lineWidth(w)}
            >
              <div style={{ height: w }} />
            </div>
          ))}
        </div>
      );
    case 'rect':
    case 'ellipse':
    case 'rounded':
    case 'polygon':
      return (
        <div className="paint__opt-list">
          {['outline', 'both', 'fill'].map(m => (
            <div
              key={m}
              className={pick(options.shapeMode === m, 'paint__opt-fill')}
              onMouseDown={() => set.shapeMode(m)}
            >
              <div
                className={`paint__opt-fill-pict paint__opt-fill-pict--${m}`}
              />
            </div>
          ))}
        </div>
      );
    case 'brush':
      return (
        <div className="paint__opt-grid">
          {['circle', 'square'].map(shape =>
            [8, 5, 2].map(size => (
              <div
                key={`${shape}${size}`}
                className={pick(
                  options.brush.shape === shape && options.brush.size === size,
                  'paint__opt-cell',
                )}
                onMouseDown={() => set.brush({ shape, size })}
              >
                <div
                  className="paint__opt-dot"
                  style={{
                    width: size,
                    height: size,
                    borderRadius: shape === 'circle' ? '50%' : 0,
                  }}
                />
              </div>
            )),
          )}
        </div>
      );
    case 'eraser':
      return (
        <div className="paint__opt-list">
          {[4, 6, 8, 10].map(s => (
            <div
              key={s}
              className={pick(options.eraserSize === s, 'paint__opt-eraser')}
              onMouseDown={() => set.eraserSize(s)}
            >
              <div className="paint__opt-dot" style={{ width: s, height: s }} />
            </div>
          ))}
        </div>
      );
    case 'airbrush':
      return (
        <div className="paint__opt-grid paint__opt-grid--spray">
          {[8, 16, 24].map(s => (
            <div
              key={s}
              className={pick(options.airbrushSize === s, 'paint__opt-cell')}
              onMouseDown={() => set.airbrushSize(s)}
            >
              <div
                className="paint__opt-spray"
                style={{ width: s, height: s }}
              />
            </div>
          ))}
        </div>
      );
    case 'magnifier':
      return (
        <div className="paint__opt-list">
          {[1, 2, 6, 8].map(z => (
            <div
              key={z}
              className={pick(options.zoom === z, 'paint__opt-zoom')}
              onMouseDown={() => {
                set.magLevel(z);
                set.zoom(z);
              }}
            >
              {z}x
            </div>
          ))}
        </div>
      );
    case 'select':
    case 'freeform':
    case 'text':
      return (
        <div className="paint__opt-list">
          {[false, true].map(mode => (
            <div
              key={String(mode)}
              className={pick(
                options.transparentSelect === mode,
                'paint__opt-trans',
              )}
              onMouseDown={() => set.transparentSelect(mode)}
            >
              <div
                className="paint__opt-trans-img"
                style={{
                  backgroundImage: `url(${transparencyOptions})`,
                  backgroundPosition: `0 ${mode ? '-23px' : '0'}`,
                }}
              />
            </div>
          ))}
        </div>
      );
    default:
      return null;
  }
}
