// The text tool's box: dragged out on the canvas, typed into, and painted
// onto the picture when the pointer goes anywhere else.
import { useRef, useState } from 'react';
import { wrapTextLines } from './helpers';

export function useTextTool({ doc, live, setDirty }) {
  const [textBox, setTextBox] = useState(null); // { x, y, w, h }
  const [textValue, setTextValue] = useState('');
  const textareaRef = useRef(null);

  function commitText() {
    const tb = live.current.textBox;
    if (!tb) return;
    const val = live.current.textValue;
    setTextBox(null);
    setTextValue('');
    if (!val.trim()) return;
    doc.pushUndo();
    const ctx = doc.ctx2d();
    ctx.save();
    ctx.beginPath();
    ctx.rect(tb.x, tb.y, tb.w, tb.h);
    ctx.clip();
    if (!live.current.transparentSelect) {
      ctx.fillStyle = live.current.bg;
      ctx.fillRect(tb.x, tb.y, tb.w, tb.h);
    }
    ctx.fillStyle = live.current.fg;
    ctx.font = '13px Arial';
    ctx.textBaseline = 'top';
    const lines = wrapTextLines(ctx, val, tb.w - 2);
    lines.forEach((line, i) => {
      ctx.fillText(line, tb.x + 1, tb.y + 1 + i * 15);
    });
    ctx.restore();
    setDirty(true);
  }

  function cancelText() {
    setTextBox(null);
    setTextValue('');
  }

  return {
    textBox,
    setTextBox,
    textValue,
    setTextValue,
    textareaRef,
    commitText,
    cancelText,
  };
}
