import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';

import { WindowDropDowns } from 'components';
import { useDialog } from '../../../context/DialogContext';
import { useVFS } from '../../../context/VFSContext';
import { getCurrentUserName } from '../../../context/users';
import XPDialogFrame from '../../../components/XPDialogFrame';
import XPButton from '../../../components/XPButton';
import XPTooltip from '../../../components/XPTooltip';
import {
  Card,
  CARD_W,
  CARD_H,
  IS_RED,
  DECK_BACKS,
  buildDeck,
  shuffle,
  drawCardOnCanvas,
} from './cards';
import { toLogical } from '../../screen';

// Board layout (fixed, like real sol.exe): stock col 0, waste col 1,
// foundations cols 3-6, seven tableau columns below.
const MARGIN = 10;
const GAP = 11;
const TOP_Y = 8;
const TAB_Y = 120;
const FACE_DOWN_DY = 4;
const FACE_UP_DY = 16;
const WASTE_FAN = 14;
const colX = i => MARGIN + i * (CARD_W + GAP);

// Options live per-user in the profile hive (ntuser.dat) under
// 'solitaireOptions'.
const DEFAULT_OPTS = {
  drawThree: true,
  scoring: 'standard',
  timed: true,
  backIdx: 0,
};

function newGame(opts) {
  const deck = shuffle(buildDeck());
  const tableau = [];
  let k = 0;
  for (let c = 0; c < 7; c++) {
    const col = [];
    for (let j = 0; j <= c; j++) {
      col.push({ card: deck[k++], faceUp: j === c });
    }
    tableau.push(col);
  }
  return {
    stock: deck.slice(k),
    waste: [],
    foundations: [[], [], [], []],
    tableau,
    score: opts.scoring === 'vegas' ? -52 : 0,
    passes: 0,
    time: 0,
    started: false,
    won: false,
  };
}

const cloneGame = g => JSON.parse(JSON.stringify(g));

function addScore(g, delta, scoring) {
  if (scoring === 'standard') g.score = Math.max(0, g.score + delta);
  else if (scoring === 'vegas') g.score += delta;
}

// Total passes through the deck allowed (Vegas limits; else unlimited)
const maxPassesFor = o =>
  o.scoring === 'vegas' ? (o.drawThree ? 3 : 1) : Infinity;

function canDropFoundation(card, pile) {
  if (pile.length === 0) return card.rank === 1;
  const top = pile[pile.length - 1];
  return top.suit === card.suit && top.rank === card.rank - 1;
}

function canDropTableau(card, col) {
  if (col.length === 0) return card.rank === 13;
  const top = col[col.length - 1];
  return (
    top.faceUp &&
    IS_RED[top.card.suit] !== IS_RED[card.suit] &&
    top.card.rank === card.rank + 1
  );
}

function sourceCards(g, s) {
  if (s.type === 'waste')
    return g.waste.length ? [g.waste[g.waste.length - 1]] : [];
  if (s.type === 'foundation') {
    const p = g.foundations[s.f];
    return p.length ? [p[p.length - 1]] : [];
  }
  const col = g.tableau[s.col];
  if (s.index >= col.length || !col[s.index].faceUp) return [];
  return col.slice(s.index).map(e => e.card);
}

// Y offset of entry `index` within a tableau column
function stackY(col, index) {
  let y = 0;
  for (let i = 0; i < index; i++)
    y += col[i].faceUp ? FACE_UP_DY : FACE_DOWN_DY;
  return y;
}

export default function Solitaire({ onClose, isFocus }) {
  const dlg = useDialog();
  const vfs = useVFS();
  // Owner captured at mount: a game surviving a fast-user-switch in a
  // hidden session keeps its own user's options.
  const userRef = useRef(getCurrentUserName());

  const loadOpts = () => {
    try {
      const stored = vfs.getUserConfigFor(
        userRef.current,
        'solitaireOptions',
        null,
      );
      if (stored && typeof stored === 'object')
        return { ...DEFAULT_OPTS, ...stored };
    } catch {
      // corrupted / unavailable
    }
    return { ...DEFAULT_OPTS };
  };

  const saveOpts = o => {
    try {
      vfs.setUserConfigFor(userRef.current, 'solitaireOptions', o);
    } catch {
      // hive unavailable — options are session-only
    }
  };

  const [opts, setOpts] = useState(loadOpts);
  const [game, setGameState] = useState(() => newGame(loadOpts()));
  const [dragState, setDragState] = useState(null);
  const [deckOpen, setDeckOpen] = useState(false);
  const [optsOpen, setOptsOpen] = useState(false);
  const [cascading, setCascading] = useState(false);

  const gameRef = useRef(game);
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const undoRef = useRef(null);
  const dragRef = useRef(null);
  const boardRef = useRef(null);
  const canvasRef = useRef(null);
  const cascadeRef = useRef(null);
  const cascadingRef = useRef(false);

  const setGame = g => {
    gameRef.current = g;
    setGameState(g);
  };

  // --- Core actions -------------------------------------------------------

  function act(fn, { snap = true } = {}) {
    const cur = gameRef.current;
    if (cur.won || cascadingRef.current) return false;
    const next = cloneGame(cur);
    if (fn(next) === false) return false;
    if (snap) undoRef.current = cloneGame(cur);
    next.started = true;
    setGame(next);
    if (
      next.foundations.reduce((n, p) => n + p.length, 0) === 52 &&
      !next.won
    ) {
      winGame();
    }
    return true;
  }

  function drawFromStock() {
    const cur = gameRef.current;
    const o = optsRef.current;
    if (cur.won || cascadingRef.current) return;
    if (cur.stock.length === 0) {
      if (cur.waste.length === 0) return;
      if (cur.passes + 1 >= maxPassesFor(o)) return;
      act(g => {
        g.stock = g.waste.slice().reverse();
        g.waste = [];
        g.passes += 1;
        if (o.scoring === 'standard')
          addScore(g, o.drawThree ? -20 : -100, 'standard');
      });
      return;
    }
    act(g => {
      const n = o.drawThree ? Math.min(3, g.stock.length) : 1;
      for (let i = 0; i < n; i++) g.waste.push(g.stock.pop());
    });
  }

  function tryMove(source, dest) {
    const cur = gameRef.current;
    const o = optsRef.current;
    const cards = sourceCards(cur, source);
    if (!cards.length) return false;
    if (dest.type === 'foundation') {
      if (cards.length !== 1) return false;
      if (!canDropFoundation(cards[0], cur.foundations[dest.f])) return false;
    } else {
      if (source.type === 'tableau' && source.col === dest.col) return false;
      if (!canDropTableau(cards[0], cur.tableau[dest.col])) return false;
    }
    return act(g => {
      if (source.type === 'waste') g.waste.pop();
      else if (source.type === 'foundation') g.foundations[source.f].pop();
      else {
        g.tableau[source.col] = g.tableau[source.col].slice(0, source.index);
        const col = g.tableau[source.col];
        if (col.length && !col[col.length - 1].faceUp) {
          col[col.length - 1].faceUp = true;
          if (o.scoring === 'standard') addScore(g, 5, 'standard');
        }
      }
      if (dest.type === 'foundation') {
        g.foundations[dest.f].push(cards[0]);
        if (o.scoring === 'standard') addScore(g, 10, 'standard');
        else if (o.scoring === 'vegas') addScore(g, 5, 'vegas');
      } else {
        g.tableau[dest.col].push(
          ...cards.map(c => ({ card: c, faceUp: true })),
        );
        if (source.type === 'waste' && o.scoring === 'standard')
          addScore(g, 5, 'standard');
        if (source.type === 'foundation') {
          if (o.scoring === 'standard') addScore(g, -15, 'standard');
          else if (o.scoring === 'vegas') addScore(g, -5, 'vegas');
        }
      }
    });
  }

  function tryAutoFoundation(source) {
    for (let f = 0; f < 4; f++) {
      if (tryMove(source, { type: 'foundation', f })) return true;
    }
    return false;
  }

  // XP right-click: send every eligible top card to the foundations
  function autoMoveAll() {
    let moved = true;
    let guard = 0;
    while (moved && guard++ < 104) {
      moved = false;
      const g = gameRef.current;
      if (g.won) break;
      if (g.waste.length && tryAutoFoundation({ type: 'waste' })) {
        moved = true;
        continue;
      }
      for (let c = 0; c < 7; c++) {
        const col = g.tableau[c];
        if (
          col.length &&
          col[col.length - 1].faceUp &&
          tryAutoFoundation({ type: 'tableau', col: c, index: col.length - 1 })
        ) {
          moved = true;
          break;
        }
      }
    }
  }

  function undo() {
    if (!undoRef.current || cascadingRef.current) return;
    setGame(undoRef.current);
    undoRef.current = null;
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  function deal(nextOpts) {
    stopCascade(false);
    clearCanvas();
    undoRef.current = null;
    setGame(newGame(nextOpts || optsRef.current));
  }

  // --- Win cascade --------------------------------------------------------

  function winGame() {
    const g = cloneGame(gameRef.current);
    g.won = true;
    setGame(g);
    const board = boardRef.current;
    const canvas = canvasRef.current;
    if (!board || !canvas) return;
    canvas.width = board.clientWidth;
    canvas.height = board.clientHeight;
    const queue = [];
    for (let rank = 13; rank >= 1; rank--) {
      for (let f = 0; f < 4; f++) {
        const card = g.foundations[f][rank - 1];
        if (card) queue.push({ card, x: colX(3 + f), y: TOP_Y });
      }
    }
    cascadeRef.current = { queue, qi: 0, cur: null, raf: 0 };
    cascadingRef.current = true;
    setCascading(true);
    cascadeLoop();
  }

  function launchNext(st) {
    if (st.qi >= st.queue.length) return false;
    const q = st.queue[st.qi++];
    st.cur = {
      card: q.card,
      x: q.x,
      y: q.y,
      vx: (Math.random() < 0.5 ? -1 : 1) * (4 + Math.random() * 5),
      vy: -(Math.random() * 6),
    };
    return true;
  }

  function cascadeLoop() {
    const st = cascadeRef.current;
    const canvas = canvasRef.current;
    if (!st || !canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    if (!st.cur && !launchNext(st)) {
      stopCascade(true);
      return;
    }
    // A few physics substeps per frame — each drawn without clearing, so
    // the cards paint the classic bouncing trails.
    for (let s = 0; s < 4 && st.cur; s++) {
      const c = st.cur;
      c.x += c.vx;
      c.vy += 0.6;
      c.y += c.vy;
      if (c.y + CARD_H > H) {
        c.y = H - CARD_H;
        c.vy = -c.vy * 0.78;
      }
      drawCardOnCanvas(ctx, c.card, c.x, c.y);
      if (c.x < -CARD_W || c.x > W) st.cur = null;
    }
    st.raf = requestAnimationFrame(cascadeLoop);
  }

  function stopCascade(askDealAgain) {
    const st = cascadeRef.current;
    if (st && st.raf) cancelAnimationFrame(st.raf);
    cascadeRef.current = null;
    if (cascadingRef.current) {
      cascadingRef.current = false;
      setCascading(false);
      if (askDealAgain) {
        dlg
          .confirm(
            'Congratulations!  You won the game.\n\nDo you want to deal again?',
            'Solitaire',
          )
          .then(yes => {
            clearCanvas();
            if (yes) deal();
          });
      }
    }
  }

  useEffect(() => {
    return () => {
      const st = cascadeRef.current;
      if (st && st.raf) cancelAnimationFrame(st.raf);
    };
  }, []);

  // --- Timer --------------------------------------------------------------

  useEffect(() => {
    if (!opts.timed || !game.started || game.won || cascading) return;
    const t = setInterval(() => {
      const cur = gameRef.current;
      if (cur.won) return;
      const next = cloneGame(cur);
      next.time += 1;
      if (optsRef.current.scoring === 'standard' && next.time % 10 === 0)
        addScore(next, -2, 'standard');
      setGame(next);
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.timed, game.started, game.won, cascading]);

  // --- Keyboard -----------------------------------------------------------

  useEffect(() => {
    if (!isFocus) return undefined;
    const h = e => {
      if (deckOpen || optsOpen) return;
      if (e.key === 'F2') {
        e.preventDefault();
        deal();
      } else if (e.ctrlKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  });

  // --- Dragging -----------------------------------------------------------

  function cardOrigin(source) {
    const g = gameRef.current;
    const o = optsRef.current;
    if (source.type === 'waste') {
      const visible = Math.min(g.waste.length, o.drawThree ? 3 : 1);
      return { x: colX(1) + WASTE_FAN * Math.max(0, visible - 1), y: TOP_Y };
    }
    if (source.type === 'foundation')
      return { x: colX(3 + source.f), y: TOP_Y };
    return {
      x: colX(source.col),
      y: TAB_Y + stackY(g.tableau[source.col], source.index),
    };
  }

  function onCardMouseDown(e, source) {
    if (e.button !== 0 || cascadingRef.current || gameRef.current.won) return;
    const cards = sourceCards(gameRef.current, source);
    if (!cards.length) return;
    const rect = boardRef.current.getBoundingClientRect();
    const origin = cardOrigin(source);
    dragRef.current = {
      source,
      cards,
      rect,
      grabDX: toLogical(e.clientX - rect.left) - origin.x,
      grabDY: toLogical(e.clientY - rect.top) - origin.y,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    };
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragUp);
  }

  function onDragMove(e) {
    const d = dragRef.current;
    if (!d) return;
    if (!d.moved) {
      if (
        Math.abs(e.clientX - d.startX) < 4 &&
        Math.abs(e.clientY - d.startY) < 4
      )
        return;
      d.moved = true;
    }
    setDragState({
      source: d.source,
      cards: d.cards,
      x: toLogical(e.clientX - d.rect.left) - d.grabDX,
      y: toLogical(e.clientY - d.rect.top) - d.grabDY,
    });
  }

  function onDragUp(e) {
    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('mouseup', onDragUp);
    const d = dragRef.current;
    dragRef.current = null;
    if (!d || !d.moved) {
      setDragState(null);
      return;
    }
    const x = toLogical(e.clientX - d.rect.left) - d.grabDX;
    const y = toLogical(e.clientY - d.rect.top) - d.grabDY;
    const cx = x + CARD_W / 2;
    const cy = y + CARD_H / 2;
    const col = Math.max(
      0,
      Math.min(6, Math.round((cx - MARGIN - CARD_W / 2) / (CARD_W + GAP))),
    );
    if (cy < TAB_Y - 6) {
      if (col >= 3 && d.cards.length === 1)
        tryMove(d.source, { type: 'foundation', f: col - 3 });
    } else {
      tryMove(d.source, { type: 'tableau', col });
    }
    setDragState(null);
  }

  const dragging = dragState;
  const isDraggedFrom = source => {
    if (!dragging) return false;
    const s = dragging.source;
    return s.type === source.type && s.col === source.col && s.f === source.f;
  };

  // --- Menus / dialogs ----------------------------------------------------

  const menuItems = {
    Game: [
      { type: 'item', text: 'Deal', hotkey: 'F2' },
      { type: 'separator' },
      {
        type: 'item',
        text: 'Undo',
        disable: !undoRef.current,
      },
      { type: 'item', text: 'Deck...' },
      { type: 'item', text: 'Options...' },
      { type: 'separator' },
      { type: 'item', text: 'Exit' },
    ],
    Help: [{ type: 'item', text: 'About Solitaire' }],
  };

  function onMenuClick(text) {
    switch (text) {
      case 'Deal':
        deal();
        break;
      case 'Undo':
        undo();
        break;
      case 'Deck...':
        setDeckOpen(true);
        break;
      case 'Options...':
        setOptsOpen(true);
        break;
      case 'Exit':
        onClose();
        break;
      case 'About Solitaire':
        dlg.alert(
          'Solitaire\n\nPlay Klondike with draw one or draw three, Standard or Vegas scoring.\n\nRight-click sends every eligible card to the foundations.',
          'About Solitaire',
        );
        break;
      default:
        break;
    }
  }

  // --- Rendering ----------------------------------------------------------

  const back = DECK_BACKS[opts.backIdx] || DECK_BACKS[0];
  const g = game;
  const noMorePasses =
    g.stock.length === 0 &&
    g.waste.length > 0 &&
    g.passes + 1 >= maxPassesFor(opts);

  // Waste fan (top up-to-3 cards in draw-three)
  const wasteVisible = Math.min(g.waste.length, opts.drawThree ? 3 : 1);
  const wasteStart = g.waste.length - wasteVisible;
  const wasteDragged = isDraggedFrom({ type: 'waste' });

  const fmtScore =
    opts.scoring === 'vegas'
      ? g.score < 0
        ? `-$${-g.score}`
        : `$${g.score}`
      : String(g.score);

  return (
    <Root>
      <section className="sol__toolbar">
        <WindowDropDowns items={menuItems} onClickItem={onMenuClick} />
      </section>
      <div
        className="sol__board"
        ref={boardRef}
        onContextMenu={e => {
          e.preventDefault();
          if (!cascadingRef.current && !gameRef.current.won) autoMoveAll();
        }}
        onClick={() => {
          if (cascadingRef.current) stopCascade(true);
        }}
      >
        {/* Empty slots */}
        <div className="sol__slot" style={{ left: colX(0), top: TOP_Y }}>
          {g.stock.length === 0 && (
            <div
              className={`sol__ring${noMorePasses ? ' sol__ring--dead' : ''}`}
            />
          )}
        </div>
        <div className="sol__slot" style={{ left: colX(1), top: TOP_Y }} />
        {[0, 1, 2, 3].map(f => (
          <div
            key={f}
            className="sol__slot"
            style={{ left: colX(3 + f), top: TOP_Y }}
          />
        ))}
        {g.tableau.map((col, c) => (
          <div
            key={c}
            className="sol__slot"
            style={{ left: colX(c), top: TAB_Y }}
          />
        ))}

        {/* Stock (click to deal) */}
        {g.stock.length > 0 && (
          <Card
            card={g.stock[g.stock.length - 1]}
            faceUp={false}
            back={back}
            style={{ left: colX(0), top: TOP_Y, cursor: 'pointer' }}
            onClick={drawFromStock}
          />
        )}
        {g.stock.length === 0 && (
          <div
            className="sol__stock-hit"
            style={{ left: colX(0), top: TOP_Y }}
            onClick={drawFromStock}
          />
        )}

        {/* Waste fan */}
        {g.waste
          .slice(wasteStart, wasteDragged ? g.waste.length - 1 : undefined)
          .map((card, i) => {
            const isTop = wasteStart + i === g.waste.length - 1;
            return (
              <Card
                key={card.id}
                card={card}
                faceUp
                style={{ left: colX(1) + WASTE_FAN * i, top: TOP_Y }}
                onMouseDown={
                  isTop ? e => onCardMouseDown(e, { type: 'waste' }) : undefined
                }
                onDoubleClick={
                  isTop ? () => tryAutoFoundation({ type: 'waste' }) : undefined
                }
              />
            );
          })}

        {/* Foundations (top card, plus the one beneath while dragging) */}
        {g.foundations.map((pile, f) => {
          const cut = isDraggedFrom({ type: 'foundation', f })
            ? pile.length - 1
            : pile.length;
          const show = pile.slice(Math.max(0, cut - 1), cut);
          return show.map((card, i) => {
            const isTop = Math.max(0, cut - 1) + i === cut - 1;
            return (
              <Card
                key={card.id}
                card={card}
                faceUp
                style={{ left: colX(3 + f), top: TOP_Y }}
                onMouseDown={
                  isTop
                    ? e => onCardMouseDown(e, { type: 'foundation', f })
                    : undefined
                }
              />
            );
          });
        })}

        {/* Tableau */}
        {g.tableau.map((col, c) => {
          const cut =
            dragging &&
            dragging.source.type === 'tableau' &&
            dragging.source.col === c
              ? dragging.source.index
              : col.length;
          return col.slice(0, cut).map((entry, i) => (
            <Card
              key={entry.card.id}
              card={entry.card}
              faceUp={entry.faceUp}
              back={back}
              style={{
                left: colX(c),
                top: TAB_Y + stackY(col, i),
                cursor: entry.faceUp ? 'pointer' : 'default',
              }}
              onMouseDown={
                entry.faceUp
                  ? e =>
                      onCardMouseDown(e, { type: 'tableau', col: c, index: i })
                  : undefined
              }
              onDoubleClick={
                entry.faceUp && i === col.length - 1
                  ? () =>
                      tryAutoFoundation({ type: 'tableau', col: c, index: i })
                  : undefined
              }
            />
          ));
        })}

        {/* Drag layer */}
        {dragging &&
          dragging.cards.map((card, i) => (
            <Card
              key={card.id}
              card={card}
              faceUp
              style={{
                left: dragging.x,
                top: dragging.y + i * FACE_UP_DY,
                zIndex: 1000,
                pointerEvents: 'none',
              }}
            />
          ))}

        {/* Win cascade trails */}
        <canvas
          ref={canvasRef}
          className="sol__canvas"
          style={{ pointerEvents: cascading ? 'auto' : 'none' }}
        />
      </div>
      {(opts.scoring !== 'none' || opts.timed) && (
        <footer className="sol__status">
          <div className="sol__status-spacer" />
          {opts.scoring !== 'none' && (
            <div className="sol__status-cell">Score: {fmtScore}</div>
          )}
          {opts.timed && <div className="sol__status-cell">Time: {g.time}</div>}
        </footer>
      )}

      {deckOpen && (
        <DeckDialog
          current={opts.backIdx}
          onCancel={() => setDeckOpen(false)}
          onOk={idx => {
            const next = { ...opts, backIdx: idx };
            setOpts(next);
            saveOpts(next);
            setDeckOpen(false);
          }}
        />
      )}
      {optsOpen && (
        <OptionsDialog
          opts={opts}
          onCancel={() => setOptsOpen(false)}
          onOk={next => {
            const redeal =
              next.drawThree !== opts.drawThree ||
              next.scoring !== opts.scoring;
            setOpts(next);
            saveOpts(next);
            setOptsOpen(false);
            if (redeal) deal(next);
          }}
        />
      )}
    </Root>
  );
}

function DeckDialog({ current, onOk, onCancel }) {
  const [sel, setSel] = useState(current);
  return (
    <XPDialogFrame title="Select Card Back" width={278} onClose={onCancel}>
      <DialogBody>
        <div className="deck__grid">
          {DECK_BACKS.map((b, i) => (
            <XPTooltip key={b.key} text={b.name}>
              <div
                className={`deck__choice${
                  i === sel ? ' deck__choice--sel' : ''
                }`}
                onClick={() => setSel(i)}
                onDoubleClick={() => onOk(i)}
              >
                <div
                  className="deck__back"
                  style={{
                    backgroundColor: b.base,
                    backgroundImage: b.pattern,
                    backgroundSize: b.patternSize || 'auto',
                  }}
                />
              </div>
            </XPTooltip>
          ))}
        </div>
        <div className="dlg__buttons">
          <XPButton onClick={() => onOk(sel)}>OK</XPButton>
          <XPButton onClick={onCancel}>Cancel</XPButton>
        </div>
      </DialogBody>
    </XPDialogFrame>
  );
}

function OptionsDialog({ opts, onOk, onCancel }) {
  const [drawThree, setDrawThree] = useState(opts.drawThree);
  const [scoring, setScoring] = useState(opts.scoring);
  const [timed, setTimed] = useState(opts.timed);
  return (
    <XPDialogFrame title="Options" width={280} onClose={onCancel}>
      <DialogBody>
        <div className="opts__cols">
          <fieldset className="opts__group">
            <legend>Draw</legend>
            <label>
              <input
                type="radio"
                name="sol-draw"
                checked={!drawThree}
                onChange={() => setDrawThree(false)}
              />
              Draw one
            </label>
            <label>
              <input
                type="radio"
                name="sol-draw"
                checked={drawThree}
                onChange={() => setDrawThree(true)}
              />
              Draw three
            </label>
          </fieldset>
          <fieldset className="opts__group">
            <legend>Scoring</legend>
            <label>
              <input
                type="radio"
                name="sol-score"
                checked={scoring === 'standard'}
                onChange={() => setScoring('standard')}
              />
              Standard
            </label>
            <label>
              <input
                type="radio"
                name="sol-score"
                checked={scoring === 'vegas'}
                onChange={() => setScoring('vegas')}
              />
              Vegas
            </label>
            <label>
              <input
                type="radio"
                name="sol-score"
                checked={scoring === 'none'}
                onChange={() => setScoring('none')}
              />
              None
            </label>
          </fieldset>
        </div>
        <label className="opts__timed">
          <input
            type="checkbox"
            checked={timed}
            onChange={e => setTimed(e.target.checked)}
          />
          Timed game
        </label>
        <div className="dlg__buttons">
          <XPButton
            onClick={() => onOk({ ...opts, drawThree, scoring, timed })}
          >
            OK
          </XPButton>
          <XPButton onClick={onCancel}>Cancel</XPButton>
        </div>
      </DialogBody>
    </XPDialogFrame>
  );
}

const Root = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  font-family: Tahoma, 'Noto Sans', sans-serif;

  .sol__toolbar {
    position: relative;
    height: 20px;
    flex-shrink: 0;
    border-bottom: 1px solid #d4d0c3;
    background: var(--xp-face, #ece9d8);
    padding-left: 2px;
  }
  .sol__board {
    position: relative;
    flex: 1;
    background: #008000;
    overflow: hidden;
  }
  .sol__canvas {
    position: absolute;
    left: 0;
    top: 0;
    z-index: 900;
  }
  .sol__slot {
    position: absolute;
    width: ${CARD_W}px;
    height: ${CARD_H}px;
    border: 1px solid rgba(0, 70, 0, 0.9);
    border-radius: 5px;
    background: rgba(0, 0, 0, 0.06);
    box-sizing: border-box;
  }
  .sol__stock-hit {
    position: absolute;
    width: ${CARD_W}px;
    height: ${CARD_H}px;
    cursor: pointer;
    z-index: 5;
  }
  .sol__ring {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 34px;
    height: 34px;
    margin: -17px 0 0 -17px;
    border: 3px solid rgba(0, 90, 0, 0.95);
    border-radius: 50%;
  }
  .sol__ring--dead:after {
    content: '';
    position: absolute;
    left: -3px;
    top: 12px;
    width: 34px;
    height: 3px;
    background: rgba(140, 0, 0, 0.9);
    transform: rotate(-45deg);
  }
  .sol__status {
    height: 20px;
    flex-shrink: 0;
    display: flex;
    align-items: stretch;
    background: var(--xp-face, #ece9d8);
    border-top: 1px solid #fff;
    font-size: 11px;
  }
  .sol__status-spacer {
    flex: 1;
  }
  .sol__status-cell {
    min-width: 90px;
    padding: 2px 8px 0;
    border-left: 1px solid var(--xp-face-shadow, #aca899);
    box-shadow: inset 1px 0 0 #fff;
  }
`;

const DialogBody = styled.div`
  padding: 12px;
  font-size: 11px;
  font-family: Tahoma, 'Noto Sans', sans-serif;

  .deck__grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-bottom: 12px;
  }
  .deck__choice {
    padding: 3px;
    border: 2px solid transparent;
    display: flex;
    justify-content: center;
  }
  .deck__choice--sel {
    border-color: var(--xp-highlight, #316ac5);
    background: #c1d2ee;
  }
  .deck__back {
    width: 46px;
    height: 62px;
    border: 1px solid #1a1a1a;
    border-radius: 4px;
    box-shadow: inset 0 0 0 2px #fff;
  }
  .opts__cols {
    display: flex;
    gap: 10px;
    margin-bottom: 10px;
  }
  .opts__group {
    flex: 1;
    border: 1px solid #d0c9b5;
    padding: 4px 8px 8px;
    label {
      display: block;
      margin-top: 5px;
      input {
        margin-right: 5px;
      }
    }
  }
  .opts__timed {
    display: block;
    margin-bottom: 12px;
    input {
      margin-right: 5px;
    }
  }
  .dlg__buttons {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
  }
`;
