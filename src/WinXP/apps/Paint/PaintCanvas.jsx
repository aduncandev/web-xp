// The page: the picture and its overlay at the current zoom, the marquee,
// the text box while it is being typed into, and the three resize handles.
import React from 'react';

export default function PaintCanvas({
  doc,
  zoom,
  cursor,
  onMouseDown,
  onMouseMove,
  onMouseLeave,
  onDoubleClick,
  onAreaMouseDown,
  selection,
  marquee,
  text,
  fg,
  bg,
  transparentSelect,
  resizeGhost,
  onResizeStart,
}) {
  const W = doc.canvasSize.w * zoom;
  const H = doc.canvasSize.h * zoom;
  const sel = selection.selRef.current;
  const box = r => ({
    left: r.x * zoom - 1,
    top: r.y * zoom - 1,
    width: r.w * zoom + 2,
    height: r.h * zoom + 2,
  });
  return (
    <div className="paint__canvas-area" onMouseDown={onAreaMouseDown}>
      <div className="paint__sheet-wrap">
        <div
          className="paint__holder"
          style={{ width: W, height: H, cursor }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseLeave={onMouseLeave}
          onDoubleClick={onDoubleClick}
          onContextMenu={e => e.preventDefault()}
        >
          <canvas
            ref={doc.canvasRef}
            className="paint__canvas"
            style={{ width: W, height: H }}
          />
          <canvas
            ref={doc.overlayRef}
            className="paint__overlay"
            style={{ width: W, height: H }}
          />
          {sel && !marquee && <div className="paint__marquee" style={box(sel)} />}
          {marquee && <div className="paint__marquee" style={box(marquee)} />}
          {text.textBox && (
            <textarea
              ref={text.textareaRef}
              className="paint__textbox"
              autoFocus
              spellCheck={false}
              value={text.textValue}
              onChange={e => text.setTextValue(e.target.value)}
              onMouseDown={e => e.stopPropagation()}
              style={{
                left: text.textBox.x * zoom,
                top: text.textBox.y * zoom,
                width: text.textBox.w * zoom,
                height: text.textBox.h * zoom,
                color: fg,
                backgroundColor: transparentSelect ? 'transparent' : bg,
                fontSize: 13 * zoom,
                lineHeight: `${15 * zoom}px`,
              }}
            />
          )}
        </div>
        {resizeGhost && (
          <div
            className="paint__resize-ghost"
            style={{ width: resizeGhost.w * zoom, height: resizeGhost.h * zoom }}
          />
        )}
        <div
          className="paint__handle"
          style={{ left: W + 3, top: H + 3, cursor: 'nwse-resize' }}
          onMouseDown={e => onResizeStart(e, 'rb')}
        />
        <div
          className="paint__handle"
          style={{ left: W + 3, top: H / 2 + 2, cursor: 'ew-resize' }}
          onMouseDown={e => onResizeStart(e, 'r')}
        />
        <div
          className="paint__handle"
          style={{ left: W / 2 + 2, top: H + 3, cursor: 'ns-resize' }}
          onMouseDown={e => onResizeStart(e, 'b')}
        />
      </div>
    </div>
  );
}
