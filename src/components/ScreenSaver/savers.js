/**
 * The screen saver registry. Names and order match XP's own list on the
 * Display Properties > Screen Saver tab.
 */

import {
  createMystify,
  createBeziers,
  createStarfield,
  createMarquee,
  createMyPictures,
  createWindowsXP,
  createBlank,
  MYSTIFY_DEFAULTS,
  BEZIERS_DEFAULTS,
  STARFIELD_DEFAULTS,
  MARQUEE_DEFAULTS,
  MYPICS_DEFAULTS,
} from './savers2d';
import {
  createPipes,
  createText3D,
  createFlowerBox,
  createFlyingObjects,
  PIPES_DEFAULTS,
  TEXT3D_DEFAULTS,
  FLOWERBOX_DEFAULTS,
  FLYING_DEFAULTS,
} from './savers3d';

export const SAVERS = {
  '(None)': { create: null, defaults: {} },
  '3D FlowerBox': { create: createFlowerBox, defaults: FLOWERBOX_DEFAULTS },
  // Uses the logo and "experience" bitmaps extracted from ss3dfo.scr's own
  // resources, so the textured styles carry the real artwork.
  '3D Flying Objects': {
    kind: 'iframe',
    url: '/screensavers/flyingobjects/index.html',
    files: ['texturePath'],
    apply: (win, settings) => {
      if (win && typeof win.__xpApplyFlyingSettings === 'function') {
        win.__xpApplyFlyingSettings(settings);
      }
    },
    create: createFlyingObjects,
    defaults: FLYING_DEFAULTS,
  },
  // The genuine article: Isaiah Odhner's MIT-licensed WebGL remake, mirrored
  // into public/screensavers/pipes. Far closer to sspipes.scr than anything
  // the software renderer produces, so it wins.
  '3D Pipes': {
    kind: 'iframe',
    url: '/screensavers/pipes/index.html',
    files: ['texturePath'],
    apply: (win, settings) => {
      if (win && typeof win.__xpApplyPipeSettings === 'function') {
        win.__xpApplyPipeSettings(settings);
      }
    },
    create: createPipes, // fallback if the frame can't load
    defaults: PIPES_DEFAULTS,
  },
  // Real extruded glyph geometry needs font outlines, which Canvas 2D does
  // not expose — so this one runs on the three.js already vendored for Pipes.
  '3D Text': {
    kind: 'iframe',
    url: '/screensavers/text3d/index.html',
    files: ['texturePath', 'reflectionPath'],
    apply: (win, settings) => {
      if (win && typeof win.__xpApplyText3DSettings === 'function') {
        win.__xpApplyText3DSettings(settings);
      }
    },
    create: createText3D,
    defaults: TEXT3D_DEFAULTS,
  },
  Beziers: { create: createBeziers, defaults: BEZIERS_DEFAULTS },
  Blank: { create: createBlank, defaults: {} },
  Marquee: { create: createMarquee, defaults: MARQUEE_DEFAULTS },
  'My Pictures Slideshow': {
    create: createMyPictures,
    defaults: MYPICS_DEFAULTS,
    needsPictures: true,
  },
  Mystify: { create: createMystify, defaults: MYSTIFY_DEFAULTS },
  Starfield: { create: createStarfield, defaults: STARFIELD_DEFAULTS },
  'Windows XP': { create: createWindowsXP, defaults: {} },
};

export const SAVER_NAMES = Object.keys(SAVERS);

/** Savers with nothing to configure get a greyed Settings button. */
export const hasSettings = name =>
  !!SAVERS[name] && Object.keys(SAVERS[name].defaults).length > 0;

export function createSaver(name, w, h, settings, extra) {
  const entry = SAVERS[name];
  if (!entry || !entry.create) return null;
  return entry.create(w, h, settings, extra);
}
