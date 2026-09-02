// DELTASCEND's entry point. The game is a plain state object (state.js)
// that the modules around it read and write; this file boots it, runs the
// fixed-step loop and wires the keyboard. Nothing here knows the rules.
import { STEP } from './constants';
import { startMusic, stopMusic, tick, updateCam } from './run';
import { render } from './draw';
import { loadAll } from './sprites';
import { loadFonts } from './fonts';
import { buildTints } from './assets';
import { onBlur, onKeyDown, onKeyUp } from './input';
import { createState } from './state';

/** One animation frame: however many 1/30 s ticks the clock owes, then a render. */
function frame(game, now) {
  if (game.destroyed) return;
  game.raf = requestAnimationFrame(t => frame(game, t));
  const dt = Math.min(0.1, (now - game.last) / 1000);
  game.last = now;
  game.acc += dt;
  while (game.acc >= STEP) {
    game.acc -= STEP;
    tick(game);
    updateCam(game);
  }
  render(game);
}

/**
 * Start the game on `canvas`. `opts`: getVolume(), keyTarget (the element
 * that receives the keys), store { load, save } for the save game, and
 * awardPoints(n) for XP Points. Returns { destroy, refreshVolume }.
 */
export function createGame(canvas, opts) {
  const game = createState(canvas, opts);

  Promise.all([loadAll(), loadFonts()]).then(([loaded, loadedFonts]) => {
    if (game.destroyed) return;
    game.sprites = loaded.sprites;
    game.bake = loaded.bake;
    game.fonts = loadedFonts;
    Object.assign(game, buildTints(game.sprites));
    startMusic(game);
    game.raf = requestAnimationFrame(t => frame(game, t));
  });

  // One handler each, so removal finds the same function it added
  const handlers = {
    keydown: e => onKeyDown(game, e),
    keyup: e => onKeyUp(game, e),
    blur: () => onBlur(game),
  };
  const keyTarget = game.opts.keyTarget || window;
  for (const [type, fn] of Object.entries(handlers))
    keyTarget.addEventListener(type, fn);

  return {
    destroy() {
      game.destroyed = true;
      cancelAnimationFrame(game.raf);
      for (const [type, fn] of Object.entries(handlers))
        keyTarget.removeEventListener(type, fn);
      game.mixer.stopAll();
      stopMusic(game);
      game.castleMusic.stop();
      game.kikkyMusic.stop();
      game.raceMusic.stop();
      game.birdMusic.stop();
      game.droneLoop.stop();
    },
    refreshVolume() {
      game.music.setVolume(game.getVolume() * 0.5);
      game.castleMusic.setVolume(game.getVolume() * 0.5);
      game.kikkyMusic.setVolume(game.getVolume() * 0.5);
      game.raceMusic.setVolume(game.getVolume() * 0.35);
    },
  };
}
