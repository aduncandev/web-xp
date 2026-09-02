// The cup on the church floor: where it wanders, when Kris is near it, and
// what it has to say.
import { loadBest, seedsCleared } from './save';
import { openLines } from './dialog';

export function cupSpot(game) {
  return {
    x: game.L.decor.cup ? game.L.decor.cup.x : 1108,
    y: game.L.decor.cup ? game.L.decor.cup.y : 3544,
  };
}

export function cupCenter(game) {
  const spot = cupSpot(game);
  return {
    x: spot.x + Math.sin(game.siner / 55) * 26 + 23,
    y: spot.y + 66,
  };
}

export function nearCup(game) {
  return (
    game.L.kind === 'church' &&
    game.walker &&
    Math.abs(game.walker.x - cupCenter(game).x) < 64 &&
    Math.abs(game.walker.y - cupCenter(game).y) < 130
  );
}

export function cupLines(game) {
  const best = loadBest(game);
  const cleared = seedsCleared(game);
  const lines = [];
  if (!best) {
    lines.push('A climber!! Finally!!');
    lines.push(
      "Touch the switch and the whole wall lights up. Then it's just you and gravity.",
    );
    lines.push('I keep the times. All of them. Forever.');
  } else if (best <= 170) {
    lines.push('THAT time. You did THAT time.');
    lines.push("The trophy's on the table. I polish it more than the others.");
  } else {
    lines.push(`Your best is ${(best / 10).toFixed(1)}s.`);
    lines.push("Respectable. The wall's seen better. The wall talks to me.");
  }
  if (cleared >= 5)
    lines.push(
      `You've cleared ${cleared} of the strange walls, too. I don't know where those come from.`,
    );
  return lines;
}

// darkzone dialoguer metrics: box (24,312)-(616,478), writer (58,340),
// 36px lines

export function openCupTalk(game) {
  openLines(game, cupLines(game));
}

export function drawCup(game) {
  const s = game.sprites.cup;
  const spot = cupSpot(game);
  const wob = Math.sin(game.siner / 55) * 26;
  const x = spot.x + wob;
  const facingLeft = Math.cos(game.siner / 55) < 0;
  const frame = Math.floor(game.siner / 10) % 2;
  game.ctx.save();
  if (facingLeft) {
    game.ctx.translate(x + 46, spot.y);
    game.ctx.scale(-1, 1);
    game.ctx.drawImage(s.img, frame * 23, 0, 23, 33, 0, 0, 46, 66);
  } else {
    game.ctx.drawImage(
      s.img,
      frame * 23,
      0,
      23,
      33,
      Math.round(x),
      spot.y,
      46,
      66,
    );
  }
  game.ctx.restore();
}
