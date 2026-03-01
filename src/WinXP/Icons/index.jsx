import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';

// Icons component definition (no changes to its JS logic)
function Icons({
  icons,
  onMouseDown,
  onDoubleClick,
  displayFocus,
  mouse,
  selecting,
  setSelectedIcons,
}) {
  const [iconsRect, setIconsRect] = useState([]);
  function measure(rect) {
    // Prevent adding duplicates if measure is called multiple times for the same icon
    if (iconsRect.find(r => r.id === rect.id)) return;
    // Use functional update for setting state based on previous state
    setIconsRect(prevIconsRect => [...prevIconsRect, rect]);
  }
  useEffect(() => {
    if (!selecting) return;
    const sx = Math.min(selecting.x, mouse.docX);
    const sy = Math.min(selecting.y, mouse.docY);
    const sw = Math.abs(selecting.x - mouse.docX);
    const sh = Math.abs(selecting.y - mouse.docY);
    const selectedIds = iconsRect
      .filter(rect => {
        const { x, y, w, h } = rect;
        return x - sx < sw && sx - x < w && y - sy < sh && sy - y < h;
      })
      .map(icon => icon.id);
    setSelectedIcons(selectedIds);
  }, [iconsRect, setSelectedIcons, selecting, mouse.docX, mouse.docY]); // Added mouse.docX, mouse.docY as they are used
  return (
    <IconsContainer>
      {icons.map(iconData => (
        <StyledIcon
          key={iconData.id}
          {...iconData}
          displayFocus={displayFocus}
          onMouseDown={onMouseDown}
          onDoubleClick={onDoubleClick}
          measure={measure}
        />
      ))}
    </IconsContainer>
  );
}

// Icon component definition (no changes to its JS logic)
function Icon({
  title,
  onMouseDown,
  onDoubleClick,
  icon, // image src
  className,
  id,
  component, // This is the actual component to render on double click
  measure,
}) {
  const ref = useRef(null);
  function _onMouseDown() {
    if (onMouseDown && typeof onMouseDown === 'function') {
      onMouseDown(id); // Pass the icon's ID
    }
  }
  function _onDoubleClick() {
    if (onDoubleClick && typeof onDoubleClick === 'function') {
      onDoubleClick(component); // Pass the component to open
    }
  }
  useEffect(() => {
    const target = ref.current;
    if (!target) return;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const posX = left + window.scrollX;
    const posY = top + window.scrollY;
    // Ensure measure is only called if it's a function
    if (typeof measure === 'function') {
      measure({ id, x: posX, y: posY, w: width, h: height });
    }
  }, [id, measure]); // Added measure to dependency array
  return (
    <div
      className={className}
      onMouseDown={_onMouseDown}
      onDoubleClick={_onDoubleClick}
      ref={ref}
    >
      <div className={`${className}__img__container`}>
        <img src={icon} alt={title} className={`${className}__img`} />
      </div>
      <div className={`${className}__text__container`}>
        <div className={`${className}__text`}>{title}</div>
      </div>
    </div>
  );
}

// --- CSS MODIFICATIONS START HERE ---

const IconsContainer = styled.div`
  position: absolute;
  top: 40px;
  left: 40px;
  right: 20px;
  bottom: 30px;

  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  align-content: flex-start;
  overflow-y: auto;
  overflow-x: hidden;
  gap: 15px;

  /* This allows mouse events to pass through the container to elements behind it,
     like the main desktop area that might be handling drag-to-select. */
  pointer-events: none;
`;

const StyledIcon = styled(Icon)`
  width: 70px;
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;

  /* This ensures that the icons themselves are still interactive (clickable, draggable). */
  pointer-events: auto;

  /* Descendant styles (no changes here, assuming they are correct) */
  &__text__container {
    width: 100%;
    font-size: 10px;
    color: white;
    text-shadow: 0 1px 1px black;
    margin-top: 5px;
    display: flex;
    justify-content: center;

    &:before {
      content: '';
      display: block;
      flex-grow: 1;
    }
    &:after {
      content: '';
      display: block;
      flex-grow: 1;
    }
  }
  &__text {
    padding: 0 3px 2px;
    background-color: ${(
      { isFocus, displayFocus }, // isFocus might not be defined here if displayFocus is the sole prop
    ) => (isFocus && displayFocus ? '#0b61ff' : 'transparent')};
    text-align: center;
    flex-shrink: 1;
  }
  &__img__container {
    width: 30px;
    height: 30px;
    filter: ${(
      { isFocus, displayFocus }, // isFocus might not be defined here
    ) => (isFocus && displayFocus ? 'drop-shadow(0 0 blue)' : '')};
  }
  &__img {
    width: 30px;
    height: 30px;
    opacity: ${(
      { isFocus, displayFocus }, // isFocus might not be defined here
    ) => (isFocus && displayFocus ? 0.5 : 1)};
  }
`;

// --- CSS MODIFICATIONS END HERE ---

export default Icons;
