// The timer board that floats beside the climb.
import { VIEW_H, lerp } from './constants';
import { pixelText } from './draw';

export function stepBoard(game) {
  game.board.siner += 1;
  if (game.running) {
    game.board.x = lerp(game.board.x, game.camX + 40, 0.125);
    game.board.y = lerp(
      game.board.y,
      game.camY + 340 + Math.sin(game.board.siner / 15) * 8,
      0.25,
    );
  } else if (game.thisTime !== -1) {
    game.board.x = lerp(game.board.x, game.camX + 30, 1 / 30);
    game.board.y = lerp(
      game.board.y,
      game.camY + 30 + Math.sin(game.board.siner / 15) * 4,
      1 / 12,
    );
  } else {
    game.board.x = lerp(game.board.x, game.camX - 40, 0.25);
    game.board.y = lerp(game.board.y, game.camY + 540, 0.25);
  }
}

export function formatDigits(game, tenthsTotal) {
  const v = Math.max(0, Math.min(999, tenthsTotal));
  return [Math.floor(v / 100) % 10, Math.floor(v / 10) % 10, v % 10];
}

export function drawBoard(game) {
  let x = Math.round(game.board.x);
  let y = Math.round(game.board.y);
  if (y > game.camY + VIEW_H + 60) return;
  const isEndless = game.L.kind === 'endless';
  const pulse =
    Math.round((0.5 + Math.sin(game.board.siner / 15) * 0.5) * 8) / 8;
  let col = `rgb(255,255,${Math.round(lerp(194, 255, pulse))})`;
  let num;
  if (isEndless) {
    // the same board, repurposed: meters climbed instead of tenths
    const ds = [];
    let v = game.endless ? Math.max(0, Math.floor(game.endless.height)) : 0;
    do {
      ds.unshift(v % 10);
      v = Math.floor(v / 10);
    } while (v > 0);
    while (ds.length < 3) ds.unshift(0);
    num = ds;
    if (game.endless && game.endless.over) col = 'rgb(250,219,2)';
  } else {
    let time = 0;
    if (game.running) time = game.elapsed;
    if (game.thisTime !== -1) time = game.thisTime;
    const tenths = Math.floor(time / 3);
    num = formatDigits(game, tenths);
    if (tenths >= 999) {
      const prog =
        Math.round(
          Math.max(0, Math.min(1, (tenths - 999) / (9000 - 999))) * 16,
        ) / 16;
      col = `rgb(${Math.round(lerp(255, 135, prog))},${Math.round(
        lerp(0, 129, prog),
      )},${Math.round(lerp(0, 190, prog))})`;
    }
    if (tenths >= 9000) {
      x += Math.round(Math.random() * 2 - 1);
      y += Math.round(Math.random() * 2 - 1);
    }
    if (tenths === 0 && game.thisTime === -1) col = 'rgb(18,18,18)';
    if (game.thisTime !== -1) col = 'rgb(250,219,2)';
  }
  // endless keeps a lane on the right for the meters label
  const extraW = (num.length - 3) * 20 + (isEndless ? 20 : 0);
  const s = game.sprites.timerBox;
  if (extraW === 0) {
    game.ctx.drawImage(s.img, 0, 0, 42, 40, x, y, 84, 80);
  } else {
    // stretch the frame's middle band so extra digits fit
    game.ctx.drawImage(s.img, 0, 0, 21, 40, x, y, 42, 80);
    game.ctx.drawImage(s.img, 18, 0, 6, 40, x + 42, y, extraW, 80);
    game.ctx.drawImage(s.img, 21, 0, 21, 40, x + 42 + extraW, y, 42, 80);
  }
  game.ctx.fillStyle = 'rgba(0,0,0,0.5)';
  game.ctx.fillRect(x + 9, y + 9, 66 + extraW, 32);
  const digitTint = game.tinted.digits(col);
  game.ctx.save();
  if (isEndless) {
    // the digit sprites bleed unlit segments rightward: keep the label
    // lane clean
    game.ctx.beginPath();
    game.ctx.rect(x + 2, y + 2, 73 + (num.length - 3) * 20, 76);
    game.ctx.clip();
  }
  for (let i = 0; i < num.length; i++) {
    const bon = !isEndless && i === 2 ? 4 : 0;
    const f = num[i];
    game.ctx.drawImage(
      digitTint,
      f * 42,
      0,
      42,
      35,
      x - 24 + 20 * i + bon,
      y - 10,
      84,
      70,
    );
  }
  game.ctx.restore();
  if (isEndless) {
    game.ctx.save();
    game.ctx.translate(x + 78 + (num.length - 3) * 20, y + 35);
    game.ctx.scale(2, 2);
    pixelText(game, 'm', 0, 0, 16, col);
    game.ctx.restore();
  } else {
    game.ctx.fillStyle = col;
    game.ctx.fillRect(x + 50, y + 36, 4, 4);
  }
  const ff = Math.floor(game.board.siner / 2) % 2;
  game.ctx.drawImage(
    game.sprites.timerFire.img,
    ff * 7,
    0,
    7,
    10,
    x + 6,
    y + 50,
    14,
    20,
  );
  game.ctx.drawImage(
    game.sprites.timerFire.img,
    ff * 7,
    0,
    7,
    10,
    x + 64 + extraW,
    y + 50,
    14,
    20,
  );
  if (!isEndless && game.thisTime !== -1 && game.newBest) {
    pixelText(game, 'NEW BEST!', x + 92, y + 30, 14, 'rgb(250,219,2)');
  }
}
