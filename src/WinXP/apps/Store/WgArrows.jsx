// The welcome shelf's side arrows: they breathe and drift on the page's
// own 79-tick schedule, and hover swaps in the _S face.
import { useEffect, useState } from 'react';

import {
  arrowL,
  arrowL1,
  arrowL2,
  arrowL3,
  arrowL4,
  arrowLS,
  arrowR,
  arrowR1,
  arrowR2,
  arrowR3,
  arrowR4,
  arrowRS,
} from './art';

const ARROW_SPRITES = {
  l: [arrowL, arrowL1, arrowL2, arrowL3, arrowL4],
  r: [arrowR, arrowR1, arrowR2, arrowR3, arrowR4],
};
const ARROW_STOP = { l: arrowLS, r: arrowRS };
// [tick, value] steps lifted from the page's animation loop
const SPRITE_AT = [
  [0, 0],
  [13, 1],
  [20, 2],
  [25, 3],
  [30, 4],
  [44, 3],
  [59, 2],
  [64, 1],
  [71, 0],
];
const DRIFT_AT = [
  [0, 0],
  [1, 1],
  [10, 2],
  [14, 3],
  [17, 4],
  [20, 5],
  [23, 6],
  [27, 7],
  [31, 8],
  [49, 7],
  [53, 6],
  [57, 5],
  [60, 4],
  [63, 3],
  [66, 2],
  [70, 1],
];
const stepOf = (table, t) => {
  let v = table[0][1];
  for (const [at, val] of table) if (t >= at) v = val;
  return v;
};

export default function WgArrows({ onPrev, onNext, hover }) {
  const [anim, setAnim] = useState({ sprite: 0, drift: 0 });
  const [held, setHeld] = useState(null);
  useEffect(() => {
    let t = 0;
    const id = setInterval(() => {
      t = (t + 1) % 79;
      const next = { sprite: stepOf(SPRITE_AT, t), drift: stepOf(DRIFT_AT, t) };
      setAnim(a =>
        a.sprite === next.sprite && a.drift === next.drift ? a : next,
      );
    }, 16);
    return () => clearInterval(id);
  }, []);
  const side = (key, left, onClick) => (
    <button
      className="wgarrow"
      style={{ left }}
      onMouseEnter={() => {
        setHeld(key);
        hover();
      }}
      onMouseLeave={() => setHeld(h => (h === key ? null : h))}
      onClick={onClick}
    >
      <img
        src={held === key ? ARROW_STOP[key] : ARROW_SPRITES[key][anim.sprite]}
        alt={key === 'l' ? '<' : '>'}
      />
    </button>
  );
  return (
    <>
      {side('l', 15 + anim.drift, onPrev)}
      {side('r', 537 - anim.drift, onNext)}
    </>
  );
}
