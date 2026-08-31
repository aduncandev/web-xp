import bigPng from 'assets/deltarune/climb/fnt_mainbig.png';
import mainPng from 'assets/deltarune/climb/fnt_main.png';
import bigMetrics from './fnt_mainbig.json';
import mainMetrics from './fnt_main.json';

function loadImage(url) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(img);
    img.src = url;
  });
}

function buildFont(img, metrics, name) {
  const glyphs = new Map();
  let ascent = 0;
  metrics.glyphs.forEach(g => {
    glyphs.set(g.ch, g);
    if (g.h > ascent) ascent = g.h;
  });
  return { name, img, glyphs, em: metrics.em, ascent };
}

export async function loadFonts() {
  const [bigImg, mainImg] = await Promise.all([
    loadImage(bigPng),
    loadImage(mainPng),
  ]);
  return {
    big: buildFont(bigImg, bigMetrics, 'big'),
    main: buildFont(mainImg, mainMetrics, 'main'),
  };
}

export function measureText(font, txt, scale = 1) {
  let w = 0;
  for (const ch of txt) {
    const g = font.glyphs.get(ch.charCodeAt(0)) || font.glyphs.get(63);
    if (g) w += g.shift * scale;
  }
  return w;
}
