/*
 * The Wii Shop's download animation: Mario runs along the bottom of the
 * white screen collecting the coins that stream in from the right; on each
 * pass he bops the next ?-block (bounce, coin pop, spent block), and once
 * he reaches the third block he stays under it, hopping and hitting it over
 * and over until the download wraps up in a white flash. Real sprite
 * frames, real SMB sound bites, physics constants from the channel.
 *
 * `gain` is the pre-scaled sfx volume; `onDone` fires once after the fade.
 */
import { useEffect, useRef } from 'react';

import shadowImg from 'assets/store/wii/anim/shadow.png';
import mario1 from 'assets/store/wii/anim/mario1.png';
import mario2 from 'assets/store/wii/anim/mario2.png';
import mario3 from 'assets/store/wii/anim/mario3.png';
import mario4 from 'assets/store/wii/anim/mario4.png';
import mario5 from 'assets/store/wii/anim/mario5.png';
import luigi1 from 'assets/store/wii/anim/luigi1.png';
import luigi2 from 'assets/store/wii/anim/luigi2.png';
import luigi3 from 'assets/store/wii/anim/luigi3.png';
import luigi4 from 'assets/store/wii/anim/luigi4.png';
import luigi5 from 'assets/store/wii/anim/luigi5.png';
import boxImg from 'assets/store/wii/anim/box.png';
import boxUsedImg from 'assets/store/wii/anim/boxused.png';
import shadowBoxImg from 'assets/store/wii/anim/shadowbox.png';
import boxcoin1 from 'assets/store/wii/anim/boxcoin1.png';
import boxcoin2 from 'assets/store/wii/anim/boxcoin2.png';
import boxcoin3 from 'assets/store/wii/anim/boxcoin3.png';
import boxcoin4 from 'assets/store/wii/anim/boxcoin4.png';
import shadowBoxcoin1 from 'assets/store/wii/anim/shadowboxcoin1.png';
import shadowBoxcoin2 from 'assets/store/wii/anim/shadowboxcoin2.png';
import shadowBoxcoin3 from 'assets/store/wii/anim/shadowboxcoin3.png';
import shadowBoxcoin4 from 'assets/store/wii/anim/shadowboxcoin4.png';
import coin1 from 'assets/store/wii/anim/coin1.png';
import coin2 from 'assets/store/wii/anim/coin2.png';
import coin3 from 'assets/store/wii/anim/coin3.png';
import coin4 from 'assets/store/wii/anim/coin4.png';
import downloadLoopSrc from 'assets/store/wii/snd/download.wav';
import coinSndSrc from 'assets/store/wii/snd/MARIO_COIN.WAV';
import jumpSndSrc from 'assets/store/wii/snd/MARIO_JUMPL.WAV';

const W = 608;
const H = 456;
const BOXES_X = [-187, -16, 154];
// A box is drawn 12px right of its slot; Mario (32px wide, drawn from his
// left edge) is centered under it when he stands at slot + 12.
const BOX_ALIGN = 12;
const GROUND = 90; // Mario's ground line, in center-origin coords
const RUN = 4;
const MIN_FRAMES = 430; // ~7s before the finale is allowed to end

function load(src) {
  const img = new Image();
  img.src = src;
  return img;
}

export default function MarioDownload({ gain = 0.3, onDone }) {
  const canvasRef = useRef(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const gainRef = useRef(gain);
  gainRef.current = gain;

  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d');
    // once in a while the other brother handles the delivery
    const bros =
      Math.random() < 0.125
        ? [luigi2, luigi3, luigi4, luigi5, luigi1]
        : [mario2, mario3, mario4, mario5, mario1];
    const marios = bros.map(load);
    const imgShadow = load(shadowImg);
    const imgBox = load(boxImg);
    const imgBoxUsed = load(boxUsedImg);
    const imgShadowBox = load(shadowBoxImg);
    const boxcoins = [
      load(boxcoin1),
      load(boxcoin2),
      load(boxcoin3),
      load(boxcoin4),
    ];
    const shadowBoxcoins = [
      load(shadowBoxcoin1),
      load(shadowBoxcoin2),
      load(shadowBoxcoin3),
      load(shadowBoxcoin4),
    ];
    const coinImgs = [load(coin1), load(coin2), load(coin3), load(coin4)];

    const loop = new Audio(downloadLoopSrc);
    loop.loop = true;

    let frame = 0;
    let pass = 0; // 0 plain run, 1..2 bop that box, 3 final-block finale
    let marioX = -W / 2 - 32;
    let marioY = GROUND;
    let marioFrame = 0;
    let airborne = false;
    let boxY = [22, 22, 22];
    let boxSpent = [false, false, false];
    let boxTimer = 0;
    let finalT = 0;
    let finalHits = 0;
    // the coin popping out of a bopped box
    let bcTimer = 0;
    let bcX = 0;
    let bcSprite = 0;
    let coins = [];
    let fade = 0;
    let done = false;
    let raf;

    const playOnce = (src, v = 0.5) => {
      const a = new Audio(src);
      a.volume = Math.min(1, gainRef.current * v);
      a.play().catch(() => {});
    };

    const bopBox = target => {
      boxTimer = 2;
      bcTimer = 1;
      // the coin (12px wide at 1.5x) pops from the box's center
      bcX = BOXES_X[target] + BOX_ALIGN + 10;
      playOnce(coinSndSrc, 0.14);
      if (target < 2) boxSpent[target] = true;
    };

    const bcY = () => Math.min(0.075 * (bcTimer - 39) ** 2 - 90, 24);

    let last = 0;
    let acc = 0;
    const simulate = () => {
      frame++;
      if (frame === 20) {
        loop.volume = Math.min(1, gainRef.current * 0.55);
        loop.play().catch(() => {});
      }
      const finishing = fade > 0;

      if (!finishing) {
        // coins stream in from the right on a steady cadence
        if (frame > 30 && frame % 12 === 0)
          coins.push({ x: W / 2 + 16, sprite: 0 });
        for (let i = 0; i < coins.length; i++) {
          const c = coins[i];
          c.x -= 3.5;
          c.sprite = (c.sprite + 0.166667) % 4;
          if (c.x < marioX + 16 && Math.abs(marioY - GROUND) < 30) {
            playOnce(coinSndSrc, 0.1);
            coins.splice(i, 1);
            i--;
          } else if (c.x < -W / 2 - 24) {
            coins.splice(i, 1);
            i--;
          }
        }

        marioFrame = (marioFrame + 0.25) % 3;
        if (boxTimer > 0) boxTimer += 2;
        if (boxTimer > 40) boxTimer = 0;
        if (bcTimer > 0) {
          bcTimer += 2;
          bcSprite = (bcSprite + 0.25) % 4;
          if (bcTimer > 78) bcTimer = 0;
        }

        if (pass === 3 && marioX >= BOXES_X[2] + BOX_ALIGN) {
          // the finale: hop under the last block, hitting it over and over
          marioX = BOXES_X[2] + BOX_ALIGN;
          finalT += 3;
          const prevY = marioY;
          marioY = Math.min(0.05 * (finalT - 29.7) ** 2 + 46, GROUND);
          if (marioY < GROUND) marioFrame = 3;
          if (prevY >= GROUND && marioY < GROUND) playOnce(jumpSndSrc, 0.22);
          if (marioY < 51 && !airborne) {
            airborne = true;
            bopBox(2);
            finalHits++;
          }
          if (marioY >= GROUND) {
            airborne = false;
            if (finalT > 59.4) finalT = 0;
            marioFrame = 4;
            // enough hits and enough runtime: flash out
            if (finalHits >= 3 && frame > MIN_FRAMES) fade = 1;
          }
        } else {
          // regular pass: run right, arcing over this pass's target box
          const target = pass >= 1 && pass <= 3 ? Math.min(pass - 1, 2) : -1;
          let y = GROUND;
          if (target >= 0) {
            y = Math.min(
              0.05 * (marioX - (BOXES_X[target] + BOX_ALIGN)) ** 2 + 46,
              GROUND,
            );
          }
          const wasGrounded = marioY >= GROUND;
          marioY = y;
          if (marioY < GROUND) {
            marioFrame = 3;
            if (wasGrounded) playOnce(jumpSndSrc, 0.22);
            if (marioY < 51 && !airborne) {
              airborne = true;
              bopBox(target);
            }
          } else {
            airborne = false;
          }
          marioX += RUN;
          if (marioX > W / 2 + 16) {
            marioX = -W / 2 - 32;
            pass = Math.min(pass + 1, 3);
            boxTimer = 0;
            bcTimer = 0;
          }
        }
      } else {
        fade++;
        if (fade === 30) loop.pause();
        if (fade > 70 && !done) {
          done = true;
          if (onDoneRef.current) onDoneRef.current();
        }
      }
    };

    // a bopped box's live height, bump included, shared by face and shadow
    const boxYNow = b => {
      const bump =
        boxTimer > 0 && boxTimer < 22
          ? Math.min(0.1 * (boxTimer - 11) ** 2 + 10, 22) - 22
          : 0;
      const isActive =
        (pass >= 1 && pass <= 3 && b === Math.min(pass - 1, 2)) ||
        (pass === 3 && b === 2);
      return boxY[b] + (isActive ? bump : 0);
    };

    const draw = () => {
      const g = Math.min(1, frame / 50);
      ctx.clearRect(0, 0, W, H);
      // soft shadows, each pinned to what casts it
      ctx.imageSmoothingEnabled = true;
      ctx.globalAlpha = 0.37 * g;
      if (bcTimer > 0) {
        const sbc = shadowBoxcoins[Math.floor(bcSprite)];
        ctx.drawImage(
          sbc,
          bcX - 4 + W / 2,
          bcY() - 8 + H / 2,
          sbc.width * 1.5,
          sbc.height * 1.5,
        );
      }
      for (let b = 0; b < 3; b++) {
        ctx.drawImage(
          imgShadowBox,
          BOXES_X[b] - 12 + W / 2,
          boxYNow(b) - 12 + H / 2,
          imgShadowBox.width,
          imgShadowBox.height,
        );
      }
      ctx.drawImage(imgShadow, marioX + 2 + W / 2, marioY + 30 + H / 2, 28, 6);
      for (const c of coins) {
        ctx.drawImage(imgShadow, c.x + 5 + W / 2, 121 + H / 2, 14, 4.5);
      }
      // crisp sprites
      ctx.globalAlpha = g;
      ctx.imageSmoothingEnabled = false;
      if (bcTimer > 0) {
        const bc = boxcoins[Math.floor(bcSprite)];
        ctx.drawImage(
          bc,
          bcX + W / 2,
          bcY() + H / 2,
          bc.width * 1.5,
          bc.height * 1.5,
        );
      }
      for (let b = 0; b < 3; b++) {
        const img = boxSpent[b] ? imgBoxUsed : imgBox;
        ctx.drawImage(
          img,
          BOXES_X[b] + 12 + W / 2,
          boxYNow(b) + H / 2,
          img.width * 2,
          img.height * 2,
        );
      }
      for (const c of coins) {
        const img = coinImgs[Math.floor(c.sprite)];
        ctx.drawImage(
          img,
          c.x + W / 2,
          95 + H / 2,
          img.width * 1.5,
          img.height * 1.5,
        );
      }
      const m = marios[Math.floor(marioFrame)];
      ctx.drawImage(
        m,
        marioX + W / 2,
        marioY + H / 2,
        m.width * 2,
        m.height * 2,
      );
      if (fade > 0) {
        ctx.globalAlpha = 1;
        ctx.fillStyle = `rgba(255,255,255,${Math.min(1, fade / 40)})`;
        ctx.fillRect(0, 0, W, H);
      }
      ctx.globalAlpha = 1;
    };

    // fixed 60fps timestep: rAF cadence varies wildly (uncapped compositors,
    // 144Hz panels), but Mario's little world always runs at Wii speed
    const step = t => {
      if (!last) last = t;
      acc += Math.min(t - last, 100);
      last = t;
      while (acc >= 16.6667 && !done) {
        acc -= 16.6667;
        simulate();
      }
      draw();
      if (!done) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(raf);
      loop.pause();
      loop.src = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      style={{ position: 'absolute', inset: 0 }}
    />
  );
}
