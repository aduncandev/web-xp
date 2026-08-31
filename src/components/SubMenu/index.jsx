import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { menuFade, MENU_FADE_MS, SUBMENU_SHOW_DELAY_MS } from '../menuFade';

function SubMenu({ className, data, style, onClick, onItemContextMenu }) {
  const [hoverIndex, setHoverIndex] = useState(-1);
  const [openIndex, setOpenIndex] = useState(-1);
  const openTimer = useRef(null);
  function onHover(index, isMenu) {
    setHoverIndex(index);
    clearTimeout(openTimer.current);
    openTimer.current = setTimeout(() => {
      setOpenIndex(isMenu ? index : -1);
    }, SUBMENU_SHOW_DELAY_MS);
  }
  function onOpen(index) {
    clearTimeout(openTimer.current);
    setHoverIndex(index);
    setOpenIndex(index);
  }
  useEffect(() => () => clearTimeout(openTimer.current), []);
  return (
    <div style={{ ...style }} className={className}>
      {data.map((item, index) => (
        <SubMenuItem
          onClick={onClick}
          onHover={onHover}
          onOpen={onOpen}
          onItemContextMenu={onItemContextMenu}
          key={index}
          hover={hoverIndex === index}
          open={openIndex === index}
          item={item}
          index={index}
          className={className}
        />
      ))}
    </div>
  );
}

const SubMenuItem = ({
  index,
  item,
  className,
  hover,
  open,
  onHover,
  onOpen,
  onClick,
  onItemContextMenu,
}) => {
  function _onMouseOver() {
    onHover(index, item.type === 'menu');
  }
  function _onClick() {
    // `action` lets dynamic items carry a payload distinct from their label
    onClick(item.action || item.text);
  }
  switch (item.type) {
    case 'item':
      return (
        <div
          onClick={item.disable ? undefined : _onClick}
          onMouseEnter={_onMouseOver}
          onContextMenu={
            onItemContextMenu ? e => onItemContextMenu(e, item) : undefined
          }
          className={`${className}-item${item.disable ? ' disabled' : ''}`}
        >
          <img className={`${className}-img`} src={item.icon} alt="" />
          <div className={`${className}-text`}>{item.text}</div>
        </div>
      );
    case 'separator':
      return <div className={`${className}-separator`} />;
    case 'menu':
      return (
        <div
          onMouseEnter={_onMouseOver}
          onClick={() => onOpen(index)}
          className={`${className}-item ${hover ? 'hover' : ''}`}
        >
          <img className={`${className}-img`} src={item.icon} alt="" />
          <div className={`${className}-text`}>{item.text}</div>
          <div className={`${className}-arrow`}>
            {open && (
              <StyledSubMenu
                data={item.items}
                bottom={item.bottom}
                onClick={onClick}
                onItemContextMenu={onItemContextMenu}
              />
            )}
          </div>
        </div>
      );
    default:
      return null;
  }
};

const StyledSubMenu = styled(SubMenu)`
  position: absolute;
  z-index: 1;
  left: ${({ left }) => left || '100%'};
  bottom: ${({ bottom }) => bottom || '-1px'};
  background-color: white;
  padding-left: 1px;
  box-shadow: inset 0 0 0 1px #72ade9, 2px 3px 3px rgb(0, 0, 0, 0.5);
  animation: ${menuFade} ${MENU_FADE_MS}ms;
  &-separator {
    padding: 0 5px;
    height: 2px;
    box-shadow: inset 3px 0 #4081ff;
    background: linear-gradient(
      to right,
      rgba(0, 0, 0, 0) 0%,
      rgba(0, 0, 0, 0.1) 50%,
      rgba(0, 0, 0, 0) 100%
    );
  }
  &-item {
    height: 25px;
    display: flex;
    align-items: center;
    padding: 0 10px;
    box-shadow: inset 3px 0 #4081ff;
    position: relative;
    padding-right: 22px;
    color: black;
  }
  &-item.hover {
    background-color: #316ac5;
    color: white;
  }
  &-item.disabled,
  &-item.disabled:hover {
    background-color: transparent;
    color: #aca899;
  }
  &-item:hover {
    background-color: #316ac5;
    color: white;
    &-arrow:before {
      border-left-color: #fff;
    }
  }
  &-item:hover,
  &-item.hover > &-arrow:before {
    border-left-color: #fff;
  }
  &-img {
    margin-right: 6px;
    width: 16px;
    height: 16px;
  }
  &-text {
    font-size: 11px;
    white-space: nowrap;
  }
  &-arrow {
    position: absolute;
    right: 0;
    height: 100%;
    width: 10px;
    &:before {
      top: 9px;
      right: 6px;
      content: '';
      display: block;
      border: 4px solid transparent;
      border-right: 0;
      border-left-color: #000;
      position: absolute;
    }
  }
`;

export default StyledSubMenu;
