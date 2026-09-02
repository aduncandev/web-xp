import React from 'react';
import styled from 'styled-components';

export const CARD_W = 71;
export const CARD_H = 96;

export const SUIT_GLYPH = { s: '♠', h: '♥', d: '♦', c: '♣' };
export const IS_RED = { s: false, c: false, h: true, d: true };

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

// cards.dll, the deck every Windows solitaire drew from: bitmaps 1 to 52
// are the faces (clubs, diamonds, hearts, spades, ace to king), 54 to 65
// the twelve backs of the Select Card Back dialog
const files = import.meta.glob('../../../assets/xp/cards/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});
const urlOf = id => {
  for (const [path, url] of Object.entries(files))
    if (path.endsWith(`/${id}.png`)) return url;
  return null;
};
const SUIT_BASE = { c: 0, d: 13, h: 26, s: 39 };
export const faceUrl = card => urlOf(SUIT_BASE[card.suit] + card.rank);

/* The twelve backs, in the order of XP's dialog; the fish is the default. */
const BACK_NAMES = [
  'Sky',
  'Blue',
  'Fish',
  'Frog',
  'Roses',
  'Beach',
  'Mosaic',
  'Shell',
  'Dunes',
  'Space',
  'Robot',
  'Cars',
];
export const DECK_BACKS = BACK_NAMES.map((name, i) => ({
  key: name.toLowerCase(),
  name,
  id: 54 + i,
  url: urlOf(54 + i),
}));
export const DEFAULT_BACK = 2;

/**
 * One playing card: the face bitmap, or the chosen back when face down.
 * Extra props (mouse handlers, data attributes) spread onto the root.
 */
export const Card = React.memo(function Card({
  card,
  faceUp,
  back = DECK_BACKS[DEFAULT_BACK],
  style,
  ...rest
}) {
  return (
    <CardShell style={style} {...rest}>
      <img
        className={faceUp ? 'card__face' : 'card__back'}
        src={faceUp ? faceUrl(card) : back.url}
        alt=""
        draggable={false}
      />
    </CardShell>
  );
});

const CardShell = styled.div`
  position: absolute;
  width: ${CARD_W}px;
  height: ${CARD_H}px;
  user-select: none;
  image-rendering: pixelated;
  img {
    display: block;
    width: ${CARD_W}px;
    height: ${CARD_H}px;
    pointer-events: none;
  }
`;

// the faces as Image objects for the canvas animations
const images = {};
export function cardImage(card) {
  const url = faceUrl(card);
  if (!url) return null;
  let img = images[url];
  if (!img) {
    img = new Image();
    img.src = url;
    images[url] = img;
  }
  return img.complete && img.naturalWidth ? img : null;
}

export function drawCardOnCanvas(ctx, card, x, y) {
  const img = cardImage(card);
  if (img) {
    ctx.drawImage(img, x, y, CARD_W, CARD_H);
    return;
  }
  // the bitmap has not arrived yet: a plain card keeps the animation whole
  ctx.save();
  ctx.fillStyle = '#fff';
  ctx.fillRect(x, y, CARD_W, CARD_H);
  ctx.strokeStyle = '#000';
  ctx.strokeRect(x + 0.5, y + 0.5, CARD_W - 1, CARD_H - 1);
  ctx.restore();
}
