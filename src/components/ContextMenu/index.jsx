import React, { useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import styled from 'styled-components';

/**
 * Reusable XP-style context menu rendered via portal.
 *
 * Props:
 *   position: { x, y }   – screen coords
 *   items: Array<MenuItem> – menu definition
 *   onClose: () => void
 *
 * MenuItem shapes:
 *   { type: 'item', label, onClick, bold, disabled, checked }
 *   { type: 'separator' }
 *   { type: 'submenu', label, items: MenuItem[] }
 */
export default function ContextMenu({ position, items, onClose }) {
  const menuRef = useRef(null);

  // Adjust position so menu doesn't go off-screen
  const adjustedPos = useAdjustedPosition(menuRef, position);

  const handleOverlayClick = useCallback(
    e => {
      e.preventDefault();
      onClose();
    },
    [onClose],
  );

  // Close on Escape
  useEffect(() => {
    const handleKey = e => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return ReactDOM.createPortal(
    <Overlay onMouseDown={handleOverlayClick} onContextMenu={handleOverlayClick}>
      <MenuContainer
        ref={menuRef}
        style={{ left: adjustedPos.x, top: adjustedPos.y }}
        onMouseDown={e => e.stopPropagation()}
        onContextMenu={e => { e.preventDefault(); e.stopPropagation(); }}
      >
        {items.map((item, i) => (
          <MenuItemRenderer key={i} item={item} onClose={onClose} />
        ))}
      </MenuContainer>
    </Overlay>,
    document.body,
  );
}

function useAdjustedPosition(ref, position) {
  const [pos, setPos] = React.useState(position);

  useEffect(() => {
    if (!ref.current) {
      setPos(position);
      return;
    }
    const rect = ref.current.getBoundingClientRect();
    let x = position.x;
    let y = position.y;
    if (x + rect.width > window.innerWidth) {
      x = window.innerWidth - rect.width - 2;
    }
    if (y + rect.height > window.innerHeight) {
      y = window.innerHeight - rect.height - 2;
    }
    if (x < 0) x = 0;
    if (y < 0) y = 0;
    setPos({ x, y });
  }, [ref, position]);

  return pos;
}

function MenuItemRenderer({ item, onClose }) {
  if (item.type === 'separator') {
    return <Separator />;
  }

  if (item.type === 'submenu') {
    return (
      <SubMenu>
        <span className="ctx-submenu__label">{item.label}</span>
        <div className="ctx-submenu__items">
          {item.items.map((sub, i) => (
            <MenuItemRenderer key={i} item={sub} onClose={onClose} />
          ))}
        </div>
      </SubMenu>
    );
  }

  // Regular item
  const handleClick = e => {
    e.stopPropagation();
    if (item.disabled) return;
    if (item.onClick) item.onClick();
    onClose();
  };

  return (
    <Item
      onClick={handleClick}
      $bold={item.bold}
      $disabled={item.disabled}
      $checked={item.checked}
    >
      {item.label}
    </Item>
  );
}

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
`;

const MenuContainer = styled.div`
  position: fixed;
  background: #fff;
  border: 1px solid #808080;
  box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
  padding: 2px 0;
  min-width: 160px;
  font-size: 11px;
  font-family: Tahoma, 'Noto Sans', sans-serif;
  z-index: 10000;
`;

const Item = styled.div`
  padding: 4px 24px 4px 24px;
  cursor: default;
  position: relative;
  font-weight: ${({ $bold }) => ($bold ? 'bold' : 'normal')};
  color: ${({ $disabled }) => ($disabled ? '#808080' : 'inherit')};

  &:hover {
    background: ${({ $disabled }) => ($disabled ? 'transparent' : '#316ac5')};
    color: ${({ $disabled }) => ($disabled ? '#808080' : '#fff')};
  }

  ${({ $checked }) =>
    $checked
      ? `&::before {
      content: '\\2713';
      position: absolute;
      left: 8px;
    }`
      : ''}
`;

const Separator = styled.div`
  height: 1px;
  background: #d3d3d3;
  margin: 2px 2px;
`;

const SubMenu = styled.div`
  padding: 4px 24px;
  cursor: default;
  position: relative;

  &::after {
    content: '\\25B6';
    position: absolute;
    right: 8px;
    font-size: 8px;
    top: 50%;
    transform: translateY(-50%);
  }

  &:hover {
    background: #316ac5;
    color: #fff;
  }

  .ctx-submenu__items {
    display: none;
    position: absolute;
    left: 100%;
    top: -2px;
    background: #fff;
    border: 1px solid #808080;
    box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
    padding: 2px 0;
    min-width: 130px;
  }

  &:hover .ctx-submenu__items {
    display: block;
  }

  .ctx-submenu__items ${Item} {
    color: #000;
    &:hover {
      background: #316ac5;
      color: #fff;
    }
  }
`;
