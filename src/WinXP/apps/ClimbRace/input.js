// Keyboard: which keys mean what, the held and pressed sets, and the
// presses that act at once (mounting, talking, buffering a climb).
import { cupCenter, nearCup, openCupTalk } from './cup';
import { beginMount, nearMount, zoneStarter } from './walker';
import { cancelCharge } from './kris';

export function keyDir(game, e) {
  switch (e.key) {
    case 'ArrowUp':
    case 'w':
    case 'W':
      return 'up';
    case 'ArrowDown':
    case 's':
    case 'S':
      return 'down';
    case 'ArrowLeft':
    case 'a':
    case 'A':
      return 'left';
    case 'ArrowRight':
    case 'd':
    case 'D':
      return 'right';
    default:
      return null;
  }
}

export function isJumpKey(game, e) {
  return e.key === 'z' || e.key === 'Z' || e.key === 'Enter';
}

export function isCancelKey(game, e) {
  return e.key === 'x' || e.key === 'X' || e.key === 'Shift';
}

export function onKeyDown(game, e) {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key))
    e.preventDefault();
  if (e.repeat) return;
  const d = keyDir(game, e);
  if (d) {
    game.held[d] = true;
    game.pressed[d] = true;
  }
  if (isJumpKey(game, e)) {
    game.held.jump = true;
    game.pressed.jump = true;
  }
  if (isCancelKey(game, e)) {
    game.held.cancel = true;
    game.pressed.cancel = true;
  }
  if (e.key === 'Escape') game.pressed.menu = true;
  if (game.phase !== 'game') return;
  if (game.mode === 'ground' && !game.dialog && isJumpKey(game, e)) {
    const wantsTalk =
      nearCup(game) &&
      (!nearMount(game) ||
        Math.abs(game.walker.x - cupCenter(game).x) <
          Math.abs(game.walker.x - (zoneStarter(game).x + 20)));
    if (wantsTalk) {
      openCupTalk(game);
      game.pressed.jump = false;
    } else if (nearMount(game)) beginMount(game);
  }
  if (game.mode === 'wall' && game.kris) {
    if (d) {
      const len = Math.min(4, Math.ceil(5 - game.kris.momentum * 2));
      Object.keys(game.kris.buffers).forEach(k => {
        if (k !== 'jump') game.kris.buffers[k] = 0;
      });
      game.kris.buffers[d] = len;
      if (game.kris.state === 'slip' && d === game.kris.bumped)
        game.kris.slipT = Math.min(game.kris.slipT, 2);
    }
    if (isJumpKey(game, e)) game.kris.buffers.jump = 3;
    if (isCancelKey(game, e) && game.kris.state === 'charge')
      cancelCharge(game);
  }
}

export function onKeyUp(game, e) {
  const d = keyDir(game, e);
  if (d) game.held[d] = false;
  if (isJumpKey(game, e)) game.held.jump = false;
  if (isCancelKey(game, e)) game.held.cancel = false;
}

export function clearPressed(game) {
  Object.keys(game.pressed).forEach(k => {
    game.pressed[k] = false;
  });
}

export function onBlur(game) {
  Object.keys(game.held).forEach(k => {
    game.held[k] = false;
  });
  clearPressed(game);
  if (game.kris && game.kris.state === 'charge') cancelCharge(game);
}
