import React from 'react';

// Small 16px toolbar glyphs drawn inline — no matching assets existed.

const S = { width: 16, height: 16 };

export const NewIcon = () => (
  <svg {...S} viewBox="0 0 16 16">
    <path d="M3 1h7l3 3v11H3z" fill="#fff" stroke="#4d5a6b" />
    <path d="M10 1v3h3" fill="none" stroke="#4d5a6b" />
  </svg>
);

export const OpenIcon = () => (
  <svg {...S} viewBox="0 0 16 16">
    <path d="M1 4h5l1 2h7v8H1z" fill="#f7d675" stroke="#a58328" />
    <path d="M3 8h11l-2 6H1z" fill="#ffe9a2" stroke="#a58328" />
  </svg>
);

export const SaveIcon = () => (
  <svg {...S} viewBox="0 0 16 16">
    <path d="M1 1h13l1 1v13H1z" fill="#3b5fc0" stroke="#1d3a80" />
    <rect x="4" y="1" width="8" height="5" fill="#e8edf7" />
    <rect x="9" y="2" width="2" height="3" fill="#3b5fc0" />
    <rect x="3" y="8" width="10" height="7" fill="#e8edf7" />
    <line x1="5" y1="10" x2="11" y2="10" stroke="#9aa7bd" />
    <line x1="5" y1="12" x2="11" y2="12" stroke="#9aa7bd" />
  </svg>
);

export const PrintIcon = () => (
  <svg {...S} viewBox="0 0 16 16">
    <rect x="4" y="1" width="8" height="4" fill="#fff" stroke="#4d5a6b" />
    <rect
      x="1"
      y="5"
      width="14"
      height="6"
      rx="1"
      fill="#c8cfda"
      stroke="#4d5a6b"
    />
    <rect x="4" y="9" width="8" height="6" fill="#fff" stroke="#4d5a6b" />
    <circle cx="13" cy="7" r="1" fill="#7fbf58" />
  </svg>
);

export const FindIcon = () => (
  <svg {...S} viewBox="0 0 16 16">
    <circle cx="6" cy="6" r="4" fill="none" stroke="#1d3a80" strokeWidth="2" />
    <line x1="9" y1="9" x2="14" y2="14" stroke="#1d3a80" strokeWidth="2" />
  </svg>
);

export const CutIcon = () => (
  <svg {...S} viewBox="0 0 16 16">
    <line x1="4" y1="1" x2="10" y2="11" stroke="#4d5a6b" strokeWidth="1.4" />
    <line x1="12" y1="1" x2="6" y2="11" stroke="#4d5a6b" strokeWidth="1.4" />
    <circle
      cx="5"
      cy="13"
      r="2"
      fill="none"
      stroke="#3b5fc0"
      strokeWidth="1.4"
    />
    <circle
      cx="11"
      cy="13"
      r="2"
      fill="none"
      stroke="#3b5fc0"
      strokeWidth="1.4"
    />
  </svg>
);

export const CopyIcon = () => (
  <svg {...S} viewBox="0 0 16 16">
    <rect x="2" y="2" width="8" height="10" fill="#fff" stroke="#4d5a6b" />
    <rect x="6" y="5" width="8" height="10" fill="#fff" stroke="#4d5a6b" />
    <line x1="8" y1="8" x2="12" y2="8" stroke="#9aa7bd" />
    <line x1="8" y1="10" x2="12" y2="10" stroke="#9aa7bd" />
    <line x1="8" y1="12" x2="12" y2="12" stroke="#9aa7bd" />
  </svg>
);

export const PasteIcon = () => (
  <svg {...S} viewBox="0 0 16 16">
    <rect
      x="2"
      y="2"
      width="10"
      height="13"
      rx="1"
      fill="#b58a4e"
      stroke="#7a5a2b"
    />
    <rect
      x="5"
      y="1"
      width="4"
      height="3"
      rx="1"
      fill="#c8cfda"
      stroke="#7a5a2b"
    />
    <rect x="6" y="6" width="8" height="9" fill="#fff" stroke="#4d5a6b" />
    <line x1="8" y1="9" x2="12" y2="9" stroke="#9aa7bd" />
    <line x1="8" y1="11" x2="12" y2="11" stroke="#9aa7bd" />
  </svg>
);

export const UndoIcon = () => (
  <svg {...S} viewBox="0 0 16 16">
    <path
      d="M3 6h7a4 4 0 0 1 0 8H6"
      fill="none"
      stroke="#3b5fc0"
      strokeWidth="1.6"
    />
    <path d="M6 2L2 6l4 4z" fill="#3b5fc0" />
  </svg>
);

export const DateTimeIcon = () => (
  <svg {...S} viewBox="0 0 16 16">
    <rect x="1" y="2" width="10" height="10" fill="#fff" stroke="#4d5a6b" />
    <rect x="1" y="2" width="10" height="3" fill="#c04a3b" />
    <circle cx="11" cy="11" r="4.5" fill="#fff" stroke="#1d3a80" />
    <line x1="11" y1="11" x2="11" y2="8.5" stroke="#1d3a80" />
    <line x1="11" y1="11" x2="13" y2="11" stroke="#1d3a80" />
  </svg>
);

export const BulletsIcon = () => (
  <svg {...S} viewBox="0 0 16 16">
    <circle cx="3" cy="4" r="1.5" fill="#000" />
    <circle cx="3" cy="8" r="1.5" fill="#000" />
    <circle cx="3" cy="12" r="1.5" fill="#000" />
    <line x1="6" y1="4" x2="14" y2="4" stroke="#000" />
    <line x1="6" y1="8" x2="14" y2="8" stroke="#000" />
    <line x1="6" y1="12" x2="14" y2="12" stroke="#000" />
  </svg>
);

const AlignBars = ({ widths }) => (
  <svg {...S} viewBox="0 0 16 16">
    {widths.map((w, i) => (
      <line
        key={i}
        x1={w[0]}
        y1={3 + i * 3}
        x2={w[1]}
        y2={3 + i * 3}
        stroke="#000"
      />
    ))}
  </svg>
);

export const AlignLeftIcon = () => (
  <AlignBars
    widths={[
      [2, 14],
      [2, 9],
      [2, 14],
      [2, 9],
    ]}
  />
);
export const AlignCenterIcon = () => (
  <AlignBars
    widths={[
      [2, 14],
      [4, 12],
      [2, 14],
      [4, 12],
    ]}
  />
);
export const AlignRightIcon = () => (
  <AlignBars
    widths={[
      [2, 14],
      [7, 14],
      [2, 14],
      [7, 14],
    ]}
  />
);
