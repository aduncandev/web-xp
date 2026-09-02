import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import WindowDropDown from './WindowDropDown';

export function WindowDropDowns({
  items,
  onClickItem,
  className,
  height = 20,
}) {
  const dropDown = useRef(null);
  const [openOption, setOpenOption] = useState('');
  function hoverOption(option) {
    if (openOption) setOpenOption(option);
  }
  function _onClickItem(name) {
    setOpenOption('');
    onClickItem(name);
  }
  function onMouseUp(e) {
    if (!dropDown.current.contains(e.target)) setOpenOption('');
  }
  useEffect(() => {
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);
  return (
    <div
      className={`${className} ${openOption ? 'drop-downs--open' : ''}`}
      ref={dropDown}
    >
      {Object.keys(items).map(name => (
        <div className="drop-down" key={name}>
          <div
            key={name}
            onMouseDown={() => {
              setOpenOption(name);
            }}
            onMouseEnter={() => hoverOption(name)}
            className={`drop-down__label ${
              openOption === name ? 'drop-down__label--active' : ''
            }`}
          >
            {name}
          </div>
          {openOption === name && (
            <WindowDropDown
              onClick={_onClickItem}
              items={items[name]}
              position={{ top: `${height}px`, left: '0' }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default styled(WindowDropDowns)`
  display: inline-flex;
  height: ${({ height }) => height || 20}px;
  line-height: ${({ height }) => height || 20}px;
  position: relative;
  .drop-down {
    font-size: var(--xp-font-ui, 11px);
    height: 100%;
    position: relative;
  }
  .drop-down__label--active {
    background-color: var(--xp-menu-highlight, #316ac5);
    color: var(--xp-highlight-text, #fff);
  }
  .drop-down__label {
    padding: 0 7px;
  }
  /* titles light up under the pointer only while a menu is open */
  &.drop-downs--open .drop-down__label:hover {
    background-color: var(--xp-menu-highlight, #316ac5);
    color: var(--xp-highlight-text, #fff);
  }
`;
