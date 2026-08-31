import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled from 'styled-components';
import { WindowDropDowns } from 'components';
import XPButton from 'components/XPButton';
import { useDialog } from '../../../context/DialogContext';

/**
 * Windows XP Calculator (calc.exe) — Standard view.
 *
 * Geometry, colors and strings are taken from the reference capture
 * refkit/shots/realxp/calculator-standard.png (260x260 window, 34px button
 * cells with 5px/6px gaps, #FF0000 / #0000FF key text, #7F9DB9 display
 * border, double-sunken memory indicator box).
 *
 * Semantics are the real calc.exe immediate-execution model: no operator
 * precedence, '=' repeats the last operation, unary keys apply instantly,
 * errors lock the keypad until a clear key.
 */

const ERR_DIV = 'Cannot divide by zero.';
const ERR_UNDEF = 'Result of function is undefined.';
const ERR_INVALID = 'Invalid input for function.';
const MAX_DIGITS = 32;

const initialCalcState = {
  entry: '0', // digits being typed (string), valid while `entering`
  entering: true,
  value: 0, // committed value shown when not entering
  acc: null, // left operand awaiting `pendingOp`
  pendingOp: null,
  lastOp: null, // for '=' repetition
  lastOperand: null,
  error: null,
  mem: 0,
};

const entryValue = entry => {
  const v = parseFloat(entry);
  return Number.isNaN(v) ? 0 : v;
};

const getVal = s => (s.entering ? entryValue(s.entry) : s.value);

const countDigits = entry => entry.replace(/[^0-9]/g, '').length;

function applyBinary(op, a, b) {
  switch (op) {
    case '+':
      return { v: a + b };
    case '-':
      return { v: a - b };
    case '*':
      return { v: a * b };
    case '/':
      if (b === 0) return { err: a === 0 ? ERR_UNDEF : ERR_DIV };
      return { v: a / b };
    default:
      return { v: b };
  }
}

/** Pure state transition for one calculator key. */
function nextState(s, key) {
  // An error locks the keypad; the clear keys reset like the real calc
  if (s.error) {
    if (key === 'c' || key === 'ce' || key === 'back') {
      return { ...initialCalcState, mem: s.mem };
    }
    return s;
  }

  if (/^[0-9]$/.test(key)) {
    if (!s.entering) return { ...s, entry: key, entering: true };
    if (countDigits(s.entry) >= MAX_DIGITS) return s;
    const entry =
      s.entry === '0' ? key : s.entry === '-0' ? `-${key}` : s.entry + key;
    return { ...s, entry };
  }

  switch (key) {
    case '.': {
      if (!s.entering) return { ...s, entry: '0.', entering: true };
      if (s.entry.includes('.')) return s;
      return { ...s, entry: `${s.entry}.` };
    }
    case 'sign': {
      if (s.entering) {
        if (s.entry === '0') return s;
        return {
          ...s,
          entry: s.entry.startsWith('-') ? s.entry.slice(1) : `-${s.entry}`,
        };
      }
      if (s.value === 0) return s;
      return { ...s, value: -s.value };
    }
    case 'back': {
      if (!s.entering) return s;
      let entry = s.entry.slice(0, -1);
      if (entry === '' || entry === '-') entry = '0';
      return { ...s, entry };
    }
    case 'ce':
      return { ...s, entry: '0', entering: true };
    case 'c':
      return { ...initialCalcState, mem: s.mem };
    case 'pct': {
      // Windows behavior: a + b % shows a*b/100, '=' then applies pendingOp
      const v = getVal(s);
      const base = s.acc != null ? s.acc : 0;
      return { ...s, value: (base * v) / 100, entering: false };
    }
    case 'sqrt': {
      const v = getVal(s);
      if (v < 0) return { ...s, error: ERR_INVALID };
      return { ...s, value: Math.sqrt(v), entering: false };
    }
    case 'inv': {
      const v = getVal(s);
      if (v === 0) return { ...s, error: ERR_DIV };
      return { ...s, value: 1 / v, entering: false };
    }
    case '=': {
      const v = getVal(s);
      if (s.pendingOp != null && s.acc != null) {
        const res = applyBinary(s.pendingOp, s.acc, v);
        if (res.err) return { ...s, error: res.err };
        return {
          ...s,
          value: res.v,
          entering: false,
          acc: null,
          pendingOp: null,
          lastOp: s.pendingOp,
          lastOperand: v,
        };
      }
      if (s.lastOp != null) {
        // Repeated '=' re-applies the last operation (2+3= = = -> 5, 8, 11)
        const res = applyBinary(s.lastOp, v, s.lastOperand);
        if (res.err) return { ...s, error: res.err };
        return { ...s, value: res.v, entering: false };
      }
      return { ...s, value: v, entering: false };
    }
    case 'mc':
      return { ...s, mem: 0 };
    case 'mr':
      return { ...s, value: s.mem, entering: false };
    case 'ms':
      return { ...s, mem: getVal(s), entering: false };
    case 'mplus':
      return { ...s, mem: s.mem + getVal(s), entering: false };
    case '+':
    case '-':
    case '*':
    case '/': {
      const v = getVal(s);
      if (s.pendingOp != null && s.acc != null && s.entering) {
        // Immediate execution: evaluate the pending pair first (2+3*4 = 20)
        const res = applyBinary(s.pendingOp, s.acc, v);
        if (res.err) return { ...s, error: res.err };
        return {
          ...s,
          acc: res.v,
          value: res.v,
          entering: false,
          pendingOp: key,
        };
      }
      if (s.pendingOp != null && !s.entering) {
        // Changing operator before typing the next number replaces it
        return { ...s, pendingOp: key };
      }
      return { ...s, acc: v, value: v, entering: false, pendingOp: key };
    }
    default:
      return s;
  }
}

// --- Display formatting: real calc always shows a trailing decimal point ---

function groupThousands(str) {
  const neg = str.startsWith('-');
  const body = neg ? str.slice(1) : str;
  return (neg ? '-' : '') + body.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatExponential(n) {
  let str = n.toExponential(15);
  str = str.replace(/(\.\d*?)0+e/, '$1e'); // trim trailing mantissa zeros
  return str; // '1.e+40' style, like the real calc
}

function withGrouping(str, grouping) {
  if (!grouping) return str;
  const [int, frac] = str.split('.');
  return `${groupThousands(int)}.${frac || ''}`;
}

function formatValue(n, grouping) {
  if (!isFinite(n)) return ERR_INVALID;
  const abs = Math.abs(n);
  if (abs !== 0 && (abs >= 1e32 || abs < 1e-31)) return formatExponential(n);
  let str = String(parseFloat(n.toPrecision(15)));
  if (str.includes('e')) return formatExponential(n);
  if (!str.includes('.')) str += '.';
  return withGrouping(str, grouping);
}

function formatEntry(entry, grouping) {
  let str = entry;
  if (!str.includes('.')) str += '.';
  return withGrouping(str, grouping);
}

// --- Key layout (Standard view, exactly as the reference shot) ---

const RED = '#ff0000';
const BLUE = '#0000ff';

const MEM_COLUMN = [
  { k: 'mc', label: 'MC' },
  { k: 'mr', label: 'MR' },
  { k: 'ms', label: 'MS' },
  { k: 'mplus', label: 'M+' },
];

const MAIN_GRID = [
  { k: '7', label: '7', c: BLUE },
  { k: '8', label: '8', c: BLUE },
  { k: '9', label: '9', c: BLUE },
  { k: '/', label: '/', c: RED },
  { k: 'sqrt', label: 'sqrt', c: BLUE },
  { k: '4', label: '4', c: BLUE },
  { k: '5', label: '5', c: BLUE },
  { k: '6', label: '6', c: BLUE },
  { k: '*', label: '*', c: RED },
  { k: 'pct', label: '%', c: BLUE },
  { k: '1', label: '1', c: BLUE },
  { k: '2', label: '2', c: BLUE },
  { k: '3', label: '3', c: BLUE },
  { k: '-', label: '-', c: RED },
  { k: 'inv', label: '1/x', c: BLUE },
  { k: '0', label: '0', c: BLUE },
  { k: 'sign', label: '+/-', c: BLUE },
  { k: '.', label: '.', c: BLUE },
  { k: '+', label: '+', c: RED },
  { k: '=', label: '=', c: RED },
];

// Real calc.exe keyboard bindings (Standard view)
const KEYBOARD_MAP = {
  '.': '.',
  ',': '.',
  '+': '+',
  '-': '-',
  '*': '*',
  '/': '/',
  '%': 'pct',
  '@': 'sqrt',
  r: 'inv',
  R: 'inv',
  '=': '=',
  Enter: '=',
  Escape: 'c',
  Delete: 'ce',
  Backspace: 'back',
  F9: 'sign',
};

const CTRL_MAP = { l: 'mc', r: 'mr', m: 'ms', p: 'mplus' };

export default function Calculator({ isFocus }) {
  const dlg = useDialog();
  const [s, setS] = useState(initialCalcState);
  const [grouping, setGrouping] = useState(false);
  const sRef = useRef(s);
  sRef.current = s;
  const groupingRef = useRef(grouping);
  groupingRef.current = grouping;

  const press = useCallback(key => setS(prev => nextState(prev, key)), []);

  const display = s.error
    ? s.error
    : s.entering
    ? formatEntry(s.entry, grouping)
    : formatValue(s.value, grouping);

  const copyDisplay = useCallback(() => {
    const cur = sRef.current;
    const text = cur.error
      ? cur.error
      : cur.entering
      ? formatEntry(cur.entry, false)
      : formatValue(cur.value, false);
    try {
      if (navigator.clipboard) navigator.clipboard.writeText(text);
    } catch {
      // clipboard unavailable
    }
  }, []);

  const pasteDisplay = useCallback(() => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) return;
      navigator.clipboard.readText().then(text => {
        const cleaned = String(text)
          .trim()
          .replace(/[,\s]/g, '');
        if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(cleaned)) return;
        const v = parseFloat(cleaned);
        if (!isFinite(v)) return;
        setS(prev => {
          if (prev.error) return prev;
          const str = String(v);
          return str.includes('e')
            ? { ...prev, value: v, entering: false }
            : { ...prev, entry: str, entering: true };
        });
      });
    } catch {
      // clipboard unavailable
    }
  }, []);

  // Keyboard — only the focused calculator instance listens
  useEffect(() => {
    if (!isFocus) return undefined;
    const onKey = e => {
      if (e.altKey || e.metaKey) return;
      if (e.ctrlKey) {
        const k = e.key.toLowerCase();
        if (k === 'c') {
          e.preventDefault();
          copyDisplay();
        } else if (k === 'v') {
          e.preventDefault();
          pasteDisplay();
        } else if (CTRL_MAP[k]) {
          e.preventDefault();
          press(CTRL_MAP[k]);
        }
        return;
      }
      let key = null;
      if (/^[0-9]$/.test(e.key)) key = e.key;
      else if (KEYBOARD_MAP[e.key]) key = KEYBOARD_MAP[e.key];
      if (key != null) {
        e.preventDefault();
        press(key);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isFocus, press, copyDisplay, pasteDisplay]);

  const onMenu = name => {
    switch (name) {
      case 'Copy':
        copyDisplay();
        break;
      case 'Paste':
        pasteDisplay();
        break;
      case 'Standard':
        // Already the active (and only) view
        break;
      case 'Scientific':
        // Intentionally inert: no scientific-view reference capture exists,
        // and a guessed layout would break the 1:1 authenticity bar. The
        // menu item stays (like the real View menu) but does nothing.
        break;
      case 'Digit grouping':
        setGrouping(g => !g);
        break;
      case 'About Calculator':
        dlg.alert(
          'Calculator for Windows XP\nVersion 2026 (Web Remake)',
          'About Calculator',
        );
        break;
      default:
        break;
    }
  };

  const menuItems = {
    Edit: [
      { type: 'item', text: 'Copy', hotkey: 'Ctrl+C' },
      { type: 'item', text: 'Paste', hotkey: 'Ctrl+V' },
    ],
    View: [
      { type: 'item', text: 'Standard', symbol: 'circle' },
      { type: 'item', text: 'Scientific' },
      { type: 'separator' },
      {
        type: 'item',
        text: 'Digit grouping',
        symbol: grouping ? 'check' : undefined,
      },
    ],
    Help: [
      { type: 'item', text: 'Help Topics', disable: true },
      { type: 'item', text: 'About Calculator' },
    ],
  };

  return (
    <Root onMouseDown={e => e.preventDefault()}>
      <div className="calc__menu">
        <WindowDropDowns items={menuItems} onClickItem={onMenu} height={20} />
      </div>
      <div className="calc__display">{display}</div>
      <div className="calc__toprow">
        <div className="calc__membox">{s.mem !== 0 ? 'M' : ''}</div>
        <CalcBtn $c={RED} style={{ width: 61 }} onClick={() => press('back')}>
          Backspace
        </CalcBtn>
        <CalcBtn $c={RED} style={{ width: 60 }} onClick={() => press('ce')}>
          CE
        </CalcBtn>
        <CalcBtn $c={RED} style={{ width: 60 }} onClick={() => press('c')}>
          C
        </CalcBtn>
      </div>
      <div className="calc__main">
        <div className="calc__memcol">
          {MEM_COLUMN.map(item => (
            <CalcBtn key={item.k} $c={RED} onClick={() => press(item.k)}>
              {item.label}
            </CalcBtn>
          ))}
        </div>
        <div className="calc__grid">
          {MAIN_GRID.map(item => (
            <CalcBtn key={item.k} $c={item.c} onClick={() => press(item.k)}>
              {item.label}
            </CalcBtn>
          ))}
        </div>
      </div>
    </Root>
  );
}

const CalcBtn = styled(XPButton)`
  min-width: 0;
  width: 34px;
  height: 27px;
  padding: 0;
  color: ${({ $c }) => $c};
`;

const Root = styled.div`
  position: absolute;
  inset: 0;
  background: #ece9d8;
  font-family: Tahoma, 'Noto Sans', sans-serif;
  font-size: 11px;
  overflow: hidden;
  user-select: none;

  .calc__menu {
    height: 20px;
    padding-left: 0;
  }
  .calc__display {
    box-sizing: border-box;
    margin: 2px 7px 0 8px;
    height: 23px;
    line-height: 21px;
    background: #fff;
    border: 1px solid #7f9db9;
    text-align: right;
    padding: 0 4px 0 2px;
    white-space: nowrap;
    overflow: hidden;
    user-select: text;
  }
  .calc__toprow {
    margin: 13px 7px 0 12px;
    height: 27px;
    display: flex;
  }
  .calc__toprow > button + button {
    margin-left: 5px;
  }
  .calc__membox {
    box-sizing: border-box;
    width: 27px;
    height: 26px;
    margin: 1px 16px 0 0;
    flex-shrink: 0;
    background: #ece9d8;
    border: 1px solid;
    border-color: #aca899 #ffffff #ffffff #aca899;
    box-shadow: inset 1px 1px 0 #716f64, inset -1px -1px 0 #f1efe2;
    color: #ff0000;
    text-align: center;
    line-height: 24px;
  }
  .calc__main {
    margin: 9px 7px 0 9px;
    display: flex;
  }
  .calc__memcol {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-right: 12px;
  }
  .calc__grid {
    display: grid;
    grid-template-columns: repeat(5, 34px);
    grid-auto-rows: 27px;
    gap: 6px 5px;
  }
`;
