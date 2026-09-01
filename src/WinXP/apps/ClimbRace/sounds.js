import wingSrc from 'assets/sounds/deltarune/climb/snd_wing.wav';
import bumpSrc from 'assets/sounds/deltarune/climb/snd_bump.wav';
import jumpSrc from 'assets/sounds/deltarune/climb/snd_jump.wav';
import noiseSrc from 'assets/sounds/deltarune/climb/snd_noise.wav';
import fallSrc from 'assets/sounds/deltarune/climb/snd_fall.wav';
import chargeSrc from 'assets/sounds/deltarune/climb/snd_chargeshot_charge.wav';
import grabSrc from 'assets/sounds/deltarune/climb/snd_grab.wav';
import ghostSrc from 'assets/sounds/deltarune/climb/snd_ghostappear.ogg';
import txttorSrc from 'assets/sounds/deltarune/climb/snd_txttor.wav';
import txtalSrc from 'assets/sounds/deltarune/climb/snd_txtal.wav';
import textSrc from 'assets/sounds/deltarune/climb/snd_text.wav';
import passingSrc from 'assets/sounds/deltarune/climb/snd_dtrans_heavypassing.ogg';
import splashSrc from 'assets/sounds/deltarune/climb/motor_upper_2.wav';
import victorySrc from 'assets/dogvirus/victory.wav';
import metalhitSrc from 'assets/sounds/deltarune/climb/snd_metalhit.wav';
import swallowSrc from 'assets/sounds/deltarune/climb/snd_swallow.wav';
import coinSrc from 'assets/sounds/deltarune/climb/snd_flowery_coin.wav';
import heavyswingSrc from 'assets/sounds/deltarune/climb/snd_heavyswing.wav';
import errorSrc from 'assets/sounds/deltarune/climb/snd_error.wav';
import bellSrc from 'assets/sounds/deltarune/climb/snd_bell.wav';
import menumoveSrc from 'assets/sounds/deltarune/climb/snd_menumove.wav';
import hurtSrc from 'assets/sounds/deltarune/climb/snd_hurt1.wav';
import playablebellSrc from 'assets/sounds/deltarune/climb/snd_playablebell.wav';
import kikkyshiftSrc from 'assets/sounds/deltarune/climb/snd_kikkyshift.wav';
import kikkycanSrc from 'assets/sounds/deltarune/climb/snd_kikkycan.wav';
import kikkytoySrc from 'assets/sounds/deltarune/climb/snd_kikkytoy.wav';
import kikkyspaceSrc from 'assets/sounds/deltarune/climb/snd_kikkyspace.wav';
import kikkyexplosionSrc from 'assets/sounds/deltarune/climb/snd_kikkyexplosion.wav';
import meowSrc from 'assets/sounds/deltarune/climb/snd_meow.wav';
import badexplosionSrc from 'assets/sounds/deltarune/climb/snd_badexplosion.wav';
import smileSrc from 'assets/sounds/deltarune/climb/snd_smile.wav';
import dooropenSrc from 'assets/sounds/deltarune/climb/snd_dooropen.wav';
import impactSrc from 'assets/sounds/deltarune/climb/snd_impact.wav';
import orchhitSrc from 'assets/sounds/deltarune/climb/snd_orchhit.wav';
import musClimbSrc from 'assets/sounds/deltarune/climb/mus_climb.ogg';
import musRaceSrc from 'assets/sounds/deltarune/climb/mus_race.ogg';
import musCastletownSrc from 'assets/sounds/deltarune/climb/mus_castletown.ogg';
import musKikkySrc from 'assets/sounds/deltarune/climb/mus_kikky_upgrade.ogg';
import musBirdnoiseSrc from 'assets/sounds/deltarune/climb/mus_birdnoise.ogg';

const SRC = {
  wing: wingSrc,
  bump: bumpSrc,
  jump: jumpSrc,
  noise: noiseSrc,
  fall: fallSrc,
  charge: chargeSrc,
  grab: grabSrc,
  ghost: ghostSrc,
  splash: splashSrc,
  victory: victorySrc,
  metalhit: metalhitSrc,
  swallow: swallowSrc,
  coin: coinSrc,
  heavyswing: heavyswingSrc,
  error: errorSrc,
  bell: bellSrc,
  menumove: menumoveSrc,
  hurt: hurtSrc,
  playablebell: playablebellSrc,
  txttor: txttorSrc,
  txtal: txtalSrc,
  text: textSrc,
  kikkyshift: kikkyshiftSrc,
  kikkycan: kikkycanSrc,
  kikkytoy: kikkytoySrc,
  kikkyspace: kikkyspaceSrc,
  kikkyexplosion: kikkyexplosionSrc,
  meow: meowSrc,
  badexplosion: badexplosionSrc,
  smile: smileSrc,
  dooropen: dooropenSrc,
  impact: impactSrc,
  orchhit: orchhitSrc,
  passing: passingSrc,
};

export {
  musClimbSrc,
  musCastletownSrc,
  musKikkySrc,
  musBirdnoiseSrc,
  musRaceSrc,
  smileSrc,
};

// loops use Web Audio buffer sources: HTMLAudio looping has an audible
// seam that GameMaker's playback doesn't
let actx = null;
function getCtx() {
  if (!actx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    actx = AC ? new AC() : null;
  }
  if (actx && actx.state === 'suspended') actx.resume().catch(() => {});
  return actx;
}
const bufferCache = new Map();
function loadBuffer(src) {
  if (!bufferCache.has(src)) {
    bufferCache.set(
      src,
      fetch(src)
        .then(r => r.arrayBuffer())
        .then(ab => getCtx().decodeAudioData(ab)),
    );
  }
  return bufferCache.get(src);
}

/** A gapless looping track (the game whole-file-loops its music too).
 *  `rate` pitches the whole loop, like GameMaker's snd_pitch. */
export function createMusicLoop(src, getVolume, rate = 1) {
  let node = null;
  let gain = null;
  let fallback = null;
  let stopped = true;
  let curRate = rate;
  return {
    start() {
      this.stop();
      stopped = false;
      const ctx = getCtx();
      if (!ctx) {
        fallback = new Audio(src);
        fallback.loop = true;
        fallback.volume = Math.min(1, getVolume());
        fallback.preservesPitch = false;
        fallback.playbackRate = Math.max(0.0625, curRate);
        fallback.play().catch(() => {});
        return;
      }
      loadBuffer(src)
        .then(buf => {
          if (stopped) return;
          node = ctx.createBufferSource();
          node.buffer = buf;
          node.loop = true;
          node.playbackRate.value = curRate;
          gain = ctx.createGain();
          gain.gain.value = Math.min(1, getVolume());
          node.connect(gain);
          gain.connect(ctx.destination);
          node.start();
        })
        .catch(() => {});
    },
    stop() {
      stopped = true;
      if (node) {
        try {
          node.stop();
        } catch (e) {}
        node = null;
        gain = null;
      }
      if (fallback) {
        fallback.pause();
        fallback.src = '';
        fallback = null;
      }
    },
    setVolume(v) {
      if (gain) gain.gain.value = Math.min(1, v);
      if (fallback) fallback.volume = Math.min(1, v);
    },
    setRate(r) {
      curRate = r;
      if (node) node.playbackRate.value = r;
      if (fallback) fallback.playbackRate = Math.max(0.0625, r);
    },
  };
}

export function createMixer(getVolume) {
  let charge = null;
  const play = (name, gain = 1, rate = 0) => {
    if (!SRC[name]) return null;
    const a = new Audio(SRC[name]);
    a.volume = Math.min(1, getVolume() * gain);
    if (rate) {
      // GameMaker pitches the sample itself
      a.preservesPitch = false;
      a.playbackRate = rate;
    }
    a.play().catch(() => {});
    return a;
  };
  return {
    play,
    startCharge() {
      if (charge) return;
      const ctx = getCtx();
      if (!ctx) return;
      const mine = { pending: true };
      charge = mine;
      loadBuffer(SRC.charge)
        .then(buf => {
          if (charge !== mine) return;
          const src = ctx.createBufferSource();
          src.buffer = buf;
          src.loop = true;
          src.playbackRate.value = 0.4;
          const g = ctx.createGain();
          g.gain.value = Math.min(1, getVolume() * 0.3);
          src.connect(g);
          g.connect(ctx.destination);
          src.start();
          charge = { src, gain: g };
        })
        .catch(() => {
          if (charge === mine) charge = null;
        });
    },
    chargePitch(rate) {
      if (charge && charge.src) charge.src.playbackRate.value = rate;
    },
    stopCharge() {
      if (charge && charge.src) {
        try {
          charge.src.stop();
        } catch (e) {}
      }
      charge = null;
    },
    stopAll() {
      this.stopCharge();
    },
  };
}
