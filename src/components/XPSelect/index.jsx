import React, {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';

import dropdownIcon from 'assets/windowsIcons/dropdown.png';

const itemHeight = option => (option.icon ? 17 : 13);

/**
 * Luna drop-down list combo box (CBS_DROPDOWNLIST).
 *
 * options: [{ value, label, icon?, indent?, style?, ...extra }]
 *  - value: unique key reported through onChange
 *  - icon: optional 16px icon shown before the label
 *  - indent: tree depth for shell-style lists (Look in)
 *  - style: extra style for the popup row (e.g. fontFamily)
 * display: optional { icon?, label } override for the closed field
 * onChange(value, option)
 */
const XPSelect = forwardRef(function XPSelect(
  {
    options,
    value,
    onChange,
    display,
    disabled = false,
    maxVisible = 30,
    className,
  },
  outerRef,
) {
  const rootRef = useRef(null);
  const listRef = useRef(null);
  const typeRef = useRef({ str: '', at: 0 });
  const [open, setOpen] = useState(false);
  const [hl, setHl] = useState(0);
  const [listBox, setListBox] = useState(null);

  useEffect(() => {
    if (!outerRef) return;
    if (typeof outerRef === 'function') outerRef(rootRef.current);
    else outerRef.current = rootRef.current;
  });

  const selectedIndex = options.findIndex(o => o.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;
  const shown = display || selected || { label: '' };

  const close = useCallback(() => {
    setOpen(false);
    setListBox(null);
  }, []);

  const commit = useCallback(
    index => {
      const option = options[index];
      if (option && onChange) onChange(option.value, option);
      close();
    },
    [options, onChange, close],
  );

  const commitClosed = useCallback(
    index => {
      const option = options[index];
      if (option && onChange) onChange(option.value, option);
    },
    [options, onChange],
  );

  const openList = useCallback(() => {
    if (disabled || options.length === 0 || !rootRef.current) return;
    const rect = rootRef.current.getBoundingClientRect();
    const contentH = 2 + options.reduce((h, o) => h + itemHeight(o), 0);
    const capH =
      2 + options.slice(0, maxVisible).reduce((h, o) => h + itemHeight(o), 0);
    let height = Math.min(contentH, capH);
    const spaceBelow = window.innerHeight - rect.bottom - 2;
    const spaceAbove = rect.top - 2;
    let top = rect.bottom;
    if (height > spaceBelow) {
      if (spaceAbove > spaceBelow) {
        height = Math.min(height, spaceAbove);
        top = rect.top - height;
      } else {
        height = spaceBelow;
      }
    }
    setHl(Math.max(selectedIndex, 0));
    setListBox({ left: rect.left, top, width: rect.width, height });
    setOpen(true);
  }, [disabled, options, maxVisible, selectedIndex]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = e => {
      if (rootRef.current && rootRef.current.contains(e.target)) return;
      if (listRef.current && listRef.current.contains(e.target)) return;
      close();
    };
    const onScroll = e => {
      if (listRef.current && listRef.current.contains(e.target)) return;
      close();
    };
    const onResize = () => close();
    document.addEventListener('mousedown', onDown, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('mousedown', onDown, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open, close]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.children[hl];
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [open, hl]);

  const typeahead = key => {
    const now = Date.now();
    const t = typeRef.current;
    t.str = now - t.at > 1000 ? key : t.str + key;
    t.at = now;
    const single = t.str.split('').every(c => c === t.str[0]);
    const probe = (single ? t.str[0] : t.str).toLowerCase();
    const from = open ? hl : Math.max(selectedIndex, 0);
    const start = single ? from + 1 : from;
    for (let i = 0; i < options.length; i++) {
      const idx = (start + i) % options.length;
      if (
        String(options[idx].label)
          .toLowerCase()
          .startsWith(probe)
      ) {
        if (open) setHl(idx);
        else commitClosed(idx);
        return;
      }
    }
  };

  const moveClosed = delta => {
    if (options.length === 0) return;
    const idx = Math.min(
      Math.max(selectedIndex + delta, 0),
      options.length - 1,
    );
    if (idx !== selectedIndex) commitClosed(idx);
  };

  const onKeyDown = e => {
    if (disabled) return;
    const { key } = e;
    const handled = () => {
      e.preventDefault();
      e.stopPropagation();
    };
    if (open) {
      if (
        key === 'F4' ||
        key === 'Enter' ||
        (e.altKey && (key === 'ArrowUp' || key === 'ArrowDown'))
      ) {
        handled();
        commit(hl);
      } else if (key === 'Escape') {
        handled();
        close();
      } else if (key === 'Tab') {
        commit(hl);
      } else if (key === 'ArrowDown') {
        handled();
        setHl(h => Math.min(h + 1, options.length - 1));
      } else if (key === 'ArrowUp') {
        handled();
        setHl(h => Math.max(h - 1, 0));
      } else if (key === 'PageDown') {
        handled();
        setHl(h => Math.min(h + 8, options.length - 1));
      } else if (key === 'PageUp') {
        handled();
        setHl(h => Math.max(h - 8, 0));
      } else if (key === 'Home') {
        handled();
        setHl(0);
      } else if (key === 'End') {
        handled();
        setHl(options.length - 1);
      } else if (key.length === 1 && !e.ctrlKey && !e.altKey) {
        handled();
        typeahead(key);
      }
    } else if (
      key === 'F4' ||
      (e.altKey && (key === 'ArrowUp' || key === 'ArrowDown'))
    ) {
      handled();
      openList();
    } else if (key === 'ArrowDown' || key === 'ArrowRight') {
      handled();
      moveClosed(1);
    } else if (key === 'ArrowUp' || key === 'ArrowLeft') {
      handled();
      moveClosed(-1);
    } else if (key === 'Home' && options.length > 0) {
      handled();
      commitClosed(0);
    } else if (key === 'End' && options.length > 0) {
      handled();
      commitClosed(options.length - 1);
    } else if (key.length === 1 && !e.ctrlKey && !e.altKey) {
      handled();
      typeahead(key);
    }
  };

  return (
    <>
      <Root
        ref={rootRef}
        className={`${className || ''}${disabled ? ' disabled' : ''}`}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={onKeyDown}
        onMouseDown={e => {
          if (disabled || e.button !== 0) return;
          if (open) close();
          else openList();
        }}
      >
        <span className="xs-value">
          {shown.icon && <img src={shown.icon} alt="" draggable={false} />}
          <span className="xs-label">{shown.label}</span>
        </span>
        <span className="xs-button" />
      </Root>
      {open &&
        listBox &&
        createPortal(
          <List
            ref={listRef}
            style={{
              left: listBox.left,
              top: listBox.top,
              width: listBox.width,
              maxHeight: listBox.height,
            }}
            onMouseDown={e => e.preventDefault()}
          >
            {options.map((o, i) => (
              <div
                key={o.value != null ? o.value : i}
                className={`xsl-item${i === hl ? ' hl' : ''}`}
                style={{
                  height: itemHeight(o),
                  paddingLeft: (o.indent || 0) * 14 + (o.icon ? 4 : 3),
                  ...o.style,
                }}
                onMouseMove={() => setHl(i)}
                onClick={() => commit(i)}
              >
                {o.icon && <img src={o.icon} alt="" draggable={false} />}
                <span className="xsl-label">{o.label}</span>
              </div>
            ))}
          </List>,
          document.body,
        )}
    </>
  );
});

export default XPSelect;

const Root = styled.span`
  position: relative;
  display: inline-flex;
  box-sizing: border-box;
  height: 21px;
  border: 1px solid #7f9db9;
  background: #fff;
  font-family: Tahoma, 'Noto Sans', sans-serif;
  font-size: 11px;
  color: #000;
  cursor: default;
  outline: none;
  user-select: none;

  .xs-value {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    margin: 2px 1px 2px 2px;
    padding: 0 1px;
    img {
      width: 16px;
      height: 16px;
      align-self: flex-start;
      margin: -1px 4px 0 0;
      flex-shrink: 0;
    }
  }
  .xs-label {
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 15px;
  }
  &:focus .xs-value {
    background: #316ac5;
    color: #fff;
  }
  .xs-button {
    flex-shrink: 0;
    width: 15px;
    height: 17px;
    margin: 1px 1px 1px 0;
    background: url(${dropdownIcon}) no-repeat;
    background-size: 15px 17px;
  }
  &.disabled {
    border-color: #c9c2b8;
    background: #f5f4ea;
    color: #a0a0a0;
    .xs-button {
      filter: grayscale(1);
      opacity: 0.5;
    }
  }
`;

const List = styled.div`
  position: fixed;
  z-index: 99999;
  box-sizing: border-box;
  background: #fff;
  border: 1px solid #000;
  box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.35);
  overflow-y: auto;
  overflow-x: hidden;
  font-family: Tahoma, 'Noto Sans', sans-serif;
  font-size: 11px;
  color: #000;
  cursor: default;
  user-select: none;

  .xsl-item {
    display: flex;
    align-items: center;
    padding-right: 3px;
    white-space: nowrap;
    img {
      width: 16px;
      height: 16px;
      align-self: flex-start;
      margin: 0 4px 0 0;
      flex-shrink: 0;
    }
  }
  .xsl-item.hl {
    background: #316ac5;
    color: #fff;
  }
  .xsl-label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;
