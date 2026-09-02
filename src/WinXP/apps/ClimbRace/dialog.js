// The in-game text box: its pages, the typewriter, the yes/no choice, and
// how it draws (the dark box itself is in dialogue.js).
import { play } from './run';
import { drawDarkBox } from './dialogue';
import { blit, pixelText } from './draw';

const DIALOG_TEXT_W = 500;

export function wrapStatement(game, s) {
  const words = s.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (cur && test.length * 15 > DIALOG_TEXT_W) {
      lines.push(cur);
      cur = w;
    } else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

export function openLines(game, statements, opts) {
  game.dialog = {
    pages: statements,
    idx: 0,
    chars: 0,
    sel: 0,
    ...(opts || {}),
  };
}

export function stepDialog(game) {
  if (game.dialog.choosing) {
    if (game.pressed.left || game.pressed.right) {
      game.dialog.sel = game.dialog.sel === 0 ? 1 : 0;
      play(game, 'menumove', 0.8, 1);
    }
    if (game.pressed.jump) {
      const cb = game.dialog.chosen;
      const sel = game.dialog.sel;
      game.dialog = null;
      if (cb) cb(sel);
    }
    return;
  }
  const statement = game.dialog.pages[game.dialog.idx] || '';
  const total = statement.length;
  if (game.dialog.chars < total) {
    game.dialog.chars += 1;
    const ch = statement[game.dialog.chars - 1];
    if (ch && ch !== ' ' && game.dialog.chars % 2 === 0)
      play(game, 'text', 0.55, 1);
  }
  if (game.pressed.jump) {
    if (game.dialog.chars < total) game.dialog.chars = total;
    else {
      game.dialog.idx += 1;
      game.dialog.chars = 0;
      if (game.dialog.idx >= game.dialog.pages.length) {
        if (game.dialog.choices) game.dialog.choosing = true;
        else closeDialog(game);
      }
    }
  }
  if (game.pressed.cancel && game.dialog.chars < total)
    game.dialog.chars = total;
}

export function closeDialog(game) {
  const cb = game.dialog && game.dialog.onClose;
  game.dialog = null;
  if (cb) cb();
}

export function drawDialog(game) {
  // dialoguer side 0 = box at the top of the screen
  const top = game.dialog.side === 0;
  const ut = game.dialog.box === 'ut';
  const boxX1 = ut ? 32 : 24;
  const boxX2 = ut ? 608 : 616;
  const boxY1 = top ? (ut ? 16 : 2) : ut ? 322 : 312;
  const boxY2 = top ? (ut ? 158 : 168) : ut ? 464 : 478;
  const textX = ut ? 62 : 58;
  const textY = top ? (ut ? 60 : 50) : ut ? 366 : 360;
  if (ut) {
    game.ctx.fillStyle = '#fff';
    game.ctx.fillRect(boxX1, boxY1, boxX2 - boxX1, boxY2 - boxY1);
    game.ctx.fillStyle = '#000';
    game.ctx.fillRect(
      boxX1 + 5,
      boxY1 + 5,
      boxX2 - boxX1 - 10,
      boxY2 - boxY1 - 10,
    );
  } else {
    drawDarkBox(game.ctx, game.sprites, boxX1, boxY1, boxX2, boxY2, game.siner);
  }
  if (game.dialog.choosing) {
    const base = top ? 94 : 404;
    game.dialog.choices.forEach((c, i) => {
      const sel = game.dialog.sel === i;
      const cx = i === 0 ? 140 : 455;
      pixelText(
        game,
        c,
        cx,
        base,
        18,
        sel ? '#FFFF00' : '#fff',
        'left',
        1,
        'main2',
      );
      if (sel) blit(game, 'heart', 0, cx - 24, base - 12, 1);
    });
    return;
  }
  const statement = game.dialog.pages[game.dialog.idx] || '';
  const wrapped = wrapStatement(game, statement);
  const indent = 30; // "* " at the writer's fixed 15px per character
  let used = 0;
  wrapped.forEach((line, i) => {
    const visible = Math.max(
      0,
      Math.min(game.dialog.chars - used, line.length),
    );
    used += line.length + 1; // the space the wrap swallowed
    if (!visible) return;
    const txt = line.slice(0, visible);
    if (i === 0)
      pixelText(game, '* ' + txt, textX, textY, 18, '#fff', 'left', 1, 'main2');
    else
      pixelText(
        game,
        txt,
        textX + indent,
        textY + i * 36,
        18,
        '#fff',
        'left',
        1,
        'main2',
      );
  });
}
