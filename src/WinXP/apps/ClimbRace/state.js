// Everything the game knows, in one object. Every module takes it as
// `game` and reads or writes the fields it owns; nothing is closed over.
import {
  createMixer,
  createMusicLoop,
  musBirdnoiseSrc,
  musCastletownSrc,
  musClimbSrc,
  musKikkySrc,
  musRaceSrc,
  smileSrc,
} from './sounds';

export function createState(canvas, opts) {
  const game = { canvas, opts };
  game.ctx = canvas.getContext('2d');
  game.ctx.imageSmoothingEnabled = false;

  // --- the host's hooks ---
  game.getVolume = opts.getVolume || (() => 0.5);
  game.awardPoints = opts.awardPoints || (() => {});
  game.store = opts.store || { load: () => null, save: () => {} };
  game.keyTarget = null; // set by createGame

  // --- the save game: best times by level key, XP paid out by seed ---
  try {
    game.saveData = game.store.load() || {};
  } catch (e) {
    game.saveData = {};
  }
  if (!game.saveData.best) game.saveData.best = {};
  if (!game.saveData.paid) game.saveData.paid = {};

  // --- audio ---
  game.mixer = createMixer(game.getVolume);
  game.music = createMusicLoop(musClimbSrc, () => game.getVolume() * 0.5);
  game.castleMusic = createMusicLoop(
    musCastletownSrc,
    () => game.getVolume() * 0.5,
  );
  game.kikkyMusic = createMusicLoop(musKikkySrc, () => game.getVolume() * 0.5);
  // the dog tower race loops this at 0.7 of full volume
  game.raceMusic = createMusicLoop(musRaceSrc, () => game.getVolume() * 0.35);
  game.birdMusic = createMusicLoop(musBirdnoiseSrc, () => 0);
  game.droneLoop = createMusicLoop(smileSrc, () => 0, 0.15);

  // --- assets, filled in once loaded (see engine.js) ---
  game.sprites = null;
  game.fonts = null;
  game.bake = null; // the church's baked backdrop image
  game.backdrop = null; // whichever backdrop the loaded level uses
  game.tinted = null; // tinted sprite copies (assets.js)
  game.chargeTint = null;
  game.fontTintCache = new Map();
  game.endlessStrip = null; // the flood's repeating brick strip
  game.wallLattice = null; // the secret rooms' green wall pattern
  game.wallScratch = null;

  // --- the loop ---
  game.destroyed = false;
  game.raf = 0;
  game.acc = 0;
  game.last = performance.now();
  game.siner = 0; // frames since start, the animations' clock

  // --- where the player is: the screens, then the level ---
  game.phase = 'menu'; // menu | codeentry | game | results | endresults | secret
  game.menuSel = 0;
  game.codeEntry = null;
  game.lastSeed = '0000';
  game.results = null; // the cleared seed's tally, for the results screen
  game.L = null; // the loaded level (levels.js)
  game.secret = null; // the hidden rooms' state (secret.js)
  game.endless = null; // the flood's state (endless.js)

  // --- one attempt on the wall ---
  game.mode = 'ground'; // ground | mount | wall | finish
  game.running = false; // the timer is going
  game.elapsed = 0; // frames on the clock
  game.thisTime = -1; // the finished run's frames, or -1
  game.newBest = false;
  game.glowAlpha = 0;
  game.glowTarget = 0;
  game.switchLit = false;
  game.holdExitT = 0; // frames X has been held to let go
  game.finishT = 0;
  game.zone = 'bottom'; // which floor the walker is on
  game.walker = null; // Kris on foot
  game.kris = null; // Kris on the wall
  game.mount = null; // the hop between the two
  game.dialog = null; // an open text box (dialog.js)
  game.coinsTaken = 0;
  game.coinMarker = null;
  // cells the wall is currently missing: hidden behind a bell, or broken
  game.hiddenCells = new Set();
  game.brokenCells = new Set();
  game.cellAppearGroup = new Map();

  // --- what moves around Kris ---
  game.streams = []; // water falling from the dispensers
  game.anims = []; // one-shot sprite animations
  game.ghosts = []; // afterimages of a charged jump
  game.confetti = [];
  game.fallingTiles = [];
  game.board = { x: 40, y: 0, siner: 0 }; // the timer board

  // --- camera and input ---
  game.camX = 0;
  game.camY = 0;
  game.held = {}; // keys down right now
  game.pressed = {}; // keys that went down this tick

  return game;
}
