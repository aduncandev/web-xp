import React, { useState } from 'react';
import styled from 'styled-components';

import XPButton from '../../../components/XPButton';
import XPDialogFrame from '../../../components/XPDialogFrame';
import XPSelect from '../../../components/XPSelect';

// XP's defaults: menus fade, fonts smoothed the standard way, shadows under
// menus, window contents shown while dragging, keyboard cues hidden
export const DEFAULT_EFFECTS = {
  transition: true,
  transitionEffect: 'Fade effect',
  smooth: true,
  smoothMethod: 'Standard',
  largeIcons: false,
  menuShadows: true,
  dragContents: true,
  hideUnderlines: true,
};

const TRANSITIONS = ['Fade effect', 'Scroll effect'].map(v => ({
  value: v,
  label: v,
}));
const SMOOTHING = ['Standard', 'ClearType'].map(v => ({ value: v, label: v }));

// Positions are pixels from the dialog's top-left corner on a real XP,
// mapped into the client area (4px frame, 29px caption)
const at = (x, y, w, h) => ({
  position: 'absolute',
  left: x - 4,
  top: y - 29,
  ...(w != null ? { width: w } : {}),
  ...(h != null ? { height: h } : {}),
});

function Check({ x, y, checked, onChange, children, disabled }) {
  return (
    <label className="fx__check" style={at(x, y)}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={() => onChange(!checked)}
      />
      <span>{children}</span>
    </label>
  );
}

/** Appearance > Effects: the six switches of XP's dialog. */
export default function EffectsDialog({ value, onOK, onCancel }) {
  const [fx, setFx] = useState({ ...DEFAULT_EFFECTS, ...value });
  const set = patch => setFx(f => ({ ...f, ...patch }));
  return (
    <XPDialogFrame title="Effects" width={412} help onClose={onCancel}>
      <Body>
        <Check
          x={13}
          y={37}
          checked={fx.transition}
          onChange={transition => set({ transition })}
        >
          Use the following transition effect for menus and tooltips:
        </Check>
        <div
          className={fx.transition ? '' : 'fx__off'}
          style={at(32, 57, 120, 21)}
        >
          <XPSelect
            width={120}
            options={TRANSITIONS}
            value={fx.transitionEffect}
            onChange={transitionEffect => set({ transitionEffect })}
          />
        </div>
        <Check
          x={13}
          y={83}
          checked={fx.smooth}
          onChange={smooth => set({ smooth })}
        >
          Use the following method to smooth edges of screen fonts:
        </Check>
        <div
          className={fx.smooth ? '' : 'fx__off'}
          style={at(32, 102, 120, 21)}
        >
          <XPSelect
            width={120}
            options={SMOOTHING}
            value={fx.smoothMethod}
            onChange={smoothMethod => set({ smoothMethod })}
          />
        </div>
        <Check
          x={13}
          y={135}
          checked={fx.largeIcons}
          onChange={largeIcons => set({ largeIcons })}
        >
          Use large icons
        </Check>
        <Check
          x={13}
          y={158}
          checked={fx.menuShadows}
          onChange={menuShadows => set({ menuShadows })}
        >
          Show shadows under menus
        </Check>
        <Check
          x={13}
          y={180}
          checked={fx.dragContents}
          onChange={dragContents => set({ dragContents })}
        >
          Show window contents while dragging
        </Check>
        <Check
          x={13}
          y={203}
          checked={fx.hideUnderlines}
          onChange={hideUnderlines => set({ hideUnderlines })}
        >
          Hide underlined letters for keyboard navigation until I press the Alt
          key
        </Check>
        <div style={at(244, 280, 75, 23)}>
          <XPButton autoFocus onClick={() => onOK(fx)}>
            OK
          </XPButton>
        </div>
        <div style={at(325, 280, 75, 23)}>
          <XPButton onClick={onCancel}>Cancel</XPButton>
        </div>
      </Body>
    </XPDialogFrame>
  );
}

const Body = styled.div`
  position: relative;
  width: 404px;
  height: 285px;
  background: var(--xp-face, #ece9d8);
  font-family: Tahoma, 'Noto Sans', sans-serif;
  font-size: 11px;
  color: var(--xp-window-text, #000);
  user-select: none;
  .fx__check {
    display: flex;
    align-items: center;
    gap: 4px;
    white-space: nowrap;
    line-height: 13px;
  }
  .fx__check input {
    margin: 0;
  }
  .fx__off {
    pointer-events: none;
    opacity: 0.55;
  }
  .xp-button {
    width: 100%;
    height: 100%;
    min-width: 0;
  }
`;
