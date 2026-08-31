import React, { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { menuFade, MENU_FADE_MS, SUBMENU_SHOW_DELAY_MS } from '../menuFade';

// Caption glyphs (Restore/Minimize/Maximize/Close) come from the real
// Marlett font Windows renders system menus with; skip them entirely when
// the platform does not ship it
let marlettAvailable = null;
function hasMarlett() {
  if (marlettAvailable === null) {
    try {
      marlettAvailable = document.fonts.check('10px Marlett');
    } catch {
      marlettAvailable = false;
    }
  }
  return marlettAvailable;
}

/**
 * XP-style context menu.
 *
 * Item shape:
 *   { label, action, icon?, glyph?, bold?, disabled?, checked?, radio? }
 *   { type: 'separator' }
 *   { label, submenu: Item[], icon?, disabled? }
 */
export default function ContextMenu({ x, y, items, onAction, onClose }) {
  const menuRef = useRef(null);
  const [pos, setPos] = useState({ x, y });

  // Like Win32 menus: flip about the anchor point when the menu would
  // leave the screen, then clamp
  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let ax = x;
    let ay = y;
    if (x + rect.width > window.innerWidth) ax = x - rect.width;
    if (y + rect.height > window.innerHeight) ay = y - rect.height;
    if (ax < 0) ax = 0;
    if (ay < 0) ay = 0;
    setPos({ x: ax, y: ay });
  }, [x, y]);

  // Close on click-outside or Escape
  useEffect(() => {
    function handleMouseDown(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    }
    function handleKey(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    }
    // Delay listener to avoid catching the same right-click that opened us
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleMouseDown, true);
      document.addEventListener('contextmenu', handleMouseDown, true);
      document.addEventListener('keydown', handleKey, true);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleMouseDown, true);
      document.removeEventListener('contextmenu', handleMouseDown, true);
      document.removeEventListener('keydown', handleKey, true);
    };
  }, [onClose]);

  const handleItemClick = useCallback(
    (item, e) => {
      e.stopPropagation();
      if (item.disabled || item.submenu) return;
      onAction(item.action);
      onClose();
    },
    [onAction, onClose],
  );

  return createPortal(
    <MenuWrap
      ref={menuRef}
      style={{ left: pos.x, top: pos.y }}
      onMouseDown={e => e.stopPropagation()}
      onContextMenu={e => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {items.map((item, i) => {
        if (item.type === 'separator') return <Separator key={i} />;
        if (item.submenu) {
          return (
            <SubMenuItemWrap
              key={i}
              item={item}
              onAction={onAction}
              onClose={onClose}
            />
          );
        }
        return (
          <ItemDiv
            key={i}
            $disabled={item.disabled}
            $bold={item.bold}
            $tall={!!item.icon}
            onClick={e => handleItemClick(item, e)}
          >
            <span className="cm-icon">
              {item.icon ? (
                <img src={item.icon} alt="" className="cm-icon-img" />
              ) : item.glyph && hasMarlett() ? (
                <span className="cm-glyph">{item.glyph}</span>
              ) : item.checked ? (
                <span className="cm-check">✓</span>
              ) : item.radio ? (
                <span className="cm-radio">●</span>
              ) : null}
            </span>
            <span className="cm-label">{item.label}</span>
          </ItemDiv>
        );
      })}
    </MenuWrap>,
    document.body,
  );
}

/** Submenu wrapper — opens child menu to the right on hover */
function SubMenuItemWrap({ item, onAction, onClose }) {
  const [open, setOpen] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const timerRef = useRef(null);
  const wrapRef = useRef(null);

  const onEnter = () => {
    clearTimeout(timerRef.current);
    if (item.disabled) return;
    // Flip the submenu to the left when it would overflow the viewport
    if (wrapRef.current) {
      const rect = wrapRef.current.getBoundingClientRect();
      setFlipped(rect.right + 160 > window.innerWidth);
    }
    timerRef.current = setTimeout(() => setOpen(true), SUBMENU_SHOW_DELAY_MS);
  };
  const onLeave = () => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setOpen(false), 250);
  };
  const onOpenNow = () => {
    if (item.disabled) return;
    clearTimeout(timerRef.current);
    setOpen(true);
  };

  // Keep submenu open when hovering over it
  const onSubEnter = () => clearTimeout(timerRef.current);
  const onSubLeave = () => {
    timerRef.current = setTimeout(() => setOpen(false), 250);
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <div
      ref={wrapRef}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{ position: 'relative' }}
    >
      <ItemDiv
        $disabled={item.disabled}
        $hasSubmenu
        $tall={!!item.icon}
        onClick={onOpenNow}
      >
        <span className="cm-icon">
          {item.icon ? (
            <img src={item.icon} alt="" className="cm-icon-img" />
          ) : null}
        </span>
        <span className="cm-label">{item.label}</span>
        <span className="cm-arrow" />
      </ItemDiv>
      {open && item.submenu && (
        <SubMenuContainer
          $flipped={flipped}
          onMouseEnter={onSubEnter}
          onMouseLeave={onSubLeave}
        >
          {item.submenu.map((sub, j) => {
            if (sub.type === 'separator') return <Separator key={j} />;
            if (sub.submenu) {
              return (
                <SubMenuItemWrap
                  key={j}
                  item={sub}
                  onAction={onAction}
                  onClose={onClose}
                />
              );
            }
            return (
              <ItemDiv
                key={j}
                $disabled={sub.disabled}
                $bold={sub.bold}
                $tall={!!sub.icon}
                onClick={e => {
                  e.stopPropagation();
                  if (!sub.disabled) {
                    onAction(sub.action);
                    onClose();
                  }
                }}
              >
                <span className="cm-icon">
                  {sub.icon ? (
                    <img src={sub.icon} alt="" className="cm-icon-img" />
                  ) : sub.glyph && hasMarlett() ? (
                    <span className="cm-glyph">{sub.glyph}</span>
                  ) : sub.checked ? (
                    <span className="cm-check">✓</span>
                  ) : sub.radio ? (
                    <span className="cm-radio">●</span>
                  ) : null}
                </span>
                <span className="cm-label">{sub.label}</span>
              </ItemDiv>
            );
          })}
        </SubMenuContainer>
      )}
    </div>
  );
}

// --- Styled components ---

const MenuWrap = styled.div`
  position: fixed;
  z-index: 99999;
  background: #fff;
  border: 1px solid #aca899;
  box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.35);
  padding: 2px 0;
  min-width: 120px;
  font-family: Tahoma, 'Noto Sans', sans-serif;
  font-size: 11px;
  user-select: none;
  animation: ${menuFade} ${MENU_FADE_MS}ms;
`;

const SubMenuContainer = styled.div`
  position: absolute;
  ${({ $flipped }) =>
    $flipped ? 'right: calc(100% - 4px);' : 'left: calc(100% - 4px);'}
  top: -3px;
  background: #fff;
  border: 1px solid #aca899;
  box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.35);
  padding: 2px 0;
  min-width: 120px;
  z-index: 1;
  animation: ${menuFade} ${MENU_FADE_MS}ms;
`;

const ItemDiv = styled.div`
  display: flex;
  align-items: center;
  height: ${({ $tall }) => ($tall ? 22 : 18)}px;
  padding: 0 20px 0 0;
  cursor: ${({ $disabled }) => ($disabled ? 'default' : 'pointer')};
  color: ${({ $disabled }) => ($disabled ? '#aca899' : '#000')};
  font-weight: ${({ $bold }) => ($bold ? '700' : 'normal')};

  &:hover {
    background-color: ${({ $disabled }) =>
      $disabled ? 'transparent' : '#316ac5'};
    color: ${({ $disabled }) => ($disabled ? '#aca899' : '#fff')};
  }

  .cm-icon {
    width: 22px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .cm-glyph {
    font-family: Marlett;
    font-size: 10px;
    line-height: 1;
  }
  .cm-icon-img {
    width: 16px;
    height: 16px;
  }
  .cm-check {
    font-size: 10px;
    line-height: 1;
  }
  .cm-radio {
    font-size: 7px;
    line-height: 1;
  }
  .cm-label {
    flex: 1;
    white-space: nowrap;
  }
  .cm-arrow {
    margin-left: 12px;
    width: 0;
    height: 0;
    border-style: solid;
    border-width: 3px 0 3px 3px;
    border-color: transparent transparent transparent currentColor;
  }
`;

const Separator = styled.div`
  height: 1px;
  background: #aca899;
  margin: 3px 2px;
`;
