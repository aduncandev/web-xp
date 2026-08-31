import React from 'react';
import styled from 'styled-components';

export const CARD_W = 71;
export const CARD_H = 96;

export const SUIT_GLYPH = { s: '♠', h: '♥', d: '♦', c: '♣' };
export const IS_RED = { s: false, c: false, h: true, d: true };
const RED = '#d40000';

export function rankLabel(rank) {
  if (rank === 1) return 'A';
  if (rank === 11) return 'J';
  if (rank === 12) return 'Q';
  if (rank === 13) return 'K';
  return String(rank);
}

export function buildDeck() {
  const deck = [];
  for (const suit of ['s', 'h', 'd', 'c']) {
    for (let rank = 1; rank <= 13; rank++) {
      deck.push({ id: suit + rank, suit, rank });
    }
  }
  return deck;
}

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* Classic pip layouts: [x, y, flipped] in fractions of the pip area. */
const L = 0.26;
const C = 0.5;
const R = 0.74;
const PIPS = {
  2: [
    [C, 0.16, 0],
    [C, 0.84, 1],
  ],
  3: [
    [C, 0.16, 0],
    [C, 0.5, 0],
    [C, 0.84, 1],
  ],
  4: [
    [L, 0.16, 0],
    [R, 0.16, 0],
    [L, 0.84, 1],
    [R, 0.84, 1],
  ],
  5: [
    [L, 0.16, 0],
    [R, 0.16, 0],
    [C, 0.5, 0],
    [L, 0.84, 1],
    [R, 0.84, 1],
  ],
  6: [
    [L, 0.16, 0],
    [R, 0.16, 0],
    [L, 0.5, 0],
    [R, 0.5, 0],
    [L, 0.84, 1],
    [R, 0.84, 1],
  ],
  7: [
    [L, 0.16, 0],
    [R, 0.16, 0],
    [C, 0.33, 0],
    [L, 0.5, 0],
    [R, 0.5, 0],
    [L, 0.84, 1],
    [R, 0.84, 1],
  ],
  8: [
    [L, 0.16, 0],
    [R, 0.16, 0],
    [C, 0.33, 0],
    [L, 0.5, 0],
    [R, 0.5, 0],
    [C, 0.67, 1],
    [L, 0.84, 1],
    [R, 0.84, 1],
  ],
  9: [
    [L, 0.16, 0],
    [R, 0.16, 0],
    [L, 0.39, 0],
    [R, 0.39, 0],
    [C, 0.5, 0],
    [L, 0.61, 1],
    [R, 0.61, 1],
    [L, 0.84, 1],
    [R, 0.84, 1],
  ],
  10: [
    [L, 0.16, 0],
    [R, 0.16, 0],
    [C, 0.28, 0],
    [L, 0.39, 0],
    [R, 0.39, 0],
    [L, 0.61, 1],
    [R, 0.61, 1],
    [C, 0.72, 1],
    [L, 0.84, 1],
    [R, 0.84, 1],
  ],
};

/* Deck back designs — CSS-drawn approximations of the classic XP backs. */
export const DECK_BACKS = [
  {
    key: 'blue-diamond',
    name: 'Blue Diamonds',
    base: '#2f5bb7',
    pattern:
      'repeating-linear-gradient(45deg, rgba(255,255,255,0.3) 0 1.5px, transparent 1.5px 7px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.3) 0 1.5px, transparent 1.5px 7px)',
  },
  {
    key: 'red-diamond',
    name: 'Red Diamonds',
    base: '#a51e22',
    pattern:
      'repeating-linear-gradient(45deg, rgba(255,255,255,0.3) 0 1.5px, transparent 1.5px 7px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.3) 0 1.5px, transparent 1.5px 7px)',
  },
  {
    key: 'green-diamond',
    name: 'Green Diamonds',
    base: '#1c7c33',
    pattern:
      'repeating-linear-gradient(45deg, rgba(255,255,255,0.28) 0 1.5px, transparent 1.5px 7px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.28) 0 1.5px, transparent 1.5px 7px)',
  },
  {
    key: 'navy-weave',
    name: 'Navy Weave',
    base: '#23366f',
    pattern:
      'repeating-linear-gradient(0deg, rgba(255,255,255,0.22) 0 1.5px, transparent 1.5px 6px), repeating-linear-gradient(90deg, rgba(255,255,255,0.22) 0 1.5px, transparent 1.5px 6px)',
  },
  {
    key: 'purple-diamond',
    name: 'Purple Diamonds',
    base: '#5c3a92',
    pattern:
      'repeating-linear-gradient(45deg, rgba(255,255,255,0.28) 0 1.5px, transparent 1.5px 7px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.28) 0 1.5px, transparent 1.5px 7px)',
  },
  {
    key: 'teal-dots',
    name: 'Teal Dots',
    base: '#0e6f6f',
    pattern:
      'radial-gradient(circle, rgba(255,255,255,0.35) 0 1.5px, transparent 2.5px)',
    patternSize: '9px 9px',
  },
];

/**
 * One playing card. Face-up renders corner indices + classic pip layout
 * (or a framed court design); face-down renders the selected deck back.
 * Extra props (mouse handlers, data attributes) spread onto the root.
 */
export const Card = React.memo(function Card({
  card,
  faceUp,
  back = DECK_BACKS[0],
  style,
  ...rest
}) {
  if (!faceUp) {
    return (
      <CardShell style={style} {...rest}>
        <div
          className="card__back"
          style={{
            backgroundColor: back.base,
            backgroundImage: back.pattern,
            backgroundSize: back.patternSize || 'auto',
          }}
        />
      </CardShell>
    );
  }
  const color = IS_RED[card.suit] ? RED : '#000';
  const glyph = SUIT_GLYPH[card.suit];
  const label = rankLabel(card.rank);
  const pips = PIPS[card.rank];
  return (
    <CardShell style={style} {...rest}>
      <div className="card__corner card__corner--tl" style={{ color }}>
        <div className="card__corner-rank">{label}</div>
        <div className="card__corner-suit">{glyph}</div>
      </div>
      <div className="card__corner card__corner--br" style={{ color }}>
        <div className="card__corner-rank">{label}</div>
        <div className="card__corner-suit">{glyph}</div>
      </div>
      {card.rank === 1 && (
        <div
          className="card__ace"
          style={{ color, fontSize: card.suit === 's' ? 44 : 38 }}
        >
          {glyph}
        </div>
      )}
      {pips && (
        <div className="card__pips">
          {pips.map(([x, y, flip], i) => (
            <span
              key={i}
              className="card__pip"
              style={{
                color,
                left: `${x * 100}%`,
                top: `${y * 100}%`,
                transform: `translate(-50%, -50%)${
                  flip ? ' rotate(180deg)' : ''
                }`,
              }}
            >
              {glyph}
            </span>
          ))}
        </div>
      )}
      {card.rank >= 11 && (
        <div className="card__court" style={{ borderColor: color }}>
          <span
            className="card__court-suit card__court-suit--tl"
            style={{ color }}
          >
            {glyph}
          </span>
          <span className="card__court-letter" style={{ color }}>
            {label}
          </span>
          <span
            className="card__court-suit card__court-suit--br"
            style={{ color }}
          >
            {glyph}
          </span>
        </div>
      )}
    </CardShell>
  );
});

const CardShell = styled.div`
  position: absolute;
  width: ${CARD_W}px;
  height: ${CARD_H}px;
  border-radius: 5px;
  background: #fff;
  border: 1px solid #1a1a1a;
  box-sizing: border-box;
  box-shadow: 1px 1px 1px rgba(0, 0, 0, 0.35);
  user-select: none;

  .card__back {
    position: absolute;
    inset: 2px;
    border-radius: 3px;
    border: 1px solid rgba(0, 0, 0, 0.25);
  }
  .card__corner {
    position: absolute;
    text-align: center;
    line-height: 1;
    font-family: Arial, sans-serif;
    font-weight: bold;
  }
  .card__corner--tl {
    top: 3px;
    left: 4px;
  }
  .card__corner--br {
    bottom: 3px;
    right: 4px;
    transform: rotate(180deg);
  }
  .card__corner-rank {
    font-size: 12px;
  }
  .card__corner-suit {
    font-size: 10px;
  }
  .card__ace {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }
  .card__pips {
    position: absolute;
    top: 12px;
    bottom: 12px;
    left: 16px;
    right: 16px;
  }
  .card__pip {
    position: absolute;
    font-size: 13px;
    line-height: 1;
  }
  .card__court {
    position: absolute;
    top: 14px;
    bottom: 14px;
    left: 17px;
    right: 17px;
    border: 2px solid;
    border-radius: 2px;
    background: linear-gradient(135deg, #fdf6e3 0%, #f5e6c8 55%, #ecd9a8 100%);
  }
  .card__court-letter {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 30px;
    font-weight: bold;
  }
  .card__court-suit {
    position: absolute;
    font-size: 11px;
    line-height: 1;
  }
  .card__court-suit--tl {
    top: 2px;
    left: 3px;
  }
  .card__court-suit--br {
    bottom: 2px;
    right: 3px;
    transform: rotate(180deg);
  }
`;

/** Draw a simplified (but matching) card face onto a canvas for the
 *  win cascade — corner indices plus one large center glyph. */
export function drawCardOnCanvas(ctx, card, x, y) {
  const r = 5;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + CARD_W, y, x + CARD_W, y + CARD_H, r);
  ctx.arcTo(x + CARD_W, y + CARD_H, x, y + CARD_H, r);
  ctx.arcTo(x, y + CARD_H, x, y, r);
  ctx.arcTo(x, y, x + CARD_W, y, r);
  ctx.closePath();
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 1;
  ctx.stroke();

  const color = IS_RED[card.suit] ? RED : '#000';
  const glyph = SUIT_GLYPH[card.suit];
  const label = rankLabel(card.rank);
  ctx.fillStyle = color;
  ctx.textBaseline = 'top';
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(label, x + 5, y + 4);
  ctx.font = '10px Arial';
  ctx.fillText(glyph, x + 5, y + 17);
  ctx.font = '34px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(glyph, x + CARD_W / 2, y + CARD_H / 2 + 2);
  ctx.restore();
}
