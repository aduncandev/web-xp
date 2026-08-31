// ox/oy are each sprite's real GameMaker origin; draw at pos - origin*2
import krisClimb from 'assets/deltarune/climb/kris_climb.png';
import krisCharge from 'assets/deltarune/climb/kris_charge.png';
import krisChargeR from 'assets/deltarune/climb/kris_charge_r.png';
import krisChargeL from 'assets/deltarune/climb/kris_charge_l.png';
import krisJumpUp from 'assets/deltarune/climb/kris_jump_up.png';
import krisJumpR from 'assets/deltarune/climb/kris_jump_r.png';
import krisJumpL from 'assets/deltarune/climb/kris_jump_l.png';
import krisSlipR from 'assets/deltarune/climb/kris_slip_r.png';
import krisSlipL from 'assets/deltarune/climb/kris_slip_l.png';
import krisLandR from 'assets/deltarune/climb/kris_land_r.png';
import krisLandL from 'assets/deltarune/climb/kris_land_l.png';
import krisFall from 'assets/deltarune/climb/kris_fall.png';
import krisBall from 'assets/deltarune/climb/kris_ball.png';
import krisLanded from 'assets/deltarune/climb/kris_landed.png';
import walkUp from 'assets/deltarune/climb/walk_up.png';
import walkDown from 'assets/deltarune/climb/walk_down.png';
import walkLeft from 'assets/deltarune/climb/walk_left.png';
import walkRight from 'assets/deltarune/climb/walk_right.png';
import reticle from 'assets/deltarune/climb/reticle.png';
import reticleHint from 'assets/deltarune/climb/reticle_hint.png';
import timerDigits from 'assets/deltarune/climb/timer_digits.png';
import timerBox from 'assets/deltarune/climb/timerbox.png';
import timerFire from 'assets/deltarune/climb/timer_fire.png';
import ethereal from 'assets/deltarune/climb/ethereal.png';
import wallswitch from 'assets/deltarune/climb/wallswitch.png';
import trophy from 'assets/deltarune/climb/trophy.png';
import table from 'assets/deltarune/climb/table.png';
import watertile from 'assets/deltarune/climb/watertile.png';
import dispenser from 'assets/deltarune/climb/dispenser.png';
import bucketSplash from 'assets/deltarune/climb/bucket_splash.png';
import bucket from 'assets/deltarune/climb/bucket.png';
import coin from 'assets/deltarune/climb/coin.png';
import bell from 'assets/deltarune/climb/bell.png';
import cup from 'assets/deltarune/climb/cup.png';
import textboxTop from 'assets/deltarune/climb/textbox_top.png';
import textboxLeft from 'assets/deltarune/climb/textbox_left.png';
import textboxCorner from 'assets/deltarune/climb/textbox_corner.png';
import menuArrow from 'assets/deltarune/climb/menu_arrow.png';
import churchTileset from 'assets/deltarune/climb/church_tileset.png';
import dust from 'assets/deltarune/climb/dust.png';
import dustSmall from 'assets/deltarune/climb/dust_small.png';
import slidedust from 'assets/deltarune/climb/slidedust.png';
import mikeSTalk from 'assets/deltarune/climb/secret/mike_s_talk.png';
import mikeM from 'assets/deltarune/climb/secret/mike_m.png';
import mikeMBashful from 'assets/deltarune/climb/secret/mike_m_bashful.png';
import mikeLTalk from 'assets/deltarune/climb/secret/mike_l_talk.png';
import tennaStatue from 'assets/deltarune/climb/secret/tenna_statue.png';
import wallrow from 'assets/deltarune/climb/secret/wallrow.png';
import vines from 'assets/deltarune/climb/secret/vines.png';
import mikeFloor from 'assets/deltarune/climb/secret/mike_floor.png';
import kikkyFloor from 'assets/deltarune/climb/secret/kikky_floor.png';
import kikkyWalk from 'assets/deltarune/climb/secret/kikky_walk.png';
import kikkyTummy from 'assets/deltarune/climb/secret/kikky_bigtummy.png';
import kikkyAttack from 'assets/deltarune/climb/secret/kikky_attack.png';
import kikkyBomb from 'assets/deltarune/climb/secret/kikky_bomb.png';
import tigerbomb from 'assets/deltarune/climb/secret/tigerbomb.png';
import dentalchew from 'assets/deltarune/climb/secret/dentalchew.png';
import coolantDebris from 'assets/deltarune/climb/secret/coolant_debris.png';
import realExplosion from 'assets/deltarune/climb/secret/real_explosion.png';
import heartSparkle from 'assets/deltarune/climb/secret/heart_sparkle.png';
import heart from 'assets/deltarune/climb/secret/heart.png';
import shelterRoom from 'assets/deltarune/climb/secret/shelter_room.png';
import shelterFront from 'assets/deltarune/climb/secret/shelter_front.png';
import shelter from 'assets/deltarune/climb/secret/shelter.png';
import shelterOpenDoor from 'assets/deltarune/climb/secret/shelter_open_door.png';
import sparkleX from 'assets/deltarune/climb/secret/sparkle_x.png';
import sparklePlus from 'assets/deltarune/climb/secret/sparkle_plus.png';
import krisLwUp from 'assets/deltarune/climb/secret/kris_lw_up.png';
import krisLwDown from 'assets/deltarune/climb/secret/kris_lw_down.png';
import krisLwLeft from 'assets/deltarune/climb/secret/kris_lw_left.png';
import krisLwRight from 'assets/deltarune/climb/secret/kris_lw_right.png';
import bakeUrl from 'assets/deltarune/climb/rooms/bake_churchclimb5.png';

// name: [url, frames, frameW, frameH, originX, originY]
const DEFS = {
  krisClimb: [krisClimb, 4, 29, 42, 15, 25],
  krisCharge: [krisCharge, 3, 26, 40, 14, 22],
  krisChargeR: [krisChargeR, 3, 25, 40, 14, 22],
  krisChargeL: [krisChargeL, 3, 25, 40, 14, 22],
  krisJumpUp: [krisJumpUp, 3, 26, 41, 14, 23],
  krisJumpR: [krisJumpR, 2, 30, 39, 14, 23],
  krisJumpL: [krisJumpL, 2, 30, 39, 16, 23],
  krisSlipR: [krisSlipR, 3, 25, 40, 13, 23],
  krisSlipL: [krisSlipL, 3, 25, 40, 12, 23],
  krisLandR: [krisLandR, 2, 30, 39, 14, 23],
  krisLandL: [krisLandL, 2, 30, 39, 14, 23],
  krisFall: [krisFall, 3, 26, 44, 13, 24],
  krisBall: [krisBall, 4, 24, 22, 12, 11],
  krisLanded: [krisLanded, 3, 29, 40, 15, 25],
  walkUp: [walkUp, 4, 19, 38, 0, 0],
  walkDown: [walkDown, 4, 19, 38, 0, 0],
  walkLeft: [walkLeft, 4, 19, 38, 0, 0],
  walkRight: [walkRight, 4, 19, 38, 0, 0],
  reticle: [reticle, 1, 24, 24, 2, 2],
  reticleHint: [reticleHint, 4, 22, 62, 11, -10],
  timerDigits: [timerDigits, 20, 42, 35, 0, 0],
  timerBox: [timerBox, 1, 42, 40, 0, 0],
  timerFire: [timerFire, 2, 7, 10, 0, 0],
  ethereal: [ethereal, 1, 20, 20, 0, 0],
  wallswitch: [wallswitch, 2, 20, 20, 0, 0],
  trophy: [trophy, 1, 15, 18, 0, 0],
  table: [table, 1, 43, 21, 0, 0],
  watertile: [watertile, 5, 20, 8, 0, 8],
  dispenser: [dispenser, 1, 20, 20, 0, 7],
  bucketSplash: [bucketSplash, 5, 20, 13, 0, 13],
  bucket: [bucket, 1, 20, 20, 0, 10],
  coin: [coin, 4, 12, 12, 6, 6],
  bell: [bell, 1, 19, 20, 9, 2],
  cup: [cup, 2, 23, 33, 0, 0],
  textboxTop: [textboxTop, 1, 1, 16, 0, 0],
  textboxLeft: [textboxLeft, 1, 16, 1, 0, 0],
  textboxCorner: [textboxCorner, 8, 16, 16, 0, 0],
  menuArrow: [menuArrow, 1, 12, 8, 6, 4],
  churchTileset: [churchTileset, 1, 96, 96, 0, 0],
  dust: [dust, 4, 20, 20, 10, 0],
  dustSmall: [dustSmall, 5, 6, 6, 3, 3],
  slidedust: [slidedust, 5, 20, 20, 10, 10],
  mikeS: [mikeSTalk, 2, 53, 45, 0, 0],
  mikeM: [mikeM, 8, 62, 59, 0, 0],
  mikeMBashful: [mikeMBashful, 5, 42, 58, -12, -2],
  mikeL: [mikeLTalk, 7, 54, 82, -5, 6],
  tennaStatue: [tennaStatue, 1, 31, 64, 0, 0],
  wallrow: [wallrow, 1, 360, 13, 0, 0],
  vines: [vines, 1, 32, 16, 0, 0],
  mikeFloor: [mikeFloor, 1, 640, 480, 0, 0],
  kikkyFloor: [kikkyFloor, 1, 640, 480, 0, 0],
  kikkyWalk: [kikkyWalk, 12, 41, 37, 20, 21],
  kikkyTummy: [kikkyTummy, 1, 41, 37, 20, 21],
  kikkyAttack: [kikkyAttack, 3, 36, 31, 20, 21],
  kikkyBomb: [kikkyBomb, 2, 20, 20, 0, 0],
  tigerbomb: [tigerbomb, 2, 20, 20, 0, 0],
  dentalchew: [dentalchew, 1, 32, 32, 16, 16],
  coolantDebris: [coolantDebris, 1, 20, 20, 0, 0],
  realExplosion: [realExplosion, 17, 71, 100, 35, 50],
  heartSparkle: [heartSparkle, 8, 11, 11, 5, 5],
  heart: [heart, 2, 16, 16, 0, 0],
  shelterRoom: [shelterRoom, 1, 320, 1240, 0, 0],
  shelterFront: [shelterFront, 1, 320, 1240, 0, 0],
  shelter: [shelter, 1, 209, 120, 0, 0],
  shelterOpenDoor: [shelterOpenDoor, 4, 209, 120, 0, 0],
  sparkleX: [sparkleX, 5, 5, 5, 2, 2],
  sparklePlus: [sparklePlus, 5, 5, 5, 2, 2],
  krisLwUp: [krisLwUp, 4, 19, 38, 0, 0],
  krisLwDown: [krisLwDown, 4, 19, 38, 0, 0],
  krisLwLeft: [krisLwLeft, 4, 19, 38, 0, 0],
  krisLwRight: [krisLwRight, 4, 19, 38, 0, 0],
};

function loadImage(url) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(img);
    img.src = url;
  });
}

export async function loadAll() {
  const entries = await Promise.all(
    Object.entries(DEFS).map(async ([name, [url, frames, w, h, ox, oy]]) => [
      name,
      { img: await loadImage(url), frames, w, h, ox, oy },
    ]),
  );
  return {
    sprites: Object.fromEntries(entries),
    bake: await loadImage(bakeUrl),
  };
}
