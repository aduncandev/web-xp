// The title menu, the seed entry screen and the results screens.
import { loadLevel, play } from './run';
import { buildChurch, buildGenerated } from './levels';
import { generateLevel } from './levelgen';
import { createCodeEntry, drawDarkBox } from './dialogue';
import { startEndless } from './endless';
import { enterSecret } from './secret';
import { VIEW_H, VIEW_W } from './constants';
import { blit, drawGame, pixelText } from './draw';

const MENU_ITEMS = ['CHURCH WALL', 'RANDOM SEED', 'ENTER SEED', 'THE FLOOD'];

export function stepMenu(game) {
  if (game.pressed.up) {
    game.menuSel = (game.menuSel + MENU_ITEMS.length - 1) % MENU_ITEMS.length;
    play(game, 'menumove', 0.8, 1);
  }
  if (game.pressed.down) {
    game.menuSel = (game.menuSel + 1) % MENU_ITEMS.length;
    play(game, 'menumove', 0.8, 0.9);
  }
  if (game.pressed.jump) {
    play(game, 'menumove', 0.8, 1.2);
    if (game.menuSel === 0) {
      loadLevel(game, buildChurch());
    } else if (game.menuSel === 1) {
      game.lastSeed = String(Math.floor(Math.random() * 10000)).padStart(
        4,
        '0',
      );
      loadLevel(game, buildGenerated(generateLevel(game.lastSeed)));
    } else if (game.menuSel === 2) {
      game.codeEntry = createCodeEntry(4, game.lastSeed);
      game.phase = 'codeentry';
    } else {
      startEndless(game);
    }
  }
}

export function stepCode(game) {
  game.codeEntry.step(
    {
      left: game.pressed.left,
      right: game.pressed.right,
      upHeld: game.held.up,
      downHeld: game.held.down,
      confirm: game.pressed.jump,
      cancel: game.pressed.cancel,
    },
    (...args) => play(game, ...args),
  );
  if (game.codeEntry.result === -2) {
    game.codeEntry = null;
    game.phase = 'menu';
  } else if (typeof game.codeEntry.result === 'string') {
    const code = game.codeEntry.result;
    game.codeEntry = null;
    if (code === '6453') enterSecret(game, 'mike');
    else if (code === '1225') enterSecret(game, 'shelter');
    else {
      game.lastSeed = code;
      loadLevel(game, buildGenerated(generateLevel(game.lastSeed)));
    }
  }
}

export function stepResults(game) {
  if (game.pressed.jump) {
    play(game, 'menumove', 0.8, 1.2);
    loadLevel(game, buildGenerated(generateLevel(game.L.seed)));
  } else if (game.pressed.cancel || game.pressed.menu) {
    play(game, 'menumove', 0.8, 0.8);
    game.phase = 'menu';
  }
}

export function drawMenu(game) {
  game.ctx.fillStyle = '#000';
  game.ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  drawDarkBox(game.ctx, game.sprites, 120, 70, 520, 180, game.siner);
  pixelText(game, 'DELTASCEND', VIEW_W / 2, 138, 40, '#fff', 'center');
  drawDarkBox(game.ctx, game.sprites, 160, 210, 480, 424, game.siner);
  for (let i = 0; i < MENU_ITEMS.length; i++) {
    const y = 259 + i * 44;
    const sel = i === game.menuSel;
    pixelText(game, MENU_ITEMS[i], 250, y, 20, sel ? '#FFFF00' : '#fff');
    if (sel) blit(game, 'heart', 0, 250 - 26, y - 11, 1);
  }
  pixelText(
    game,
    '[Z] SELECT   ARROWS MOVE',
    VIEW_W / 2,
    440,
    13,
    '#9f9fc9',
    'center',
  );
}

export function drawCode(game) {
  game.ctx.fillStyle = '#000';
  game.ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  drawDarkBox(game.ctx, game.sprites, 120, 130, 520, 350, game.siner);
  pixelText(game, 'ENTER SEED', VIEW_W / 2, 185, 22, '#fff', 'center');
  game.codeEntry.draw(
    game.ctx,
    game.sprites,
    VIEW_W / 2,
    265,
    {
      upHeld: game.held.up,
      downHeld: game.held.down,
    },
    (...args) => pixelText(game, ...args),
  );
  pixelText(
    game,
    '[Z] CLIMB IT   [X] BACK',
    VIEW_W / 2,
    325,
    13,
    '#9f9fc9',
    'center',
  );
}

export function drawResults(game) {
  drawGame(game);
  game.ctx.fillStyle = 'rgba(0,0,0,0.35)';
  game.ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  drawDarkBox(game.ctx, game.sprites, 110, 90, 530, 390, game.siner);
  pixelText(
    game,
    `SEED ${game.L.seed} CLEARED!`,
    VIEW_W / 2,
    145,
    24,
    'rgb(250,219,2)',
    'center',
  );
  const row = (label, value, y, col) => {
    pixelText(game, label, 170, y, 18, '#fff');
    pixelText(game, value, 470, y, 18, col || '#fff', 'right');
  };
  row('TIME', `${(game.results.tenths / 10).toFixed(1)}s`, 195);
  if (game.newBest)
    pixelText(game, 'NEW BEST!', 470, 212, 12, 'rgb(250,219,2)', 'right');
  row('COINS', `${game.results.coins} $`, 240, 'rgb(255,213,0)');
  row('SPEED BONUS', `+${game.results.bonus}`, 275);
  row(
    'XP POINTS',
    game.results.award > 0 ? `+${game.results.award}` : '+0',
    315,
    'rgb(124,255,107)',
  );
  if (game.results.award === 0) {
    pixelText(
      game,
      `this seed already paid ${game.results.xp}`,
      470,
      332,
      12,
      '#9f9fc9',
      'right',
    );
  }
  pixelText(
    game,
    '[Z] CLIMB AGAIN   [X] MENU',
    VIEW_W / 2,
    365,
    13,
    '#9f9fc9',
    'center',
  );
}
