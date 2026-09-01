import React, { useState, useRef, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';

import { createUser, setActiveUser, listUsers } from '../../context/users';
import { useVFS } from '../../context/VFSContext';
import { useVolume } from '../../context/VolumeContext';
import { getArt } from '../../xpArt';

import msLogo from 'assets/xp/oobe-mslogo.jpg';
import headerBg from 'assets/xp/oobe-header.jpg';
import nextUp from 'assets/xp/oobe-next-up.jpg';
import nextOver from 'assets/xp/oobe-next-over.jpg';
import nextDown from 'assets/xp/oobe-next-down.jpg';
import backUp from 'assets/xp/oobe-back-up.jpg';
import backOver from 'assets/xp/oobe-back-over.jpg';
import backDown from 'assets/xp/oobe-back-down.jpg';
import skipUp from 'assets/xp/oobe-skip-up.jpg';
import skipOver from 'assets/xp/oobe-skip-over.jpg';
import skipDown from 'assets/xp/oobe-skip-down.jpg';
import dialupGif from 'assets/xp/oobe-dialup.gif';
import cherubGif from 'assets/gifs/spamton_cherub.gif';
import heal50Png from 'assets/deltarune/heal50.png';
import sparestarPng from 'assets/deltarune/sparestar.png';
import oobeIntroSrc from 'assets/sounds/oobe-intro.mp4';
import oobeMusicSrc from 'assets/sounds/oobe-title.mp3';
import navClickSrc from 'assets/sounds/Windows Navigation Start.wav';
import sparkleSrc from 'assets/sounds/deltarune/snd_sparkle_glock.wav';
import powerSrc from 'assets/sounds/deltarune/snd_power.wav';

import { validateFileName } from '../../context/vfsUtils';

// Windows XP first-run setup (OOBE, "Welcome to Microsoft Windows").
// Layout sampled from refkit/shots/realxp/oobe-welcome.png (800x600), and
// the chrome is the real msoobe artwork: the header band with the logo,
// the three-state Back/Next/Skip arrow buttons, the connectivity page's
// dialup animation, and the real intro.wmv (as mp4) with title.wma
// looping under the wizard. Flow: intro movie -> Welcome -> Checking your
// Internet connectivity (Skip shown, Next disabled) -> Who will use this
// computer? -> Thank you!
//
// F1 (or the orb) does what F1 does in the Spamton fight: sparkles sweep
// in, spr_spamton_cherub materializes over the cursor, follows it, heals
// it, and leaves. Once only.

const MAX_ACCOUNTS = 5;
const USER_LABELS = [
  'Your name:',
  '2nd User:',
  '3rd User:',
  '4th User:',
  '5th User:',
];

const STEP_INTRO = -1;
const STEP_WELCOME = 0;
// Real XP setup showed the licence agreement here, between the welcome and
// the configuration pages. Ours carries the privacy notice instead, which
// is the only agreement this site actually has. Informational: Next
// continues either way, because nothing is withheld from anyone who does
// not read it.
const STEP_LICENCE = 1;
const STEP_NET = 2;
const STEP_USERS = 3;
const STEP_DONE = 4;

export default function SetupWizard({ onComplete }) {
  const vfs = useVFS();
  const { effectiveVolume } = useVolume();
  const [step, setStep] = useState(STEP_INTRO);
  const [names, setNames] = useState(Array(MAX_ACCOUNTS).fill(''));
  const [error, setError] = useState(null);
  const firstInputRef = useRef(null);
  const rootRef = useRef(null);
  const volRef = useRef(effectiveVolume);
  volRef.current = effectiveVolume;

  const helpArt = getArt('oobe-help', null);

  const playSnd = (src, v, rate) => {
    const a = new Audio(src);
    a.volume = Math.min(1, volRef.current * v);
    if (rate) {
      // GameMaker pitches the sample itself, so undo the browser default
      a.preservesPitch = false;
      a.playbackRate = rate;
    }
    a.play().catch(() => {});
  };
  const click = () => playSnd(navClickSrc, 0.6);

  // ---- the real OOBE music, looping under the whole wizard ----
  const musicRef = useRef(null);
  useEffect(() => {
    const a = new Audio(oobeMusicSrc);
    a.loop = true;
    a.volume = Math.min(1, volRef.current * 0.5);
    musicRef.current = a;
    const tryPlay = () => a.play().catch(() => {});
    // autoplay may be blocked before the first gesture; retry on one
    tryPlay();
    window.addEventListener('pointerdown', tryPlay);
    window.addEventListener('keydown', tryPlay);
    return () => {
      window.removeEventListener('pointerdown', tryPlay);
      window.removeEventListener('keydown', tryPlay);
      a.pause();
      a.src = '';
    };
  }, []);
  useEffect(() => {
    if (musicRef.current)
      musicRef.current.volume = Math.min(1, effectiveVolume * 0.5);
  }, [effectiveVolume]);

  // The reference is an 800x600 fullscreen surface; shrink to fit small
  // windows, and grow on bigger viewports only half of the way to full
  // proportional scaling — full scale reads comically large.
  const [scale, setScale] = useState(1);
  const scaleRef = useRef(1);
  scaleRef.current = scale;
  useEffect(() => {
    const measure = () => {
      const fit = Math.min(window.innerWidth / 800, window.innerHeight / 600);
      setScale(fit < 1 ? fit : 1 + (fit - 1) / 2);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    if (step === STEP_USERS && firstInputRef.current)
      firstInputRef.current.focus();
    else if (rootRef.current) rootRef.current.focus();
  }, [step]);

  // ---- the connectivity check runs, then moves along by itself ----
  useEffect(() => {
    if (step !== STEP_NET) return;
    const t = setTimeout(() => setStep(STEP_USERS), 5000);
    return () => clearTimeout(t);
  }, [step]);

  const checking = step === STEP_NET;

  // ---- [Press F1 For] HELP. Once only, like the fight it comes from
  // (F9 replays it for whoever thinks to try). Sparkles travel in from
  // offscreen, the cherub materializes above the cursor (the gif opens on
  // its own materialize frames), follows the cursor while it flaps, heals
  // it, and slips away as its loop runs out. ----
  const [angel, setAngel] = useState(null); // {key} mounts the sprite
  const [heal, setHeal] = useState(null); // mounts the dmgnum, driven by ref
  const angelUsedRef = useRef(false); // F1's single charge
  const angelActiveRef = useRef(false); // a visit can't overlap itself
  const angelElRef = useRef(null);
  const healNumRef = useRef(null);
  const trailElRef = useRef(null);
  const angelRafRef = useRef(null);
  const mouseRef = useRef({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  });
  useEffect(
    () => () => {
      cancelAnimationFrame(angelRafRef.current);
    },
    [],
  );

  // spr_sparestar_anim at 2x, lime-tinted, centered on (x, y). The trail
  // kind plays its six frames once and vanishes, the way obj_animation
  // does for the flight; the heal kind drifts, fades, and spins the way
  // obj_healanim throws its stars around
  const spawnStar = (x, y, opts = {}) => {
    const holder = trailElRef.current;
    if (!holder) return;
    const { life = 0.8, dx = 0, dy = 0, once = false, size = 38 } = opts;
    const star = document.createElement('span');
    star.className = once ? 'oobe__star oobe__star--once' : 'oobe__star';
    star.style.left = `${x - size / 2}px`;
    star.style.top = `${y - size / 2}px`;
    star.style.width = `${size}px`;
    star.style.height = `${size}px`;
    const spin = document.createElement('span');
    if (!once) {
      star.style.setProperty('--dx', `${dx}px`);
      star.style.setProperty('--dy', `${dy}px`);
      star.style.setProperty('--life', `${life}s`);
      spin.style.setProperty('--a0', `${Math.round(Math.random() * 360)}deg`);
    }
    star.appendChild(spin);
    holder.appendChild(star);
    setTimeout(() => star.remove(), (once ? 0.4 : life) * 1000 + 60);
  };

  const summonAngel = (cx, cy, force) => {
    if (angelActiveRef.current || step === STEP_INTRO) return;
    if (!force) {
      if (angelUsedRef.current) return;
      angelUsedRef.current = true;
    }
    angelActiveRef.current = true;
    if (cx != null) mouseRef.current = { x: cx, y: cy };
    playSnd(sparkleSrc, 0.5, 1.12);
    setAngel({ key: Date.now(), arrived: false });
    const z = () => scaleRef.current;
    // the sprite loop runs 1.45s (0.96s of frames + a hold), so the visit
    // is timed to end just before the gif would wrap and re-materialize
    const ARRIVE = 0.7;
    const HEAL = 1.25;
    const NUM_DELAY = 8 / 30; // scr_spamton_heal gives the dmgwriter delay=8
    const HIDE = ARRIVE + 1.26;
    const END = HIDE + 0.5;
    const from = { x: window.innerWidth / z() + 30, y: -40 };
    const pos = { ...from };
    let arrived = false;
    let healed = false;
    let hidden = false;
    let lastSpark = 0;
    let healPt = null;
    let num = null; // obj_dmgwriter type 3, stepped at the game's 30fps
    let numPrev = null; // one step behind, for interpolated rendering
    let numAcc = 0;
    const sparkPhase = Math.random() * Math.PI * 2; // the cherub's `offset`
    const t0 = performance.now();
    let lastNow = t0;
    const tick = now => {
      const t = (now - t0) / 1000;
      const dt = Math.min(0.1, (now - lastNow) / 1000);
      lastNow = now;
      // park the glove of the extended pat frame on the arrow tip so the
      // pat lands on it, and let the float lift him off it
      const tx = mouseRef.current.x / z() - 7;
      const ty =
        mouseRef.current.y / z() -
        46 -
        (arrived ? Math.max(0, Math.sin(t * 9)) * 4 : 0);
      if (!arrived) {
        // sparkle flight: no sprite yet, just the dust
        const k = Math.min(1, t / ARRIVE);
        const e = k * k * (3 - 2 * k);
        pos.x = from.x + (tx - from.x) * e;
        pos.y = from.y + (ty - from.y) * e;
        // stars circling the flight the way obj_spamton_cherub scatters
        // obj_animation stars around itself — twice its cadence and a
        // notch smaller, since this flight crosses the whole screen
        if (now - lastSpark > 33) {
          lastSpark = now;
          const gf = t * 30;
          spawnStar(
            pos.x + 24 + Math.cos(gf / 3 + sparkPhase) * 20,
            pos.y + 23 + Math.sin(gf / 3 + sparkPhase) * 20,
            { once: true, size: 28 },
          );
        }
        if (k >= 1) {
          arrived = true;
          setAngel(a => (a ? { ...a, arrived: true } : a));
        }
      } else {
        pos.x += (tx - pos.x) * 0.2;
        pos.y += (ty - pos.y) * 0.2;
      }
      const el = angelElRef.current;
      if (el) {
        el.style.left = `${pos.x}px`;
        el.style.top = `${pos.y}px`;
        el.style.opacity = arrived && !hidden ? '1' : '0';
      }
      if (!healed && t >= HEAL) {
        healed = true;
        playSnd(powerSrc, 0.5);
        healPt = { x: mouseRef.current.x / z(), y: mouseRef.current.y / z() };
        // obj_healanim: two sparestars a frame for five frames, scattered
        // over the healed target's box (the arrow), each flung up with
        // friction bleeding the speed off
        for (let i = 0; i < 10; i++) {
          const hs = Math.random() * 2;
          const vs = -3 - Math.random() * 2;
          const speed = Math.hypot(hs, vs);
          const sx = healPt.x + Math.random() * 20;
          const sy = healPt.y + Math.random() * 26;
          setTimeout(
            () =>
              spawnStar(sx, sy, {
                dx: (hs * speed) / 0.4,
                dy: (vs * speed) / 0.4,
              }),
            (Math.floor(i / 2) / 30) * 1000,
          );
        }
      }
      if (healed && !num && t >= HEAL + NUM_DELAY) {
        // obj_dmgwriter: right edge 30px out, spawned low on the target,
        // popped up-right and squashed wide, bouncing back onto its line
        num = {
          x: healPt.x,
          y: healPt.y + 8,
          ystart: healPt.y + 8,
          vx: 10,
          vy: -5 - Math.random() * 2,
          bounces: 0,
          stretch: 0.2,
          stretchgo: 1,
          killtimer: 0,
          killactive: false,
          kill: 0,
          dead: false,
        };
        num.vstart = num.vy;
        setHeal(true);
      }
      if (num && !num.dead) {
        numAcc += dt;
        while (numAcc >= 1 / 30 && !num.dead) {
          numAcc -= 1 / 30;
          numPrev = {
            x: num.x,
            y: num.y,
            stretch: num.stretch,
            kill: num.kill,
          };
          num.x += num.vx;
          num.y += num.vy;
          if (num.vx > 0) num.vx -= 1;
          if (num.vx < 0) num.vx += 1;
          if (Math.abs(num.vx) < 1) num.vx = 0;
          if (num.bounces < 2) num.vy += 1;
          if (num.y > num.ystart && num.bounces < 2 && !num.killactive) {
            num.y = num.ystart;
            num.vy = num.vstart / 2;
            num.bounces += 1;
          }
          if (num.bounces >= 2 && !num.killactive) {
            num.vy = 0;
            num.y = num.ystart;
          }
          if (num.stretchgo) {
            num.stretch += 0.4;
            if (num.stretch >= 1.2) {
              num.stretch = 1;
              num.stretchgo = 0;
            }
          }
          num.killtimer += 1;
          if (num.killtimer > 35) num.killactive = true;
          if (num.killactive) {
            num.kill += 0.08;
            num.y -= 4;
          }
          if (num.kill > 1) {
            num.dead = true;
            setHeal(null);
          }
        }
        const nel = healNumRef.current;
        if (nel && !num.dead) {
          // render between the 30fps steps so the pop reads smooth on
          // faster displays
          const p = numPrev || num;
          const a = Math.min(1, numAcc * 30);
          const ix = p.x + (num.x - p.x) * a;
          const iy = p.y + (num.y - p.y) * a;
          const istretch = p.stretch + (num.stretch - p.stretch) * a;
          const ikill = p.kill + (num.kill - p.kill) * a;
          nel.style.left = `${ix + 30 - 40}px`;
          nel.style.top = `${iy}px`;
          nel.style.transform = `scaleX(${2 - istretch}) scaleY(${istretch +
            ikill})`;
          nel.style.opacity = `${Math.max(0, 1 - ikill)}`;
        }
      }
      if (!hidden && t >= HIDE) {
        // his sprite loop simply runs out, like the fight's obj_animation
        hidden = true;
      }
      if (t >= END && (!num || num.dead)) {
        angelActiveRef.current = false;
        setAngel(null);
        setHeal(null);
        return;
      }
      angelRafRef.current = requestAnimationFrame(tick);
    };
    angelRafRef.current = requestAnimationFrame(tick);
  };

  const setName = (i, value) => {
    setNames(prev => prev.map((n, j) => (j === i ? value : n)));
    if (error) setError(null);
  };

  const validateAndCollect = () => {
    const entered = names.map(n => n.trim()).filter(Boolean);
    if (entered.length === 0) {
      setError(
        'Type the name of at least one person who will use this computer.',
      );
      return null;
    }
    const seen = new Set();
    for (const name of entered) {
      if (seen.has(name.toLowerCase())) {
        setError(
          `The name "${name}" is entered more than once. Each user must have a different name.`,
        );
        return null;
      }
      seen.add(name.toLowerCase());
      /*
       * Ask the real validator rather than keeping a second copy of its
       * rules here. The hand-copied version missed the all-dots case, so
       * a name like "..." passed Setup and then failed createUserProfile,
       * finishing OOBE with no accounts and stranding the user on an
       * empty logon screen.
       */
      if (validateFileName(name)) {
        setError(
          `A user's name cannot contain any of the following characters:  \\ / : * ? " < > |`,
        );
        return null;
      }
    }
    return entered;
  };

  const goNext = () => {
    click();
    if (step === STEP_WELCOME) {
      setStep(STEP_LICENCE);
    } else if (step === STEP_LICENCE) {
      setStep(STEP_NET);
    } else if (step === STEP_USERS) {
      if (validateAndCollect()) setStep(STEP_DONE);
    }
  };

  const goBack = () => {
    click();
    setStep(step - 1);
  };

  const skipCheck = () => {
    click();
    setStep(STEP_USERS);
  };

  const finish = () => {
    click();
    const entered = validateAndCollect();
    if (!entered) {
      setStep(STEP_USERS);
      return;
    }
    entered.forEach(name => {
      const res = createUser(name);
      if (!res.ok && res.error !== 'exists') {
        // 'invalid' was pre-checked; 'limit' cannot happen with 5 inputs
      }
    });
    // Seed profile trees now; the first account gets the sample music
    if (vfs.initialized) {
      listUsers().forEach((u, i) => {
        vfs.createUserProfile(u.name);
      });
    }
    setActiveUser(null);
    if (onComplete) onComplete();
  };

  const onKeyDown = e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (step === STEP_INTRO) setStep(STEP_WELCOME);
      else if (step === STEP_LICENCE) setStep(STEP_NET);
      else if (step === STEP_NET) skipCheck();
      else if (step === STEP_DONE) finish();
      else goNext();
    } else if (e.key === 'F1') {
      e.preventDefault();
      summonAngel();
    } else if (e.key === 'F9') {
      // debug replay that shipped on purpose: no once-only cap, and it
      // doesn't spend F1's single charge either
      e.preventDefault();
      summonAngel(null, null, true);
    }
  };

  if (step === STEP_INTRO) {
    return (
      <IntroScreen
        onKeyDown={onKeyDown}
        onPointerDown={() => setStep(STEP_WELCOME)}
        tabIndex={-1}
        ref={rootRef}
      >
        <video
          src={oobeIntroSrc}
          autoPlay
          muted
          playsInline
          onEnded={() => setStep(STEP_WELCOME)}
        />
      </IntroScreen>
    );
  }

  const instruction =
    step === STEP_DONE
      ? 'To start using Windows, click Finish.'
      : 'To continue, click Next.';

  return (
    <Screen
      onKeyDown={onKeyDown}
      onPointerMove={e => {
        mouseRef.current = { x: e.clientX, y: e.clientY };
      }}
      tabIndex={-1}
      ref={rootRef}
      style={{ zoom: scale }}
    >
      <header className="oobe__band oobe__band--top">
        <img src={msLogo} alt="Microsoft Windows XP" className="oobe__logo" />
      </header>

      <div className="oobe__stage">
        {step === STEP_WELCOME && (
          <>
            <h1 className="oobe__title">Welcome to Microsoft Windows</h1>
            <p className="oobe__body">
              Thank you for purchasing Microsoft Windows XP.
            </p>
            <p className="oobe__body">
              Let&apos;s spend a few minutes setting up your computer.
            </p>
          </>
        )}
        {step === STEP_LICENCE && (
          <>
            <h1 className="oobe__title">Your privacy</h1>
            <p className="oobe__body oobe__body--wide">
              Everything you do on this computer stays on it. The files you
              make, the accounts you create and every setting are stored by
              your own browser and are never sent anywhere. There are no
              cookies and nothing is tracked.
            </p>
            <p className="oobe__body oobe__body--wide">
              The guest book is the one exception. If you choose to sign it,
              your entry is sent to a server, and your address is kept for a
              short while to stop spam. You will be told again before that
              happens.
            </p>
            <p className="oobe__body oobe__body--wide">
              The full notice is saved on this computer as privacy.txt in
              My Documents, and can be read at any time.
            </p>
          </>
        )}
        {step === STEP_NET && (
          <>
            <h1 className="oobe__title">Checking your Internet connectivity</h1>
            <p className="oobe__body oobe__body--wide">
              Please wait for a moment while Windows checks to see if this
              computer is already connected to the Internet.
            </p>
            <img
              className="oobe__dialup"
              src={dialupGif}
              alt=""
              draggable={false}
            />
          </>
        )}
        {step === STEP_USERS && (
          <>
            <h1 className="oobe__title">Who will use this computer?</h1>
            <p className="oobe__body oobe__body--wide">
              Type the name of each person who will use this computer. Windows
              will create a separate user account for each person so you can
              personalize the way you want Windows to organize and display
              information, protect your files and computer settings, and
              customize the desktop.
            </p>
            <div className="oobe__users">
              {USER_LABELS.map((label, i) => (
                <label className="oobe__user-row" key={label}>
                  <span>{label}</span>
                  <input
                    id={`oobe-user-${i}`}
                    ref={i === 0 ? firstInputRef : undefined}
                    value={names[i]}
                    onChange={e => setName(i, e.target.value)}
                    maxLength={32}
                    spellCheck={false}
                    autoComplete="off"
                  />
                </label>
              ))}
            </div>
            {error && <p className="oobe__error">{error}</p>}
            <p className="oobe__note">
              These names will appear on the Welcome screen in alphabetical
              order. When you start Windows, simply click your name on the
              Welcome screen to begin. If you want to set passwords and limit
              permissions for each user, or add more user accounts after you
              finish setting up Windows, just click <b>Control Panel</b> on the{' '}
              <b>Start</b> menu, and then click <b>User Accounts</b>.
            </p>
          </>
        )}
        {step === STEP_DONE && (
          <>
            <h1 className="oobe__title">Thank you!</h1>
            <p className="oobe__body">
              Congratulations, you&apos;re ready to go! Your computer is set up
              and ready to use.
            </p>
          </>
        )}

        {!checking && <p className="oobe__instruction">{instruction}</p>}

        <button
          type="button"
          className="oobe__help"
          onClick={e => summonAngel(e.clientX, e.clientY)}
        >
          {helpArt && (
            <img
              src={helpArt}
              alt=""
              width={47}
              height={47}
              draggable={false}
            />
          )}
          <p>
            For help,
            <br />
            click here or press F1.
          </p>
        </button>
      </div>

      <div className="oobe__separator oobe__separator--gold" />
      <footer className="oobe__band oobe__band--bottom">
        <div className="oobe__nav-side">
          {step > STEP_WELCOME && (
            <button type="button" className="oobe__nav" onClick={goBack}>
              <span className="oobe__navbtn oobe__navbtn--back" />
              <span>Back</span>
            </button>
          )}
        </div>
        <div className="oobe__nav-side oobe__nav-side--right">
          {checking && (
            <button type="button" className="oobe__nav" onClick={skipCheck}>
              <span>Skip</span>
              <span className="oobe__navbtn oobe__navbtn--skip" />
            </button>
          )}
          <button
            type="button"
            className={'oobe__nav' + (checking ? ' oobe__nav--off' : '')}
            onClick={checking ? undefined : step < STEP_DONE ? goNext : finish}
            disabled={checking}
          >
            <span>{step < STEP_DONE ? 'Next' : 'Finish'}</span>
            <span className="oobe__navbtn oobe__navbtn--next" />
          </button>
        </div>
      </footer>

      <div className="oobe__trail" ref={trailElRef} />
      {angel && (
        <div className="oobe__angel" ref={angelElRef}>
          {angel.arrived && (
            <img src={`${cherubGif}?r=${angel.key}`} alt="" draggable={false} />
          )}
        </div>
      )}
      {heal && (
        <img
          className="oobe__healnum"
          ref={healNumRef}
          src={heal50Png}
          alt=""
          draggable={false}
        />
      )}
    </Screen>
  );
}

const IntroScreen = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9998;
  outline: none;
  background: #000;

  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const starDrift = keyframes`
  from { transform: translate(0, 0); }
  to { transform: translate(var(--dx), var(--dy)); }
`;

const starFade = keyframes`
  0% { opacity: 1; }
  58% { opacity: 1; }
  100% { opacity: 0; }
`;

const starFrames = keyframes`
  from { background-position-x: 0%; }
  to { background-position-x: 120%; }
`;

const starSpin = keyframes`
  from { transform: rotate(var(--a0)); }
  to { transform: rotate(calc(var(--a0) - 360deg)); }
`;

const Screen = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9998;
  display: flex;
  flex-direction: column;
  outline: none;
  color: #fff;
  overflow: hidden;
  font-family: Tahoma, 'Noto Sans', sans-serif;
  background: #4e6fd6;

  /* ---- Header / footer bands: the real band art up top ---- */
  .oobe__band {
    flex-shrink: 0;
    background: #003399;
  }
  .oobe__band--top {
    height: 56px;
    display: flex;
    align-items: center;
    padding-left: 16px;
    background: url(${headerBg}) no-repeat center / 100% 100%;
  }
  .oobe__separator {
    height: 2px;
    flex-shrink: 0;
  }
  /* Ref: 2px gold line at y=542 above the bottom band */
  .oobe__separator--gold {
    background: #eb913b;
  }
  .oobe__band--bottom {
    height: 54px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 30px;
  }
  .oobe__logo {
    height: 40px;
    image-rendering: auto;
  }

  /* ---- Body: base #4E6FD6, glow top-left, soft wash bottom-right ---- */
  .oobe__stage {
    flex: 1;
    position: relative;
    background: radial-gradient(
        60% 55% at 8% 0%,
        #7ea0e8 0%,
        rgba(126, 160, 232, 0) 60%
      ),
      radial-gradient(
        55% 45% at 100% 100%,
        #6f92e3 0%,
        rgba(111, 146, 227, 0) 55%
      ),
      #4e6fd6;
    overflow: hidden;
  }
  .oobe__title {
    font-family: 'Franklin Gothic Medium', 'Segoe UI', 'Arial Narrow', Tahoma,
      sans-serif;
    font-size: 37px;
    font-weight: 400;
    letter-spacing: 0.2px;
    margin: 19px 0 26px 62px;
    text-shadow: 1px 2px 2px rgba(0, 0, 60, 0.35);
  }
  .oobe__body {
    font-size: 12px;
    line-height: 1.4;
    margin: 0 0 17px 62px;
    max-width: 560px;
  }
  .oobe__body--wide {
    max-width: 660px;
  }
  .oobe__instruction {
    position: absolute;
    left: 62px;
    bottom: 64px;
    margin: 0;
    font-size: 12px;
  }
  .oobe__note {
    font-size: 12px;
    line-height: 1.4;
    margin: 24px 0 0 62px;
    max-width: 660px;
  }
  .oobe__error {
    font-size: 12px;
    color: #ffd24a;
    margin: 12px 0 0 62px;
    max-width: 660px;
  }

  /* the real connectivity artwork, at its native size */
  .oobe__dialup {
    position: absolute;
    left: 250px;
    top: 180px;
    width: 324px;
    height: 72px;
  }

  /* ---- Help orb + caption, bottom right of the stage ---- */
  .oobe__help {
    position: absolute;
    right: 40px;
    bottom: 14px;
    width: 160px;
    text-align: center;
    background: none;
    border: none;
    padding: 0;
    color: inherit;
    font: inherit;
    cursor: pointer;

    img {
      display: block;
      margin: 0 auto 4px;
    }
    p {
      margin: 0;
      font-size: 11px;
      line-height: 15px;
    }
  }

  /* ---- Users form ---- */
  .oobe__users {
    margin: 20px 0 0 62px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .oobe__user-row {
    display: flex;
    align-items: center;
    font-size: 12px;
    span {
      width: 106px;
      flex-shrink: 0;
      text-align: right;
      padding-right: 8px;
      box-sizing: border-box;
    }
    input {
      width: 176px;
      height: 20px;
      background: #fff;
      color: #000;
      border: 1px solid #7f9db9;
      border-radius: 0;
      padding: 2px 4px;
      font-size: 11px;
      font-family: Tahoma, 'Noto Sans', sans-serif;
      outline: none;
      box-sizing: border-box;
    }
  }

  /* ---- Back / Next / Skip: the real three-state arrow buttons ---- */
  .oobe__nav-side {
    min-width: 90px;
  }
  .oobe__nav-side--right {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 26px;
  }
  .oobe__nav {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: none;
    border: none;
    padding: 3px;
    color: #fff;
    cursor: pointer;
    font-family: Tahoma, 'Noto Sans', sans-serif;
    font-size: 11px;

    &:focus {
      outline: 1px dotted rgba(255, 255, 255, 0.7);
    }
  }
  .oobe__navbtn {
    display: block;
    width: 24px;
    height: 24px;
    background: no-repeat center / 100% 100%;
  }
  .oobe__navbtn--next {
    background-image: url(${nextUp});
  }
  .oobe__nav:hover .oobe__navbtn--next {
    background-image: url(${nextOver});
  }
  .oobe__nav:active .oobe__navbtn--next {
    background-image: url(${nextDown});
  }
  .oobe__navbtn--back {
    background-image: url(${backUp});
  }
  .oobe__nav:hover .oobe__navbtn--back {
    background-image: url(${backOver});
  }
  .oobe__nav:active .oobe__navbtn--back {
    background-image: url(${backDown});
  }
  .oobe__navbtn--skip {
    background-image: url(${skipUp});
  }
  .oobe__nav:hover .oobe__navbtn--skip {
    background-image: url(${skipOver});
  }
  .oobe__nav:active .oobe__navbtn--skip {
    background-image: url(${skipDown});
  }
  .oobe__nav--off {
    opacity: 0.45;
    cursor: default;
    &:hover .oobe__navbtn--next {
      background-image: url(${nextUp});
    }
  }

  /* ---- the once-only F1 cherub ---- */
  .oobe__trail {
    position: absolute;
    inset: 0;
    z-index: 20;
    pointer-events: none;
  }
  .oobe__star {
    position: absolute;
    pointer-events: none;
    animation: ${starDrift} var(--life) cubic-bezier(0.2, 0.55, 0.45, 1) both,
      ${starFade} var(--life) linear both;

    > span {
      position: absolute;
      inset: 0;
      background: url(${sparestarPng}) 0 0 no-repeat;
      background-size: 600% 100%;
      image-rendering: pixelated;
      animation: ${starFrames} 0.8s steps(6) infinite,
        ${starSpin} 1.2s linear infinite;
    }
  }
  /* trail stars just play their frames through once, upright */
  .oobe__star--once {
    animation: none;

    > span {
      animation: ${starFrames} 0.4s steps(6) both;
    }
  }
  .oobe__angel {
    position: absolute;
    left: -100px;
    top: -100px;
    width: 48px;
    z-index: 21;
    pointer-events: none;
    opacity: 0;

    img {
      display: block;
      width: 48px;
      image-rendering: pixelated;
    }
  }
  /* the real dmgnum glyphs, image_blend'ed lime; scaled about the
     right-aligned anchor the way draw_text_transformed does */
  .oobe__healnum {
    position: absolute;
    width: 40px;
    height: 20px;
    z-index: 22;
    pointer-events: none;
    opacity: 0;
    image-rendering: pixelated;
    transform-origin: 100% 0;
  }
`;
