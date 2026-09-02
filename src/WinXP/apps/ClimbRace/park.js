// Nagasagy Kikky Park: the cats, the toys and the bombs.
import { play } from './run';

export function makePark(game) {
  const tiger = Math.random() < 1 / 20;
  return {
    cats: [makeCat(game, 320, 200)],
    toys: [],
    bomb: {
      state: 'here',
      x: 500,
      y: 310,
      tiger,
      shownTiger: tiger,
    },
    debris: false,
    explo: null,
    sparkles: [],
  };
}

export function makeCat(game, x, y) {
  return {
    x,
    y,
    hspeed: 0,
    vx: 0,
    vy: 0,
    chasing: false,
    happiness: 100,
    active: false,
    bigTimer: 0,
    tummy: false,
    attackT: -1,
    target: null,
    face: Math.random() < 0.5 ? 1 : -1,
    animT: 0,
    timer: 0,
    reset: 1 + Math.floor(Math.random() * 4),
    xx: 0,
    yy: 0,
    shakeT: 0,
    vibration: 0,
    vibT: 0,
    meowT: 0,
    meowMax: 40 + Math.floor(Math.random() * 41),
    meowCut: 0,
    meowCutT: 0,
  };
}

export function detonateTiger(game) {
  const park = game.secret.park;
  play(game, 'badexplosion', 0.9);
  park.bomb.state = 'gone';
  park.explo = {
    t: 0,
  };
  park.debris = true;
}

export function stepPark(game) {
  const park = game.secret.park;
  const bomb = park.bomb;
  if (bomb.state === 'rising') {
    bomb.y = Math.max(bomb.y - 4, 150);
    if (bomb.y <= 150) {
      play(game, 'kikkyspace', 0.8);
      for (let i = 0; i < 8; i++) {
        park.sparkles.push({
          x: bomb.x + 20,
          y: bomb.y + 20,
          vx: Math.cos((i / 8) * Math.PI * 2) * 6,
          vy: Math.sin((i / 8) * Math.PI * 2) * 6,
          t: 0,
        });
      }
      park.cats.push(makeCat(game, bomb.x + 20, bomb.y + 20));
      bomb.state = 'gone';
    }
  }
  if (park.explo) {
    park.explo.t += 1;
    if (park.explo.t > 16) park.explo = null;
  }
  park.sparkles = park.sparkles.filter(s => {
    s.t += 1;
    s.x += s.vx;
    s.y += s.vy;
    s.vx *= 0.85;
    s.vy *= 0.85;
    return s.t <= 20;
  });
  park.toys = park.toys.filter(t => {
    if (t.action === 0) {
      t.y += t.vspeed;
      t.travel -= t.vspeed;
      if (t.travel <= 0) {
        t.action = 1;
        if (t.sfx) {
          t.sfx.pause();
          t.sfx = null;
        }
      }
    } else if (t.action === 2) {
      t.x += t.vx;
      t.y += t.vy;
      t.angle += 120;
      if (t.x < 40 || t.x > 580 || t.y < 10 || t.y > 300) t.dead = true;
    }
    if (t.dead && t.sfx) {
      t.sfx.pause();
      t.sfx = null;
    }
    return !t.dead;
  });

  // cats, straight from obj_kikky
  const anyToy = park.toys.some(t => t.action !== 2);
  park.cats.forEach(c => {
    if (anyToy) c.bigTimer = 0;
    c.bigTimer += 1;
    if (c.bigTimer === 900) {
      play(game, 'kikkyexplosion', 0.8);
      c.tummy = true;
      c.hspeed = 0;
      c.vx = 0;
      c.vy = 0;
    }
    if (c.active) c.happiness -= 1;
    const negative = c.happiness < 0 && !anyToy;
    if (negative) {
      c.hspeed = 0;
      c.vx = 0;
      c.vy = 0;
      c.shakeT += 1;
      if (c.shakeT > 20) {
        c.xx =
          (2 + Math.random() * 2) *
          (Math.random() < 0.5 ? 1 : -1) *
          c.vibration;
        c.yy =
          (2 + Math.random() * 2) *
          (Math.random() < 0.5 ? 1 : -1) *
          c.vibration;
      }
      if (c.shakeT > 25) {
        c.xx = 0;
        c.yy = 0;
        c.shakeT = -Math.floor(Math.random() * 11);
      }
      c.vibT += 1;
      if (c.vibT >= 60 && c.vibration < 1) {
        c.vibT = 0;
        c.vibration += 0.1;
      }
      c.meowT += 1;
      if (c.meowT > Math.max(1, c.meowMax - c.meowCut)) {
        play(game, 'meow', 0.8, 0.3 + Math.random() * 0.3);
        c.meowT = 0;
        c.meowMax = 40 + Math.floor(Math.random() * 41);
      }
      if (c.happiness < -600) {
        c.meowCutT += 1;
        if (c.meowCutT > 59) {
          c.meowCutT = 0;
          c.meowCut = Math.min(60, c.meowCut + 1);
        }
      }
    } else {
      c.vibration = 0;
      c.meowCut = 0;
      c.meowCutT = 0;
      c.xx = 0;
      c.yy = 0;
    }
    if (c.tummy && (Math.abs(c.hspeed) > 0 || Math.abs(c.vx) > 0))
      c.tummy = false;
    if (!c.tummy && !anyToy && !negative) {
      c.vx = 0;
      c.vy = 0;
      c.timer += 1;
      if (c.hspeed === 0) {
        if (c.timer > c.reset) {
          c.hspeed = (Math.random() < 0.5 ? 1 : -1) * 2;
          c.reset = (1 + Math.floor(Math.random() * 8)) * 30;
          c.timer = 0;
        }
      } else if (c.timer > c.reset) {
        c.hspeed = 0;
        c.reset = (1 + Math.floor(Math.random() * 4)) * 30;
        c.timer = 0;
      }
    }
    if (c.attackT >= 0) {
      c.attackT += 1;
      c.animT += 1;
      if (c.attackT > 30) {
        if (c.target) c.target.dead = true;
        c.target = null;
        c.attackT = -1;
      }
    } else if (anyToy) {
      if (!c.target || c.target.dead || c.target.action === 2)
        c.target = park.toys.find(t => t.action === 1) || null;
      if (c.target && c.target.action === 1) {
        const dx = c.target.x - c.x;
        const dy = c.target.y - c.y;
        const d = Math.hypot(dx, dy) || 1;
        c.hspeed = (dx / d) * 8;
        c.vx = c.hspeed;
        c.vy = (dy / d) * 8;
        c.x += c.vx;
        c.y += c.vy;
        if (d < 20) {
          c.attackT = 0;
          c.animT = 0;
          c.vx = 0;
          c.vy = 0;
          c.hspeed = 0;
          park.cats.forEach(cc => {
            cc.happiness = 100;
          });
          c.active = true;
          play(game, 'kikkycan', 0.8);
          const t = c.target;
          t.action = 2;
          t.face = Math.random() < 0.5 ? 1 : -1;
          const kd = Math.hypot(t.x - c.x, t.y - c.y) || 1;
          t.vx = ((t.x - c.x) / kd) * 12;
          t.vy = ((t.y - c.y) / kd) * 12;
        }
      }
    } else if (c.hspeed !== 0) {
      c.x += c.hspeed;
    }
    if (c.hspeed !== 0) c.face = Math.sign(c.hspeed);
    if (c.attackT < 0) c.animT += Math.abs(c.hspeed) / 2;
    if (c.x < 80) {
      c.x = 80;
      c.hspeed = -c.hspeed;
    }
    if (c.x > 540) {
      c.x = 540;
      c.hspeed = -c.hspeed;
    }
    if (c.y < 40) {
      c.y = 40;
      c.vy = -c.vy;
    }
    if (c.y > 250) {
      c.y = 250;
      c.vy = -c.vy;
    }
  });
  const first = park.cats[0];
  game.kikkyMusic.setRate(first && first.happiness <= -500 ? 0.5 : 1);
}

export function stopParkSounds(game) {
  if (!game.secret || !game.secret.park) return;
  game.secret.park.toys.forEach(t => {
    if (t.sfx) {
      t.sfx.pause();
      t.sfx = null;
    }
  });
}
