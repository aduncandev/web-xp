/*
 * The channel's Search by Game Title keyboard, laid out from the preserved
 * page: 43.5px key pitch, the entry field's double cyan border, Quit/OK
 * confirm pills, and the layered background gradients. A real keyboard
 * types into it too.
 */
import { useEffect, useRef, useState } from 'react';

import kbBg from 'assets/store/wii/kb/bg.png';
import kbGrad1 from 'assets/store/wii/kb/grad1.png';
import kbGrad2 from 'assets/store/wii/kb/grad2.png';
import kbKey from 'assets/store/wii/kb/key.png';
import kbKeyLong from 'assets/store/wii/kb/key-long.png';
import kbKeyLonger from 'assets/store/wii/kb/key-longer.png';
import kbConfirm from 'assets/store/wii/kb/confirm.png';
import kbBack from 'assets/store/wii/kb/back.png';

const PITCH = 43.5;
const rowOf = (y, x0, chars) =>
  chars
    .split('')
    .map((ch, i) => ({ id: ch, ch, x: x0 + i * PITCH, y, w: 44, h: 36 }));

const KEYS = [
  ...rowOf(159, 26, '1234567890-'),
  { id: 'back', x: 507, y: 160, w: 72, h: 34, img: kbKeyLong, wide: true },
  ...rowOf(195, 48, 'qwertyuiop'),
  {
    id: 'caps',
    label: 'Caps',
    x: 27,
    y: 232,
    w: 86,
    h: 32,
    img: kbKeyLong,
    wide: true,
  },
  ...rowOf(230, 114, 'asdfghjkl:'),
  {
    id: 'shift',
    label: 'Shift',
    x: 27,
    y: 268,
    w: 96,
    h: 32,
    img: kbKeyLong,
    wide: true,
  },
  ...rowOf(266, 124, 'zxcvbnm,.='),
  ...rowOf(301, 157, '[]'),
  {
    id: 'space',
    label: 'Space',
    x: 246,
    y: 303,
    w: 159,
    h: 33,
    img: kbKeyLonger,
    wide: true,
  },
  ...rowOf(301, 407, "'`/@"),
];
const MAX_LEN = 34;

export default function Keyboard({ onOk, onQuit, sfx, hover }) {
  const [query, setQuery] = useState('');
  const [caps, setCaps] = useState(false);
  const [shift, setShift] = useState(false);
  const [lit, setLit] = useState(null);
  const litTimer = useRef(null);

  const flash = id => {
    setLit(id);
    clearTimeout(litTimer.current);
    litTimer.current = setTimeout(() => setLit(null), 140);
  };
  useEffect(() => () => clearTimeout(litTimer.current), []);

  const upper = caps !== shift;
  const typeChar = ch => setQuery(q => (q.length < MAX_LEN ? q + ch : q));

  const press = key => {
    sfx('decide');
    flash(key.id);
    if (key.id === 'back') setQuery(q => q.slice(0, -1));
    else if (key.id === 'caps') setCaps(v => !v);
    else if (key.id === 'shift') setShift(v => !v);
    else if (key.id === 'space') typeChar(' ');
    else {
      typeChar(upper && /[a-z]/.test(key.ch) ? key.ch.toUpperCase() : key.ch);
      if (shift) setShift(false);
    }
  };

  const stateRef = useRef();
  stateRef.current = { query, onOk, onQuit };
  useEffect(() => {
    const onKey = e => {
      const cur = stateRef.current;
      if (e.key === 'Enter') {
        e.preventDefault();
        cur.onOk(cur.query);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cur.onQuit();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        flash('back');
        setQuery(q => q.slice(0, -1));
      } else if (e.key.length === 1 && /[ -~]/.test(e.key)) {
        e.preventDefault();
        flash(e.key === ' ' ? 'space' : e.key.toLowerCase());
        setQuery(q => (q.length < MAX_LEN ? q + e.key : q));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="kb">
      <img className="kb__layer" src={kbBg} alt="" />
      <img className="kb__layer" src={kbGrad2} alt="" />
      <img className="kb__layer" src={kbGrad1} alt="" />
      <div className="kb__field">
        {query && <span className="kb__query">{query}</span>}
        <span className="kb__caret" />
        {!query && (
          <span className="kb__ph">Enter the name of the title you want.</span>
        )}
      </div>
      {KEYS.map(k => {
        const engaged =
          (k.id === 'caps' && caps) || (k.id === 'shift' && shift);
        return (
          <button
            key={k.id}
            className={
              'kb__key' +
              (k.wide ? ' kb__key--wide' : '') +
              (lit === k.id || engaged ? ' kb__key--lit' : '')
            }
            style={{ left: k.x, top: k.y, width: k.w, height: k.h }}
            onMouseEnter={hover}
            onClick={() => press(k)}
          >
            <span className="kb__color" />
            <img className="kb__art" src={k.img || kbKey} alt="" />
            <span className="kb__cap">
              {k.id === 'back' ? (
                <img className="kb__backglyph" src={kbBack} alt="" />
              ) : (
                k.label ||
                (upper && /[a-z]/.test(k.ch) ? k.ch.toUpperCase() : k.ch)
              )}
            </span>
          </button>
        );
      })}
      <button
        className="kb__confirm"
        style={{ left: 21 }}
        onMouseEnter={hover}
        onClick={onQuit}
      >
        <img className="kb__art" src={kbConfirm} alt="" />
        <span className="kb__cap kb__cap--confirm">Quit</span>
      </button>
      <button
        className="kb__confirm"
        style={{ left: 418 }}
        onMouseEnter={hover}
        onClick={() => onOk(query)}
      >
        <img className="kb__art" src={kbConfirm} alt="" />
        <span className="kb__cap kb__cap--confirm">OK</span>
      </button>
    </div>
  );
}
