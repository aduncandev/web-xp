import React from 'react';

import ErrorBox from './ErrorBox';
import MinesweeperComponent from './Minesweeper';
import VoltorbFlipComponent from './VoltorbFlip';
import PinballComponent from './Pinball';
import MarioVsLuigiComponent from './MarioVsLuigi';
import { screenSize } from '../screen';

// Device compatibility: which programs refuse a phone or a small screen, and
// what they show instead. Checked at render and again at launch by resolveLaunchLayout.

export const isMobileUA = () => {
  if (typeof window === 'undefined') return false;
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  return (
    /android/i.test(userAgent) ||
    (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream)
  );
};

const isScreenTooSmall = (minW, minH) => {
  if (typeof window === 'undefined') return false;
  const { width, height } = screenSize();
  return width < minW || height < minH;
};

export const checkMinesweeperBlock = () => isMobileUA();
export const checkPinballBlock = () => isMobileUA() || isScreenTooSmall(600, 470);
export const checkVoltorbBlock = () => isScreenTooSmall(570, 670);

/** The window a blocked program opens instead: an error box, auto-height. */
export const WARNING_BOX_LAYOUT = {
  defaultSize: { width: 380, height: 0 },
  centerAs: { width: 380, height: 200 },
  maximized: false,
};

export function WrappedMinesweeper(props) {
  if (checkMinesweeperBlock()) {
    return (
      <ErrorBox
        {...props}
        message="Mobile Device Detected: Minesweeper is designed for desktop mouse interaction and does not function correctly on mobile devices."
        title="Compatibility Warning"
        iconType="warning"
      />
    );
  }
  return <MinesweeperComponent {...props} />;
}

export function WrappedPinball(props) {
  if (checkPinballBlock()) {
    return (
      <ErrorBox
        {...props}
        message="Incompatible Device / Screen: 3D Pinball requires a desktop environment and a screen size of at least 600x470px."
        title="Compatibility Warning"
        iconType="warning"
      />
    );
  }
  return <PinballComponent {...props} />;
}

export function WrappedMarioVsLuigi(props) {
  if (isMobileUA()) {
    return (
      <ErrorBox
        {...props}
        message="Mobile Device Detected: Mario vs Luigi requires a desktop browser with keyboard input."
        title="Compatibility Warning"
        iconType="warning"
      />
    );
  }
  return <MarioVsLuigiComponent {...props} />;
}

export function WrappedVoltorb(props) {
  if (checkVoltorbBlock()) {
    return (
      <ErrorBox
        {...props}
        message="Screen Too Small: Voltorb Flip requires a viewport of at least 570x670px. Please rotate your device or use a larger screen."
        title="Display Error"
      />
    );
  }
  return <VoltorbFlipComponent {...props} />;
}
