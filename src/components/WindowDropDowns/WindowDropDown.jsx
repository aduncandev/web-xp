import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

import iePaper from 'assets/windowsIcons/ie-paper.png';
import ieBook from 'assets/windowsIcons/ie-book.png';
import check from 'assets/windowsIcons/checked.png';
import folder from 'assets/windowsIcons/folder.png';
import { menuFade, MENU_FADE_MS, SUBMENU_SHOW_DELAY_MS } from '../menuFade';

export function WindowDropDown({ items, position = {}, onClick }) {
  const [option, setOption] = useState('');
  const [openMenu, setOpenMenu] = useState('');
  const openTimer = useRef(null);
  function hoverRow(item) {
    setOption(item.text);
    clearTimeout(openTimer.current);
    openTimer.current = setTimeout(() => {
      setOpenMenu(item.type === 'menu' ? item.text : '');
    }, SUBMENU_SHOW_DELAY_MS);
  }
  function openNow(item) {
    clearTimeout(openTimer.current);
    setOption(item.text);
    setOpenMenu(item.text);
  }
  useEffect(() => () => clearTimeout(openTimer.current), []);
  return (
    <Div {...position}>
      <div className="drop-down__menu">
        {items.map((item, index) => {
          switch (item.type) {
            case 'item':
              return (
                <div
                  key={item.text}
                  className={`drop-down__row${item.disable ? '--disable' : ''}`}
                  onMouseEnter={() => hoverRow(item)}
                  onClick={e => {
                    if (item.disable) {
                      // Disabled entries must not activate or close the menu
                      e.stopPropagation();
                      return;
                    }
                    onClick(item.text);
                  }}
                >
                  <div className="drop-down__check">
                    <RowSymbol type={item.symbol} />
                  </div>
                  <div className="drop-down__text">{item.text}</div>
                  <span className="drop-down__hot-key">
                    {item.hotkey || ''}
                  </span>
                  <div className="drop-down__arrow--disable" />
                </div>
              );
            case 'menu':
              return (
                <div
                  key={item.text}
                  className={`drop-down__row${
                    option === item.text ? '--active' : ''
                  }`}
                  onMouseEnter={() => hoverRow(item)}
                  onClick={() => openNow(item)}
                >
                  <div className="drop-down__check">
                    <RowSymbol type={item.symbol} />
                  </div>
                  <div className="drop-down__text">{item.text}</div>
                  <span className="drop-down__hot-key">
                    {item.hotkey || ''}
                  </span>
                  <div className="drop-down__arrow" />
                  <div style={{ position: 'relative' }}>
                    {openMenu === item.text && (
                      <WindowDropDown
                        position={item.position}
                        items={item.items}
                        onClick={onClick}
                      />
                    )}
                  </div>
                </div>
              );
            case 'separator':
              return <div key={index} className="drop-down__separator" />;
            default:
              return null;
          }
        })}
      </div>
    </Div>
  );
}

function RowSymbol({ type }) {
  switch (type) {
    case 'ie-paper':
      return <img className="drop-down__icon" src={iePaper} alt="" />;
    case 'ie-book':
      return <img className="drop-down__icon" src={ieBook} alt="" />;
    case 'folder':
      return <img className="drop-down__icon" src={folder} alt="" />;
    case 'check':
      return <img src={check} alt="" />;
    case 'circle':
      return (
        <div
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: '#000',
          }}
        />
      );
    default:
      return null;
  }
}

const Div = styled.div`
  left: ${({ left }) => (left ? left : 'initial')};
  top: ${({ top }) => (top ? top : 'initial')};
  right: ${({ right }) => (right ? right : 'initial')};
  bottom: ${({ bottom }) => (bottom ? bottom : 'initial')};
  position: absolute;
  display: flex;
  font-size: 11px;
  border-bottom: 1px solid transparent;
  .drop-down__row {
    position: relative;
    display: contents;
    &:hover > *:not(:nth-child(5)) {
      background: #316ac5;
      color: #fff;
    }
    &:hover > .drop-down__arrow:before {
      border-color: transparent transparent transparent #fff;
    }
  }
  .drop-down__row--active {
    position: relative;
    display: contents;
    & > *:not(:nth-child(5)) {
      background: #316ac5;
      color: #fff;
    }
    & > .drop-down__arrow:before {
      border-color: transparent transparent transparent #fff;
    }
  }
  .drop-down__row--disable {
    display: contents;
    color: #aca899;
    &:hover > *:not(:nth-child(5)) {
      background: #316ac5;
    }
  }
  .drop-down__title {
    padding: 0 7px;
    height: 100%;
    line-height: 20px;
    color: white;
    background-color: #316ac5;
  }
  .drop-down__menu {
    background-color: #fff;
    /* Menus must float above app-internal raised elements (tab strips use
       z-index: 1 and would otherwise cover open menus) */
    z-index: 60;
    padding: 2px;
    line-height: 18px;
    display: grid;
    position: absolute;
    box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.35);
    border: 1px solid #aca899;
    grid-template-columns: 16px auto auto 15px 0px;
    animation: ${menuFade} ${MENU_FADE_MS}ms;
  }
  .drop-down__separator {
    grid-column: 1 / 5;
    height: 7px;
    padding: 3px 1px;
    background-color: #aca899;
    background-clip: content-box;
  }
  .drop-down__check {
    grid-column: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .drop-down__icon {
    max-width: 13px;
    max-height: 13px;
    transform: translateX(-2px);
  }
  .drop-down__text {
    white-space: nowrap;
    padding-right: 8px;
    grid-column: 2;
  }
  .drop-down__hot-key {
    white-space: nowrap;
    grid-column: 3;
    padding-right: 2px;
  }
  .drop-down__arrow {
    position: relative;
    grid-column: 4;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    &:before {
      width: 0;
      height: 0;
      border-style: solid;
      border-width: 3px 0 3px 3px;
      border-color: transparent transparent transparent #000;
      content: '';
      display: block;
    }
  }
  .drop-down__arrow--disable {
    grid-column: 4;
    width: 100%;
    height: 100%;
  }
`;
export default WindowDropDown;
