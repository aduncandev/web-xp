import React from 'react';

import { getArt } from '../../../xpArt';

/**
 * XP-style Control Panel category icons. Each first checks the real-art
 * drop-in registry (src/assets/xp/cpl-<name>.png) and only falls back to
 * the inline drawing when no genuine asset has been provided.
 * Each accepts a `size` prop (default 48).
 */

const withRealArt = (artName, Drawn) => {
  const Icon = ({ size = 48 }) => {
    const url = getArt(artName, null);
    if (url) {
      return (
        <img
          src={url}
          width={size}
          height={size}
          alt=""
          draggable={false}
          style={{ display: 'block', flexShrink: 0 }}
        />
      );
    }
    return <Drawn size={size} />;
  };
  return Icon;
};

const S = ({ size = 48, children, vb = '0 0 48 48' }) => (
  <svg
    width={size}
    height={size}
    viewBox={vb}
    style={{ display: 'block', flexShrink: 0 }}
  >
    {children}
  </svg>
);

const Monitor = ({ screen }) => (
  <g>
    <rect
      x="4"
      y="6"
      width="40"
      height="30"
      rx="3"
      fill="#E8E4D8"
      stroke="#8A8778"
    />
    <rect
      x="8"
      y="10"
      width="32"
      height="22"
      rx="1"
      fill="url(#cpScreenGrad)"
      stroke="#5B5B5B"
    />
    {screen}
    <rect x="19" y="36" width="10" height="4" fill="#CFCABA" stroke="#8A8778" />
    <rect
      x="13"
      y="40"
      width="22"
      height="3"
      rx="1.5"
      fill="#B8B4A2"
      stroke="#8A8778"
    />
  </g>
);

const ScreenDefs = () => (
  <defs>
    <linearGradient id="cpScreenGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#7FB2F0" />
      <stop offset="0.55" stopColor="#3C76CE" />
      <stop offset="0.56" stopColor="#4FA13C" />
      <stop offset="1" stopColor="#7BC96A" />
    </linearGradient>
  </defs>
);

const AppearanceDrawn = ({ size }) => (
  <S size={size}>
    <ScreenDefs />
    <Monitor />
    <g transform="translate(26 22) rotate(-30)">
      <rect
        x="0"
        y="8"
        width="6"
        height="14"
        rx="2"
        fill="#C8802A"
        stroke="#7A4E14"
      />
      <path d="M0 8 L3 0 L6 8 Z" fill="#E8E4D8" stroke="#7A4E14" />
      <path d="M2.2 3.5 L3.8 3.5 L3 1 Z" fill="#2F5FBF" />
    </g>
  </S>
);

const NetworkDrawn = ({ size }) => (
  <S size={size}>
    <defs>
      <radialGradient id="cpGlobe" cx="0.35" cy="0.3" r="0.9">
        <stop offset="0" stopColor="#9CCBFF" />
        <stop offset="1" stopColor="#1E62C8" />
      </radialGradient>
    </defs>
    <circle cx="24" cy="22" r="16" fill="url(#cpGlobe)" stroke="#0F3F8E" />
    <path
      d="M8 22 h32 M24 6 v32 M11 12 q13 8 26 0 M11 32 q13 -8 26 0"
      fill="none"
      stroke="#DCEBFF"
      strokeWidth="1.6"
    />
    <ellipse
      cx="24"
      cy="22"
      rx="9"
      ry="16"
      fill="none"
      stroke="#DCEBFF"
      strokeWidth="1.6"
    />
    <rect
      x="28"
      y="32"
      width="16"
      height="10"
      rx="1.5"
      fill="#E8E4D8"
      stroke="#8A8778"
    />
    <rect x="30" y="34" width="12" height="5" fill="#3C76CE" />
  </S>
);

const AddRemoveDrawn = ({ size }) => (
  <S size={size}>
    <rect x="8" y="18" width="30" height="22" fill="#C8975A" stroke="#7A5A26" />
    <path d="M8 18 L14 8 L44 8 L38 18 Z" fill="#E0B87E" stroke="#7A5A26" />
    <path d="M38 18 L44 8 L44 30 L38 40 Z" fill="#A9793C" stroke="#7A5A26" />
    <circle cx="23" cy="29" r="9" fill="#EFEFEF" stroke="#9A9A9A" />
    <circle cx="23" cy="29" r="8" fill="none" stroke="#B9E0FF" />
    <circle cx="23" cy="29" r="2.6" fill="#CFCFCF" stroke="#8A8A8A" />
    <path
      d="M40 26 v10 m-4 -4 l4 5 l4 -5"
      fill="none"
      stroke="#2E9E2E"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </S>
);

const SoundsDrawn = ({ size }) => (
  <S size={size}>
    <defs>
      <linearGradient id="cpSpk" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#8F8F8F" />
        <stop offset="1" stopColor="#4B4B4B" />
      </linearGradient>
    </defs>
    <rect x="6" y="18" width="9" height="12" fill="url(#cpSpk)" stroke="#333" />
    <path d="M15 18 L28 8 L28 40 L15 30 Z" fill="#B9B9B9" stroke="#333" />
    <path
      d="M33 16 q4 8 0 16 M38 12 q6 12 0 24 M43 8 q8 16 0 32"
      fill="none"
      stroke="#2F5FBF"
      strokeWidth="2.4"
      strokeLinecap="round"
    />
  </S>
);

const PerformanceDrawn = ({ size }) => (
  <S size={size}>
    <ScreenDefs />
    <Monitor />
    <g transform="translate(27 20) rotate(40)">
      <path
        d="M4 0 a6 6 0 1 0 6 8 l10 10 a2.6 2.6 0 0 0 3.6 -3.6 L13.6 4.4 A6 6 0 0 0 4 0 Z"
        fill="#C9C9C9"
        stroke="#5B5B5B"
      />
      <circle cx="6.5" cy="4.5" r="2.6" fill="#EFEFEF" stroke="#5B5B5B" />
    </g>
  </S>
);

const PrintersDrawn = ({ size }) => (
  <S size={size}>
    <rect x="12" y="6" width="24" height="12" fill="#FFFFFF" stroke="#8A8778" />
    <rect
      x="6"
      y="16"
      width="36"
      height="16"
      rx="2"
      fill="#DBD6C6"
      stroke="#8A8778"
    />
    <rect x="6" y="16" width="36" height="5" fill="#C3BEAC" />
    <circle cx="38" cy="24" r="1.8" fill="#3AA13A" />
    <rect
      x="12"
      y="28"
      width="24"
      height="14"
      fill="#FFFFFF"
      stroke="#8A8778"
    />
    <path
      d="M15 32 h18 M15 35 h18 M15 38 h12"
      stroke="#9FB6DC"
      strokeWidth="1.4"
    />
  </S>
);

const UserAccountsDrawn = ({ size }) => (
  <S size={size}>
    <defs>
      <linearGradient id="cpUser1" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#FFB35C" />
        <stop offset="1" stopColor="#D97A1B" />
      </linearGradient>
      <linearGradient id="cpUser2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#7FB2F0" />
        <stop offset="1" stopColor="#2E62B8" />
      </linearGradient>
    </defs>
    <circle cx="17" cy="15" r="8" fill="#F4C08C" stroke="#B07A3C" />
    <path
      d="M4 40 q0 -14 13 -14 q13 0 13 14 Z"
      fill="url(#cpUser1)"
      stroke="#B07A3C"
    />
    <circle cx="33" cy="18" r="7" fill="#F4C08C" stroke="#7A5A9C" />
    <path
      d="M22 42 q0 -12 11 -12 q11 0 11 12 Z"
      fill="url(#cpUser2)"
      stroke="#3C5A9C"
    />
  </S>
);

const DateTimeDrawn = ({ size }) => (
  <S size={size}>
    <rect
      x="4"
      y="8"
      width="26"
      height="24"
      rx="2"
      fill="#FFFFFF"
      stroke="#8A8778"
    />
    <rect x="4" y="8" width="26" height="7" rx="2" fill="#C33" />
    <g stroke="#B9C6DC" strokeWidth="1">
      <path d="M8 20 h18 M8 25 h18 M12 16 v13 M17 16 v13 M22 16 v13" />
    </g>
    <circle cx="33" cy="30" r="12" fill="#F4F4F4" stroke="#5B5B5B" />
    <circle cx="33" cy="30" r="10" fill="#FFFFFF" stroke="#9FB6DC" />
    <path
      d="M33 23 v7 l5 3"
      fill="none"
      stroke="#2F5FBF"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <circle cx="33" cy="30" r="1.4" fill="#2F5FBF" />
  </S>
);

const AccessibilityDrawn = ({ size }) => (
  <S size={size}>
    <defs>
      <radialGradient id="cpAcc" cx="0.35" cy="0.3" r="1">
        <stop offset="0" stopColor="#6FA0E8" />
        <stop offset="1" stopColor="#1E4FA8" />
      </radialGradient>
    </defs>
    <circle cx="24" cy="24" r="20" fill="url(#cpAcc)" stroke="#12336E" />
    <circle cx="24" cy="13" r="4" fill="#FFF" />
    <path
      d="M12 19 q12 4 24 0 l-1.5 4 q-7 2 -8.5 3 l2.5 12 l-4 1.5 l-4 -10 l-4 10 l-4 -1.5 l2.5 -12 q-1.5 -1 -8.5 -3 Z"
      fill="#FFF"
      transform="translate(4.7 0) scale(0.8)"
    />
  </S>
);

const SecurityDrawn = ({ size }) => (
  <S size={size}>
    <path
      d="M24 4 L42 10 V24 q0 14 -18 20 Q6 38 6 24 V10 Z"
      fill="#F4F4F4"
      stroke="#5B5B5B"
    />
    <path d="M24 7 L39 12 V24 H24 Z" fill="#D63A3A" />
    <path d="M24 7 L9 12 V24 H24 Z" fill="#3AA13A" />
    <path d="M9 24 H24 V41 Q11 36 9 24 Z" fill="#2F5FBF" />
    <path d="M39 24 H24 V41 Q37 36 39 24 Z" fill="#E8C63A" />
  </S>
);

const FolderOptionsDrawn = ({ size }) => (
  <S size={size}>
    <path d="M5 12 h14 l4 5 h20 v22 H5 Z" fill="#F7D779" stroke="#A98A2C" />
    <path d="M5 17 h38 v22 H5 Z" fill="#FFE79C" stroke="#A98A2C" />
    <circle cx="34" cy="32" r="9" fill="#EFEFEF" stroke="#5B5B5B" />
    <path
      d="M31 32 a3 3 0 1 1 4.5 2.6 q-1.5 0.8 -1.5 2.4 m0 2.4 v0.4"
      fill="none"
      stroke="#2F5FBF"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </S>
);

const SystemDrawn = ({ size }) => (
  <S size={size}>
    <ScreenDefs />
    <Monitor />
    <rect
      x="30"
      y="22"
      width="14"
      height="20"
      rx="1.5"
      fill="#DBD6C6"
      stroke="#8A8778"
    />
    <rect x="32.5" y="25" width="9" height="2.5" fill="#8A8778" />
    <rect x="32.5" y="29" width="9" height="2.5" fill="#8A8778" />
    <circle cx="37" cy="37" r="1.6" fill="#3AA13A" />
  </S>
);

// Public icons: real dropped-in art wins; the drawings above are fallbacks.
export const AppearanceIcon = withRealArt('cpl-appearance', AppearanceDrawn);
export const NetworkIcon = withRealArt('cpl-network', NetworkDrawn);
export const AddRemoveIcon = withRealArt('cpl-addremove', AddRemoveDrawn);
export const SoundsIcon = withRealArt('cpl-sounds', SoundsDrawn);
export const PerformanceIcon = withRealArt('cpl-performance', PerformanceDrawn);
export const PrintersIcon = withRealArt('cpl-printers', PrintersDrawn);
export const UserAccountsIcon = withRealArt('cpl-accounts', UserAccountsDrawn);
export const DateTimeIcon = withRealArt('cpl-datetime', DateTimeDrawn);
export const AccessibilityIcon = withRealArt(
  'cpl-accessibility',
  AccessibilityDrawn,
);
export const SecurityIcon = withRealArt('cpl-security', SecurityDrawn);
export const FolderOptionsIcon = withRealArt(
  'cpl-folderoptions',
  FolderOptionsDrawn,
);
export const SystemIcon = withRealArt('cpl-system', SystemDrawn);
