import React, { useState, useRef, useEffect, useCallback } from 'react';
import styled from 'styled-components';

import { useVFS } from '../../../context/VFSContext';
import { getWindows, requestClose, requestPower } from '../../shellBus';
import { getProfileRoot } from '../../../context/vfsConstants';
import { displayPath } from '../../../context/vfsUtils';
import {
  executeInput,
  resolveInputPath,
  BANNER,
  DEFAULT_COLORS,
} from './commands';

const MAX_SCROLLBACK = 2000;
const MAX_HISTORY = 50;

/**
 * cmd.exe — an XP command prompt running against the virtual filesystem.
 * The parsing/execution engine lives in ./commands.js; this component is
 * the console: scrollback, prompt line, history, tab completion, colors.
 */
export default function CommandPrompt({
  onClose,
  onSetHeader,
  isFocus,
  onShellOpen,
  initialDir,
}) {
  const vfs = useVFS();
  // The logged-in user's profile at the moment the window opened
  const startDirRef = useRef(initialDir || getProfileRoot());
  const startDir = startDirRef.current;
  const [lines, setLines] = useState(() => [...BANNER]);
  const [input, setInput] = useState('');
  const [cwd, setCwd] = useState(startDir);
  const [driveCwds, setDriveCwds] = useState({ [startDir[0]]: startDir });
  const [colors, setColors] = useState({ ...DEFAULT_COLORS });
  const [pendingPrompt, setPendingPrompt] = useState(null);
  const busyRef = useRef(false);
  const historyRef = useRef([]);
  const historyIdxRef = useRef(-1);
  const tabRef = useRef(null);
  const inputRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (onSetHeader) onSetHeader({ title: 'C:\\WINDOWS\\system32\\cmd.exe' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the newest output visible
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, input, pendingPrompt]);

  // Take keyboard focus with the window
  useEffect(() => {
    if (isFocus && inputRef.current) inputRef.current.focus();
  }, [isFocus]);

  const appendLines = useCallback(xs => {
    if (!xs || xs.length === 0) return;
    setLines(prev => {
      const next = [...prev, ...xs];
      return next.length > MAX_SCROLLBACK
        ? next.slice(next.length - MAX_SCROLLBACK)
        : next;
    });
  }, []);

  const promptText = pendingPrompt
    ? pendingPrompt.message
    : `${displayPath(cwd)}>`;

  const submit = async () => {
    if (busyRef.current) return;
    const raw = input;
    setInput('');
    tabRef.current = null;
    appendLines([promptText + raw]);

    // Answer an in-progress prompt (del confirm, date/time, pause)
    if (pendingPrompt) {
      const p = pendingPrompt;
      setPendingPrompt(null);
      busyRef.current = true;
      try {
        const res = await p.onAnswer(raw);
        if (res) {
          appendLines(res.lines || []);
          if (res.cwd) setCwd(res.cwd);
          if (res.driveCwds) setDriveCwds(res.driveCwds);
          if (res.prompt) setPendingPrompt(res.prompt);
          else appendLines(['']);
        }
      } finally {
        busyRef.current = false;
      }
      return;
    }

    if (raw.trim()) {
      historyRef.current = [
        ...historyRef.current.filter(h => h !== raw),
        raw,
      ].slice(-MAX_HISTORY);
    }
    historyIdxRef.current = -1;
    if (!raw.trim()) return;

    busyRef.current = true;
    try {
      const res = await executeInput(raw, {
        vfs,
        cwd,
        driveCwds,
        onShellOpen,
        onSetTitle: t => onSetHeader && onSetHeader({ title: t }),
        onSetColors: c => setColors(c),
        onExit: onClose,
        windows: getWindows(),
        killWindow: (id, force) => requestClose(id, force),
        onPower: action => requestPower(action),
      });
      if (res.cls) setLines([]);
      appendLines(res.lines);
      setCwd(res.cwd);
      setDriveCwds(res.driveCwds);
      if (res.prompt) setPendingPrompt(res.prompt);
      else if (!res.cls) appendLines(['']);
    } finally {
      busyRef.current = false;
    }
  };

  // Tab completion over the typed token's directory
  const complete = () => {
    let state = tabRef.current;
    if (!state || state.forInput !== input) {
      const tokenStart = input.lastIndexOf(' ') + 1;
      const token = input.slice(tokenStart).replace(/"/g, '');
      const before = input.slice(0, tokenStart);
      const slash = Math.max(token.lastIndexOf('\\'), token.lastIndexOf('/'));
      const dirPart = slash >= 0 ? token.slice(0, slash + 1) : '';
      const basePart = slash >= 0 ? token.slice(slash + 1) : token;
      const dirPath = resolveInputPath({ cwd, driveCwds, vfs }, dirPart || '.');
      const dirNode = vfs.findNodeCI(dirPath);
      if (!dirNode) return;
      const matches = vfs
        .listDir(dirNode.path)
        .map(n => n.name)
        .filter(n => n.toLowerCase().startsWith(basePart.toLowerCase()))
        .sort((a, b) => a.localeCompare(b));
      if (matches.length === 0) return;
      state = { before, dirPart, matches, idx: -1, forInput: input };
    }
    state.idx = (state.idx + 1) % state.matches.length;
    const name = state.matches[state.idx];
    const full = state.dirPart + name;
    const replaced = state.before + (/\s/.test(full) ? `"${full}"` : full);
    state.forInput = replaced;
    tabRef.current = state;
    setInput(replaced);
  };

  const onKeyDown = e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      complete();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const h = historyRef.current;
      if (h.length === 0) return;
      const idx =
        historyIdxRef.current === -1
          ? h.length - 1
          : Math.max(0, historyIdxRef.current - 1);
      historyIdxRef.current = idx;
      setInput(h[idx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const h = historyRef.current;
      if (historyIdxRef.current === -1) return;
      const idx = historyIdxRef.current + 1;
      if (idx >= h.length) {
        historyIdxRef.current = -1;
        setInput('');
      } else {
        historyIdxRef.current = idx;
        setInput(h[idx]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setInput('');
      tabRef.current = null;
    } else if (e.key === 'c' && e.ctrlKey) {
      e.preventDefault();
      appendLines([promptText + input + '^C', '']);
      setInput('');
      if (pendingPrompt) setPendingPrompt(null);
    }
  };

  const focusInput = () => {
    const sel = window.getSelection();
    if ((!sel || sel.isCollapsed) && inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <Root
      ref={scrollRef}
      style={{ backgroundColor: colors.bg, color: colors.fg }}
      onClick={focusInput}
    >
      <pre className="cmd__scrollback">{lines.join('\n')}</pre>
      <div className="cmd__line">
        <span className="cmd__prompt">{promptText}</span>
        <input
          ref={inputRef}
          className="cmd__input"
          style={{ color: colors.fg, caretColor: colors.fg }}
          value={input}
          onChange={e => {
            setInput(e.target.value);
            tabRef.current = null;
          }}
          onKeyDown={onKeyDown}
          spellCheck={false}
          autoComplete="off"
          autoFocus
        />
      </div>
    </Root>
  );
}

const Root = styled.div`
  position: absolute;
  inset: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 2px 3px;
  font-family: 'Lucida Console', 'Courier New', monospace;
  font-size: 12px;
  line-height: 14px;
  cursor: text;

  .cmd__scrollback {
    margin: 0;
    font: inherit;
    white-space: pre-wrap;
    word-break: break-all;
    user-select: text;
  }
  .cmd__line {
    display: flex;
    align-items: baseline;
  }
  .cmd__prompt {
    white-space: pre;
    flex-shrink: 0;
  }
  .cmd__input {
    flex: 1;
    min-width: 40px;
    background: transparent;
    border: none;
    outline: none;
    padding: 0;
    margin: 0;
    font: inherit;
  }
`;
