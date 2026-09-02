// The hidden rooms behind the codes: their state machine, walking, and what
// each thing says.
import { play, startMusic, stopMusic } from './run';
import { detonateTiger, makePark, stepPark, stopParkSounds } from './park';
import { openLines, stepDialog } from './dialog';

const MIKE_NPC_SOLIDS = [
  [118, 240, 80, 40],
  [261, 240, 100, 40],
  [408, 240, 80, 40],
  [525, 180, 60, 40],
];

const MIKE_SPOTS = [
  {
    key: 'mikeS',
    r: [120, 237, 80, 20],
  },
  {
    key: 'mikeM',
    r: [281, 188, 60, 60],
  },
  {
    key: 'mikeL',
    r: [424, 155, 52, 120],
  },
  {
    key: 'statue',
    r: [525, 129, 60, 80],
  },
];

const KIKKY_SPOTS = [
  {
    key: 'bomb',
    r: [470, 264, 110, 96],
  },
  {
    key: 'button',
    r: [56, 264, 78, 70],
  },
  {
    key: 'slot',
    r: [140, 264, 320, 70],
  },
];

const SHELTER_SOLIDS = [
  [0, 1220, 320, 20],
  [82, 1148, 156, 18],
  [0, 1020, 20, 200],
  [300, 1020, 20, 200],
  [260, 1020, 20, 20],
  [220, 1000, 20, 20],
  [40, 1020, 20, 20],
  [80, 1000, 20, 20],
  [100, 0, 20, 1000],
  [200, 0, 20, 1000],
  [120, 1106, 80, 18],
  [20, 1040, 20, 20],
  [60, 1020, 20, 20],
  [240, 1020, 20, 20],
  [280, 1040, 20, 20],
  [200, 1000, 20, 20],
  [100, 1000, 20, 20],
  [240, 1146, 20, 20],
  [220, 1126, 20, 20],
  [200, 1106, 20, 20],
  [60, 1146, 20, 20],
  [80, 1126, 20, 20],
  [100, 1106, 20, 20],
];

const SHELTER_DOOR = [110, 1126, 104, 44];

export function secretLines(game, key) {
  if (game.secret.zone === 'mike')
    return {
      mikeS: [
        'Oh. A visitor. To this room. Sure.',
        "I made a game, you know. It's back there. State of the art.",
        'Two people have played it. One was me.',
      ],
      mikeM: [
        '(It does its whole routine.)',
        '(...It does it again.)',
        "(It doesn't have a name yet.)",
      ],
      mikeL: ['Hey!! Good to see you!!', "That's all. Just good to see you."],
      statue: ["(It's a gold statue of a TV.)", '(Recently polished.)'],
    }[key];
  return {
    slot: [
      '(A coin slot runs the whole length of the machine.)',
      '(One play costs more money than has ever existed.)',
    ],
    debris: ['(Coolant.)'],
  }[key];
}

export function enterSecret(game, kind) {
  stopMusic(game);
  game.dialog = null;
  game.secret = {
    zone: kind === 'mike' ? 'mike' : 'shelter',
    t: 0,
    fade: 0,
    leaving: false,
    seen: {},
    talking: null,
    bgSpeed: -88,
    bgSpeedY: 1,
    bgSpeedSlow: -88,
    bgSpeedYSlow: 1,
    transition: null,
    park: null,
    shelterSeq: 0,
    shelterHold: 0,
    doorT: 0,
    shake: 0,
    kris: null,
  };
  if (kind === 'mike') {
    game.castleMusic.start();
    game.secret.kris = {
      x: 320,
      y: 462,
      dir: 'up',
      animT: 0,
      moving: false,
      runT: 0,
    };
  } else {
    game.birdMusic.start();
    game.droneLoop.start();
    game.secret.kris = {
      x: 150,
      y: 40,
      dir: 'down',
      animT: 0,
      moving: false,
      runT: 0,
    };
  }
  game.phase = 'secret';
}

export function leaveSecret(game) {
  stopParkSounds(game);
  game.castleMusic.stop();
  game.kikkyMusic.stop();
  game.kikkyMusic.setRate(1);
  game.birdMusic.stop();
  game.droneLoop.stop();
  game.dialog = null;
  game.secret = null;
  game.phase = 'menu';
  startMusic(game);
}

export function secretGoto(game, zone) {
  game.secret.transition = {
    to: zone,
    t: 0,
  };
}

export function secretBlocked(game, x, y) {
  if (game.secret.zone === 'mike') {
    const inMain = x >= 47 && x <= 592 && y >= 207 && y <= 432;
    const inCorr = x >= 287 && x <= 352 && y >= 207 && y <= 478;
    const inDoor = x >= 291 && x <= 348 && y >= 150 && y <= 208;
    if (!inMain && !inCorr && !inDoor) return true;
    return MIKE_NPC_SOLIDS.some(
      r => x >= r[0] && x <= r[0] + r[2] && y >= r[1] && y <= r[1] + r[3],
    );
  }
  if (game.secret.zone === 'kikky') {
    const inStrip = x >= 47 && x <= 592 && y >= 326 && y <= 352;
    const inCorr = x >= 287 && x <= 352 && y >= 326 && y <= 478;
    if (!inStrip && !inCorr) return true;
    // obj_solidblocksized is 40x40 at (520,310); padded for walker width
    const b = game.secret.park && game.secret.park.bomb;
    return !!(
      b &&
      b.state === 'here' &&
      x >= 502 &&
      x <= 578 &&
      y >= 310 &&
      y <= 354
    );
  }
  if (x < 8 || x > 312 || y < 20 || y > 1198) return true;
  return SHELTER_SOLIDS.some(
    r =>
      x >= r[0] - 5 &&
      x <= r[0] + r[2] + 5 &&
      y >= r[1] &&
      y <= r[1] + r[3] + 2,
  );
}

export function stepSecret(game) {
  const sec = game.secret;
  sec.t += 1;
  sec.bgSpeed -= 1;
  if (sec.bgSpeed < -800) sec.bgSpeed += 480;
  sec.bgSpeedY += 1;
  if (sec.bgSpeedY > -88) sec.bgSpeedY -= 88;
  if (sec.t % 2 === 0) {
    sec.bgSpeedSlow -= 1;
    if (sec.bgSpeedSlow < -800) sec.bgSpeedSlow += 480;
    sec.bgSpeedYSlow += 1;
    if (sec.bgSpeedYSlow > -88) sec.bgSpeedYSlow -= 88;
  }
  if (sec.zone === 'shelter') stepShelterAudio(game);
  if (sec.zone === 'kikky' && sec.park) stepPark(game);
  if (sec.transition) {
    sec.transition.t += 1;
    const tt = sec.transition.t;
    if (tt === 15) {
      sec.zone = sec.transition.to;
      if (sec.zone === 'kikky') {
        sec.park = makePark(game);
        game.castleMusic.stop();
        game.kikkyMusic.start();
        game.kikkyMusic.setRate(1);
        sec.kris = {
          x: 320,
          y: 462,
          dir: 'up',
          animT: 0,
          moving: false,
          runT: 0,
        };
      } else {
        stopParkSounds(game);
        sec.park = null;
        game.kikkyMusic.stop();
        game.kikkyMusic.setRate(1);
        game.castleMusic.start();
        sec.kris = {
          x: 320,
          y: 170,
          dir: 'down',
          animT: 0,
          moving: false,
          runT: 0,
        };
      }
    }
    if (tt >= 30) sec.transition = null;
    return;
  }
  if (sec.leaving) {
    sec.fade = Math.max(0, sec.fade - 0.05);
    if (sec.fade <= 0) leaveSecret(game);
    return;
  }
  if (sec.fade < 1) sec.fade = Math.min(1, sec.fade + 0.05);
  if (sec.shelterHold > 0) {
    sec.shelterHold -= 1;
    sec.doorT += 1;
    if (sec.doorT === 20) {
      play(game, 'dooropen', 1, 0.2);
      play(game, 'dooropen', 1, 0.3);
    }
    if (sec.doorT === 60) play(game, 'smile', 0.9);
    if (sec.shelterHold === 0) {
      sec.doorT = 0;
      sec.shake = 10;
      play(game, 'impact', 0.9);
      sec.shelterSeq = 2;
      openLines(game, ['(The door slammed shut on its own...)'], {
        side: 0,
        box: 'ut',
      });
    }
    return;
  }
  if (sec.shake > 0) sec.shake -= 1;
  if (game.pressed.menu) {
    if (game.dialog) game.dialog = null;
    else sec.leaving = true;
    return;
  }
  if (game.dialog) {
    stepDialog(game);
    if (!game.dialog) sec.talking = null;
    return;
  }
  const k = sec.kris;
  const dark = sec.zone !== 'shelter';
  if (game.held.cancel) k.runT += 1;
  else k.runT = 0;
  let wspeed = dark ? 4 : 2;
  if (k.runT > 0) wspeed = dark ? 6 : 3;
  if (k.runT > 10) wspeed = dark ? 8 : 4;
  let px = 0;
  let py = 0;
  if (game.held.right) {
    px = wspeed;
    k.dir = 'right';
  }
  if (game.held.left) {
    px = -wspeed;
    k.dir = 'left';
  }
  if (game.held.down) {
    py = wspeed;
    k.dir = 'down';
  }
  if (game.held.up) {
    py = -wspeed;
    k.dir = 'up';
  }
  k.moving = px !== 0 || py !== 0;
  const sx = Math.sign(px);
  for (let g = Math.abs(px); g > 0; g--) {
    if (secretBlocked(game, k.x + sx, k.y)) break;
    k.x += sx;
  }
  const sy = Math.sign(py);
  for (let g = Math.abs(py); g > 0; g--) {
    if (secretBlocked(game, k.x, k.y + sy)) break;
    k.y += sy;
  }
  if (k.moving) k.animT += wspeed * (dark ? 0.045 : 0.09);
  if (sec.zone === 'mike') {
    if (k.y >= 474) {
      sec.leaving = true;
      return;
    }
    if (k.y <= 156) {
      secretGoto(game, 'kikky');
      return;
    }
  } else if (sec.zone === 'kikky') {
    if (k.y >= 474) {
      secretGoto(game, 'mike');
      return;
    }
  } else if (sec.zone === 'shelter' && k.y <= 26) {
    sec.leaving = true;
    return;
  }
  if (game.pressed.jump) secretInteract(game);
}

export function secretInteract(game) {
  const sec = game.secret;
  const k = sec.kris;
  const dark = sec.zone !== 'shelter';
  const dirs = {
    up: [0, -1],
    down: [0, 1],
    left: [-1, 0],
    right: [1, 0],
  }[k.dir];
  const steps = dark ? [12, 28, 44, 60] : [8, 16, 26];
  const probes = steps.map(s => [
    k.x + dirs[0] * s,
    k.y - (dark ? 4 : 2) + dirs[1] * s,
  ]);
  const inZone = r =>
    probes.some(
      ([fx, fy]) =>
        fx >= r[0] && fx <= r[0] + r[2] && fy >= r[1] && fy <= r[1] + r[3],
    );
  if (sec.zone === 'mike') {
    const hit = MIKE_SPOTS.find(s => inZone(s.r));
    if (hit) {
      sec.seen[hit.key] = 1;
      sec.talking = hit.key;
      openLines(game, secretLines(game, hit.key), {
        side: 0,
      });
    }
    return;
  }
  if (sec.zone === 'kikky') {
    const park = sec.park;
    const hit = KIKKY_SPOTS.find(s => inZone(s.r));
    if (!hit) return;
    if (hit.key === 'button') {
      if (park.toys.length < 100) {
        // snd_kikkyshift loops for the fall, per obj_dentalchew
        const sfx = play(game, 'kikkyshift', 0.5, 0.8 + Math.random() * 0.4);
        if (sfx) sfx.loop = true;
        park.toys.push({
          x: 60 + Math.random() * 440,
          y: 40,
          vspeed: 1 + Math.random() * 4,
          travel: 60 + Math.random() * 140,
          action: 0,
          angle: 0,
          vx: 0,
          vy: 0,
          face: 1,
          sfx,
        });
        if (Math.random() < 1 / 7)
          play(game, 'kikkyspace', 0.6, 0.9 + Math.random() * 0.1);
      }
      return;
    }
    if (hit.key === 'slot') {
      openLines(game, secretLines(game, 'slot'), {
        side: 0,
      });
      return;
    }
    if (hit.key === 'bomb') {
      if (park.debris && park.bomb.state !== 'here') {
        openLines(game, secretLines(game, 'debris'), {
          side: 0,
        });
        return;
      }
      if (park.bomb.state !== 'here') return;
      if (park.bomb.tiger) {
        openLines(game, ["(It's the TIGERBOMB.)"], {
          side: 0,
          onClose: () => detonateTiger(game),
        });
      } else {
        openLines(game, ["(It's the KIKKYBOMB.)"], {
          side: 0,
          choices: ['Use', "Don't"],
          chosen: i => {
            if (i === 0) park.bomb.state = 'rising';
          },
        });
      }
    }
    return;
  }
  if (inZone(SHELTER_DOOR)) {
    if (sec.shelterSeq >= 2) {
      openLines(game, ["(It's locked.)"], {
        side: 0,
        box: 'ut',
      });
    } else if (sec.shelterSeq === 0) {
      openLines(
        game,
        [
          '(You try to open the door.)',
          "(It doesn't budge.)",
          '(But suddenly...)',
        ],
        {
          side: 0,
          box: 'ut',
          onClose: () => {
            sec.shelterSeq = 1;
            sec.shelterHold = 260;
            sec.doorT = 0;
          },
        },
      );
    }
  }
}

export function stepShelterAudio(game) {
  const y = game.secret.kris.y;
  let vol = 1;
  let vol2 = 0;
  if (y >= 420) {
    vol = 1 - (y - 620) / 400;
    vol2 = (y - 1100) / 300;
  }
  vol = Math.max(0, Math.min(1, vol));
  vol2 = Math.max(0, Math.min(1, vol2));
  if (game.secret.shelterSeq >= 2) vol2 = Math.min(1, vol2 + 0.2);
  game.birdMusic.setVolume(game.getVolume() * 0.5 * vol);
  game.droneLoop.setVolume(game.getVolume() * 0.55 * vol2);
}
