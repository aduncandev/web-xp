import React, { useRef, useEffect } from 'react';
import styled from 'styled-components';

/** Luna group box (fieldset look) used across the Performance/Networking tabs. */
export function GroupBox({ title, children, className, style }) {
  return (
    <Box className={className} style={style}>
      <legend>{title}</legend>
      {children}
    </Box>
  );
}

const Box = styled.fieldset`
  border: 1px solid #d0d0bf;
  border-radius: 3px;
  margin: 0;
  padding: 4px 6px 6px;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  legend {
    color: #0046d5;
    font-size: 11px;
    padding: 0 2px;
  }
`;

/**
 * The classic segmented LED meter (CPU Usage / PF Usage): a black sunken
 * column of green segments filling from the bottom, value text underneath.
 */
export function LedMeter({ value, text }) {
  // Fixed segment count and fixed column height: the meter must never
  // depend on flex sizing — it lives inside a <fieldset>, which resolves
  // percentage/flex heights unreliably and let the old version spill out
  // of its box.
  const SEGMENTS = 11;
  const lit = Math.round((Math.min(100, Math.max(0, value)) / 100) * SEGMENTS);
  const cells = [];
  for (let i = SEGMENTS - 1; i >= 0; i--) {
    cells.push(
      <div
        key={i}
        className="led__seg"
        style={{ backgroundColor: i < lit ? '#4dff4d' : '#0d2b0d' }}
      />,
    );
  }
  return (
    <Led>
      <div className="led__col">{cells}</div>
      <div className="led__text">{text}</div>
    </Led>
  );
}

const Led = styled.div`
  background: #000;
  border: 1px solid #7f9db9;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  overflow: hidden;
  padding: 4px 0 2px;
  .led__col {
    flex: none;
    width: 26px;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
  }
  .led__seg {
    height: 3px;
    margin-top: 2px;
    width: 100%;
    flex: none;
  }
  .led__text {
    color: #4dff4d;
    font-family: 'Lucida Console', monospace;
    font-size: 10px;
    margin-top: 3px;
    white-space: nowrap;
  }
`;

/**
 * Scrolling history graph on the iconic black/green grid. Draws one or two
 * series (CPU total green + kernel red). Gridlines scroll with the data.
 */
export function HistoryGraph({
  values,
  values2,
  color = '#00ff00',
  color2 = '#ff0000',
  tick = 0,
  max = 100,
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const w = cv.clientWidth || 280;
    const h = cv.clientHeight || 100;
    if (cv.width !== w) cv.width = w;
    if (cv.height !== h) cv.height = h;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);

    // Grid: horizontal quarters, vertical lines scrolling left with the data
    ctx.strokeStyle = '#004f00';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const y = Math.round((h / 4) * i) + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    const STEP = 12;
    const offset = STEP - ((tick * 2) % STEP);
    for (let x = w - offset; x > 0; x -= STEP) {
      const px = Math.round(x) + 0.5;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, h);
      ctx.stroke();
    }

    const drawSeries = (series, stroke) => {
      if (!series || series.length < 2) return;
      ctx.strokeStyle = stroke;
      ctx.beginPath();
      const n = series.length;
      for (let i = 0; i < n; i++) {
        const x = w - (n - 1 - i) * 2;
        if (x < -2) continue;
        const y = h - 1 - (Math.min(max, series[i]) / max) * (h - 2);
        if (i === 0 || x <= 0) ctx.moveTo(Math.max(0, x), y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };
    drawSeries(values2, color2);
    drawSeries(values, color);
  }, [values, values2, color, color2, tick, max]);

  return <Canvas ref={canvasRef} />;
}

const Canvas = styled.canvas`
  display: block;
  width: 100%;
  height: 100%;
  border: 1px solid #7f9db9;
  background: #000;
`;
