// Tinted copies of sprites the renderer blends over the originals: the
// reticle in its two moods, the trophies, the ethereal glow in any colour,
// the timer digits in any colour, and Kris's charge flash.

function tintCopy(sprites, name, color) {
  const s = sprites[name];
  const c = document.createElement('canvas');
  c.width = s.w * s.frames;
  c.height = s.h;
  const g = c.getContext('2d');
  g.drawImage(s.img, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

function blendCopy(sprites, name, color) {
  const s = sprites[name];
  const c = document.createElement('canvas');
  c.width = s.w * s.frames;
  c.height = s.h;
  const g = c.getContext('2d');
  g.drawImage(s.img, 0, 0);
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = 'destination-in';
  g.drawImage(s.img, 0, 0);
  return c;
}

/** The tint set for a loaded sprite sheet: { tinted, chargeTint }. */
export function buildTints(sprites) {
  const glowCache = {};
  const digitCache = {};
  const tinted = {
    hintGray: tintCopy(sprites, 'reticleHint', 'rgb(200,200,200)'),
    hintWarm: tintCopy(sprites, 'reticleHint', 'rgb(255,200,132)'),
    retYellow: tintCopy(sprites, 'reticle', '#ffd93c'),
    retWhite: tintCopy(sprites, 'reticle', '#ffffff'),
    trophyGreen: blendCopy(sprites, 'trophy', '#A1FF82'),
    trophyYellow: blendCopy(sprites, 'trophy', '#CEFF3D'),
    glow(rr, gg, bb) {
      const key = `${rr},${gg},${bb}`;
      if (!glowCache[key]) {
        const s = sprites.ethereal;
        const c = document.createElement('canvas');
        c.width = s.w;
        c.height = s.h;
        const g = c.getContext('2d');
        g.drawImage(s.img, 0, 0);
        g.globalCompositeOperation = 'multiply';
        g.fillStyle = `rgb(${rr},${gg},${bb})`;
        g.fillRect(0, 0, c.width, c.height);
        g.globalCompositeOperation = 'destination-in';
        g.drawImage(s.img, 0, 0);
        glowCache[key] = c;
      }
      return glowCache[key];
    },
    digits(col) {
      if (!digitCache[col])
        digitCache[col] = tintCopy(sprites, 'timerDigits', col);
      return digitCache[col];
    },
  };
  const chargeTint = {
    krisCharge: { img: tintCopy(sprites, 'krisCharge', '#00c8c8') },
    krisChargeR: { img: tintCopy(sprites, 'krisChargeR', '#00c8c8') },
    krisChargeL: { img: tintCopy(sprites, 'krisChargeL', '#00c8c8') },
  };
  return { tinted, chargeTint };
}
