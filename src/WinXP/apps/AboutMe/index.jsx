/*
 * webXP Tour (tour.exe) — a native rebuild of "Take a tour of Windows XP"
 * (the Flash mmTour that shipped in C:\WINDOWS\Help\Tours), carrying this
 * site's content instead of Microsoft's marketing.
 *
 * Every piece of chrome here is the real tour's own artwork, extracted from
 * the mmTour SWFs (and the master movie inside tour.exe) with FFDec into
 * src/assets/tour/: the 640x480 stage backdrop, the five flag-colored pill
 * buttons (black is the fifth, straight from the Pro tour's nav), the green
 * home orb, the red X, the music toggle with its real slashed-note "off"
 * glyph, the individual flag panes the intro flies in, the orange "xp"
 * wordmark, the navy content panel, the glossy Basics orbs and the 3D
 * cluster icons. The music is Bill Brown's actual tour score (public/tour/),
 * one track per section, routed through the site mixer via applyVolume.
 *
 * Stage geometry is designed at the window's fixed 640x480.
 */
import React, { useEffect, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';

import { useVolume } from '../../../context/VolumeContext';

import stageBg from 'assets/tour/stage-bg.png';
import pillGold from 'assets/tour/pill-gold.png';
import pillRed from 'assets/tour/pill-red.png';
import pillGreen from 'assets/tour/pill-green.png';
import pillBlue from 'assets/tour/pill-blue.png';
import pillBlack from 'assets/tour/pill-black.png';
import btnHome from 'assets/tour/btn-home.png';
import btnExit from 'assets/tour/btn-exit.png';
import btnMusicBg from 'assets/tour/btn-music-bg.png';
import glyphMusicOn from 'assets/tour/glyph-music-on.png';
import glyphMusicOff from 'assets/tour/glyph-music-off.png';
import xpWordmark from 'assets/tour/xp-wordmark.png';
import echoRed from 'assets/tour/flag-echo-red.png';
import echoOrange from 'assets/tour/flag-echo-orange.png';
import echoGreen from 'assets/tour/flag-echo-green.png';
import echoBlue from 'assets/tour/flag-echo-blue.png';
import echoGold from 'assets/tour/flag-echo-gold.png';
import panelArt from 'assets/tour/panel.png';
import orbDesktop from 'assets/tour/orb-desktop.png';
import orbStart from 'assets/tour/orb-start.png';
import orbWindows from 'assets/tour/orb-windows.png';
import orbFiles from 'assets/tour/orb-files.png';
import orbTaskbar from 'assets/tour/orb-taskbar.png';
import orbPower from 'assets/tour/orb-power.png';
import iconUsers from 'assets/tour/icon-users.png';
import iconKeys from 'assets/tour/icon-keys.png';
import iconProtect from 'assets/tour/icon-protect.png';
import iconPhotos from 'assets/tour/icon-photos.png';
import iconMedia from 'assets/tour/icon-media.png';
import iconGames from 'assets/tour/icon-games.png';
import iconNetwork from 'assets/tour/icon-network.png';

import flagSmall from 'assets/windowsIcons/windows.png';
import flagFull from 'assets/windowsIcons/windows-off.png';
import padlockIcon from 'assets/xp/Padlock.png';
import tourIcon from 'assets/windowsIcons/853(32x32).png';
import starIcon from 'assets/windowsIcons/744(32x32).png';
import mailIcon from 'assets/windowsIcons/mail.png';
import guestBookIcon from 'assets/windowsIcons/ie-book.png';
import pictoChatIcon from 'assets/windowsIcons/pictochat.png';
import shopIcon from 'assets/store/bag.gif';

const BASE = import.meta.env.BASE_URL || '/';

/* ------------------------------------------------------------------ data */

const SECTIONS = [
  {
    id: 'basics',
    label: 'webXP Basics',
    music: 'basics.mp3',
    pill: pillGold,
    layout: 'orbs',
    topics: [
      {
        icon: orbDesktop,
        label: 'The Desktop',
        headline: 'The webXP Desktop',
        body: [
          'This is a working Windows XP desktop, rebuilt for the web. Open programs from the Start menu or the desktop icons, arrange things the way you like, and it all keeps running while you explore.',
        ],
        tip: 'Right-click the desktop for wallpaper and view options.',
      },
      {
        icon: orbStart,
        label: 'The Start Menu',
        headline: 'Everything Starts Here',
        body: [
          'Every program on this computer is in the Start menu: pinned favorites on the left, your folders on the right, and All Programs holding the rest, arranged the way real XP arranged it.',
        ],
        tip: 'Click Start in the corner of the taskbar.',
      },
      {
        icon: orbWindows,
        label: 'Windows',
        headline: 'Move, Size, Minimize, Restore',
        body: [
          'Drag a window by its title bar, resize it from any edge, minimize it to the taskbar or maximize it to fill the screen. Focus, stacking and double-clicks work the way you remember.',
        ],
        tip: 'Double-click a title bar to maximize its window.',
      },
      {
        icon: orbFiles,
        label: 'Files and Folders',
        headline: 'Real Files, Really Saved',
        body: [
          'Drawings, notes and downloads become real files on a real disk, stored by your browser and still here on your next visit.',
          'Explorer browses them, shortcuts point at them, and the Recycle Bin really holds them.',
        ],
        tip: 'Open My Computer and look around.',
      },
      {
        icon: orbTaskbar,
        label: 'The Taskbar',
        headline: 'One Button per Program',
        body: [
          'Running programs line up beside the Start button, ready to bring back with a click. Quick Launch sits on the left; the clock, the volume and the tray live on the right.',
        ],
        tip: 'Right-click the clock to adjust the volume.',
      },
      {
        icon: orbPower,
        label: 'Ending Your Session',
        headline: 'Ending Your Session',
        body: [
          'Log Off saves your place for next time. Switch User leaves your programs running while someone else signs in. Turn Off really shuts the computer down — boot screen and all.',
        ],
        tip: 'Click Start, then Turn Off Computer.',
      },
    ],
  },
  {
    id: 'personal',
    label: 'Safe and Easy Personal Computing',
    music: 'personal.mp3',
    pill: pillRed,
    layout: 'cluster',
    positions: [
      { x: 17, y: 20 },
      { x: 72, y: 18 },
      { x: 30, y: 56 },
      { x: 60, y: 60 },
    ],
    topics: [
      {
        icon: iconUsers,
        label: 'Multiple Users: A Cinch to Switch',
        headline: 'Multiple Users: A Cinch to Switch',
        body: [
          'Make an account for everyone who uses this computer. Each one keeps its own files, wallpaper and settings.',
          'Fast User Switching moves between them without closing a thing — programs keep running in the background.',
        ],
        tip: 'Click Start, Log Off, then Switch User.',
      },
      {
        icon: iconKeys,
        label: 'Passwords and Hints',
        headline: 'Passwords, Pictures and Hints',
        body: [
          'Any account can take a password, with a hint for the day you forget it. A password protects the account itself — nobody else can rename it, delete it or see inside.',
          'Account pictures work too. Set one from any image on the disk.',
        ],
        tip: 'Control Panel, then User Accounts.',
      },
      {
        icon: iconProtect,
        label: 'Data Protection, Inside and Out',
        headline: 'Data Protection, Inside and Out',
        body: [
          'The Backup or Restore Wizard packs the whole machine — files, accounts, settings — into a zip you keep, and restores it anywhere.',
          'If an update ever changes the disk format, a recovery screen protects your files before anything else happens.',
        ],
        tip: 'Start, All Programs, Accessories, System Tools.',
      },
      {
        icon: padlockIcon,
        label: 'Nothing Leaves Your Computer',
        headline: 'Nothing Leaves Your Computer',
        body: [
          'Everything you make is stored by your own browser, on your own machine. No sign-ups, no analytics, no tracking.',
          'The one thing that ever leaves is a guest book entry you choose to send — and it asks first.',
        ],
        tip: 'Read privacy.txt in My Documents for the details.',
      },
    ],
  },
  {
    id: 'media',
    label: 'Unlock the World of Digital Media',
    music: 'media.mp3',
    pill: pillGreen,
    layout: 'cluster',
    positions: [
      { x: 20, y: 22 },
      { x: 47, y: 52 },
      { x: 74, y: 22 },
    ],
    topics: [
      {
        icon: iconMedia,
        label: 'Playing Music, Video, CDs',
        headline: 'Playing Music, Video, CDs',
        body: [
          'Windows Media Player 8, rebuilt from its real skin, plays the music and video on this computer, playlists and library included.',
          'Prefer the classics? Winamp is one download away in the XP Shop, skins and visualizer intact.',
        ],
        tip: 'My Music already has something to play.',
      },
      {
        icon: iconPhotos,
        label: 'Pictures and Paint',
        headline: 'Pictures, Paint and the Fax Viewer',
        body: [
          'Paint draws and saves real image files, and opens the ones you bring. The Picture and Fax Viewer shows them with the real toolbar.',
          'A picture you like can become your wallpaper or your account photo.',
        ],
        tip: 'Save something in Paint, then check My Pictures.',
      },
      {
        icon: iconGames,
        label: 'Optimized for Games',
        headline: 'Optimized for Games',
        body: [
          'Minesweeper, Solitaire and 3D Pinball: Space Cadet are already installed and fully playable.',
          'The XP Shop has more — puzzle games, wall-climbing races, even games that play online.',
        ],
        tip: 'Start, All Programs, Games.',
      },
    ],
  },
  {
    id: 'connected',
    label: 'The Connected Desktop',
    music: 'connected.mp3',
    pill: pillBlue,
    layout: 'cluster',
    positions: [
      { x: 17, y: 20 },
      { x: 72, y: 18 },
      { x: 30, y: 56 },
      { x: 60, y: 60 },
    ],
    topics: [
      {
        icon: guestBookIcon,
        label: 'Sign the Guest Book',
        headline: 'Sign the Guest Book',
        body: [
          'Leave a note for whoever visits next. Entries are plain text and get checked before they appear.',
          'It is the one part of this computer with a server behind it — everything else is yours alone.',
        ],
        tip: 'The Guest Book is in the Start menu.',
      },
      {
        icon: pictoChatIcon,
        label: 'PictoChat, Live',
        headline: 'PictoChat, Live',
        body: [
          'The Nintendo DS chat room, running for real. Pick a room and say it in doodles — anyone else visiting the site can be in there with you.',
        ],
        tip: 'Chat Room A is usually the busy one.',
      },
      {
        icon: iconNetwork,
        label: 'The World Wide Web',
        headline: 'The World Wide Web',
        body: [
          'Internet Explorer opens real web pages in a window on this desktop, with an address bar, history, and Back where it belongs.',
        ],
        tip: 'Some sites refuse to be framed. IE soldiers on.',
      },
      {
        icon: shopIcon,
        label: 'The XP Shop',
        headline: 'The XP Shop',
        body: [
          'A rebuild of the Wii Shop Channel from preserved pages of the real one. Programs install and uninstall live; music and extras download into your own folders.',
          'Some titles cost XP Points. Games pay them out.',
        ],
        tip: 'The shopping bag is on the desktop.',
      },
    ],
  },
  {
    id: 'about',
    label: 'About webXP',
    music: 'about.mp3',
    pill: pillBlack,
    layout: 'cluster',
    positions: [
      { x: 20, y: 22 },
      { x: 47, y: 52 },
      { x: 74, y: 22 },
    ],
    topics: [
      {
        icon: tourIcon,
        label: 'A Fan Recreation',
        headline: 'A Fan Recreation',
        body: [
          'webXP is a fan recreation of Microsoft Windows XP as a website, grown from ShizukuIchi\u2019s open-source winXP project.',
          'It is MIT licensed, non-commercial, and not affiliated with Microsoft. The source is on GitHub.',
        ],
        tip: 'webxp.net — also served at aduncan.dev.',
      },
      {
        icon: starIcon,
        label: 'Credits',
        headline: 'Standing on Real Work',
        body: [
          'Webamp by Jordan Eldredge. 3D Pinball via 98.js.org. Voltorb Flip from steiner26. PictoChat runs ayunami2000\u2019s ayunpictojava. Mario vs Luigi by ipodtouch0218. Wii Shop pages preserved by wiishopchannel.net.',
          'This tour\u2019s look and music come from the real Windows XP Tour — score by Bill Brown. Windows XP belongs to Microsoft; Nintendo\u2019s things belong to Nintendo.',
        ],
        tip: 'The full list is in the README on GitHub.',
      },
      {
        icon: mailIcon,
        label: 'Get in Touch',
        headline: 'Get in Touch',
        body: [
          'Find the project on GitHub at github.com/aduncandev, or sign the guest book right here on the desktop.',
          'Email reaches the webmaster at aduncandev@proton.me.',
        ],
        tip: 'Bug reports welcome. Screenshots help.',
      },
    ],
  },
];

/* ------------------------------------------------------------- component */

function AboutMe({ onClose }) {
  const { applyVolume } = useVolume();
  // 'intro' | 'menu' | section index
  const [mode, setMode] = useState('intro');
  // menu attract-loop highlight
  const [spot, setSpot] = useState(0);
  const [pinned, setPinned] = useState(null);
  // open topic within a section, null = section attract screen
  const [topic, setTopic] = useState(null);
  const [musicOn, setMusicOn] = useState(true);

  const audioRef = useRef(null);
  const section = typeof mode === 'number' ? SECTIONS[mode] : null;

  /* Music: one element, one track per screen, looping through the mixer. */
  useEffect(() => {
    const audio = new Audio();
    audio.loop = true;
    audioRef.current = audio;
    applyVolume(audio);
    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [applyVolume]);

  const track = section ? section.music : 'intro.mp3';
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = `${BASE}tour/${track}`;
    if (musicOn) {
      // Autoplay can be refused before the page has a user gesture; the
      // toggle button then starts it by hand.
      audio.play().catch(() => setMusicOn(false));
    }
  }, [track, musicOn]);

  /* Menu attract loop: highlight each pill in turn until one is hovered. */
  useEffect(() => {
    if (mode !== 'menu' || pinned !== null) return undefined;
    const t = setInterval(() => setSpot(s => (s + 1) % SECTIONS.length), 2600);
    return () => clearInterval(t);
  }, [mode, pinned]);

  /* Intro runs itself; Skip Intro cuts it short. */
  useEffect(() => {
    if (mode !== 'intro') return undefined;
    const t = setTimeout(() => setMode('menu'), 4000);
    return () => clearTimeout(t);
  }, [mode]);

  const highlighted = pinned !== null ? pinned : spot;

  const toggleMusic = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (musicOn) {
      audio.pause();
      setMusicOn(false);
    } else {
      audio.play().catch(() => {});
      setMusicOn(true);
    }
  };

  const openSection = i => {
    setTopic(null);
    setMode(i);
  };

  /* ------------------------------------------------------------ screens */

  const pills = (
    <div className="pills">
      {SECTIONS.map((s, i) => {
        const active = mode === 'menu' ? highlighted === i : mode === i;
        return (
          <button
            key={s.id}
            className={'pill' + (active ? ' pill--active' : '')}
            style={{ animationDelay: `${i * 90}ms` }}
            title={s.label}
            onMouseEnter={mode === 'menu' ? () => setPinned(i) : undefined}
            onMouseLeave={mode === 'menu' ? () => setPinned(null) : undefined}
            onClick={() => openSection(i)}
          >
            <img src={s.pill} alt="" draggable={false} />
          </button>
        );
      })}
      {(mode === 'menu' || section) && (
        <div className="pill-label">
          {mode === 'menu' ? SECTIONS[highlighted].label : section.label}
        </div>
      )}
    </div>
  );

  const header = (
    <div className="header">
      <div className="brand">
        <img
          className="brand-flag"
          src={flagSmall}
          alt=""
          draggable={false}
        />
        <span className="brand-web">web</span>
        <img className="brand-xp" src={xpWordmark} alt="xp" draggable={false} />
      </div>
      {pills}
    </div>
  );

  const menuScreen = (
    <>
      {header}
      <div className="attract-hint">To begin the Tour, click a button.</div>
      <div className="menu-preview" key={highlighted}>
        {SECTIONS[highlighted].topics.slice(0, 4).map(t => (
          <div className="preview-item" key={t.label}>
            <img src={t.icon} alt="" draggable={false} />
          </div>
        ))}
      </div>
    </>
  );

  const sectionAttract = section && (
    <>
      {header}
      {section.layout === 'orbs' ? (
        <>
          <div className="attract-hint attract-hint--mid">
            To continue the Tour, click an icon.
          </div>
          <div className="orb-row">
            {section.topics.map((t, i) => (
              <button
                key={t.label}
                className="orb"
                title={t.label}
                onClick={() => setTopic(i)}
              >
                <img src={t.icon} alt="" draggable={false} />
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          {section.topics.map((t, i) => (
            <button
              key={t.label}
              className="cluster"
              style={{
                left: `${section.positions[i].x}%`,
                top: `${section.positions[i].y}%`,
              }}
              onClick={() => setTopic(i)}
            >
              <img src={t.icon} alt="" draggable={false} />
              <span>{t.label}</span>
            </button>
          ))}
          <div className="attract-hint attract-hint--low">
            To continue the Tour, click an icon.
          </div>
        </>
      )}
    </>
  );

  const openTopic = section && topic !== null ? section.topics[topic] : null;

  const topicScreen = openTopic && (
    <>
      {header}
      <div className="info-col">
        <b>Try it yourself:</b>
        <p>{openTopic.tip}</p>
      </div>
      <div className="panel">
        <img className="panel-art" src={panelArt} alt="" draggable={false} />
        <div className="panel-text">
          {openTopic.body.map(p => (
            <p key={p.slice(0, 24)}>{p}</p>
          ))}
        </div>
      </div>
      <div className="side-icon">
        <img src={openTopic.icon} alt="" draggable={false} />
      </div>
      <div className="topic-row">
        {section.topics.map((t, i) => (
          <button
            key={t.label}
            className={
              'topic-dot' + (i === topic ? ' topic-dot--current' : '')
            }
            title={t.label}
            onClick={() => setTopic(i)}
          >
            <img src={t.icon} alt="" draggable={false} />
          </button>
        ))}
      </div>
    </>
  );

  const introScreen = (
    <div className="intro" onDoubleClick={() => setMode('menu')}>
      <div className="intro-lockup">
        <div className="intro-flag">
          <img className="echo echo-red" src={echoRed} alt="" />
          <img className="echo echo-orange" src={echoOrange} alt="" />
          <img className="echo echo-green" src={echoGreen} alt="" />
          <img className="echo echo-blue" src={echoBlue} alt="" />
          <img className="echo echo-gold" src={echoGold} alt="" />
          <img className="iflag" src={flagFull} alt="" draggable={false} />
          <img
            className="iflag iflag--mirror"
            src={flagFull}
            alt=""
            draggable={false}
          />
        </div>
        <div className="intro-word">
          <span className="brand-web">web</span>
          <img className="brand-xp" src={xpWordmark} alt="xp" />
        </div>
      </div>
      <div className="intro-title">Take a tour of webXP</div>
    </div>
  );

  /* -------------------------------------------------------------- shell */

  return (
    <Shell>
      <div className="stage">
        {mode === 'intro' && introScreen}
        {mode === 'menu' && menuScreen}
        {section && topic === null && sectionAttract}
        {section && topicScreen}
        {mode === 'intro' && (
          <button className="skip" onClick={() => setMode('menu')}>
            Skip Intro
          </button>
        )}
      </div>
      <div className="bar">
        <div className="bar-side">
          {section && (
            <button
              className="btn"
              title="Back to the beginning"
              onClick={() => {
                setTopic(null);
                setMode('menu');
              }}
            >
              <img src={btnHome} alt="" draggable={false} />
            </button>
          )}
        </div>
        <div className="bar-title">{openTopic ? openTopic.headline : ''}</div>
        <div className="bar-side bar-side--right">
          <button className="btn" title="Exit Tour" onClick={onClose}>
            <img src={btnExit} alt="" draggable={false} />
          </button>
          <button
            className="btn btn--music"
            title={musicOn ? 'Music Off' : 'Music On'}
            onClick={toggleMusic}
          >
            <img src={btnMusicBg} alt="" draggable={false} />
            <img
              className="music-glyph"
              src={musicOn ? glyphMusicOn : glyphMusicOff}
              alt=""
              draggable={false}
            />
          </button>
        </div>
      </div>
    </Shell>
  );
}

/* -------------------------------------------------------------- styling */

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const pillDrop = keyframes`
  from { opacity: 0; transform: translate(30px, -34px); }
  to { opacity: 1; transform: translate(0, 0); }
`;

const paneFly = (x, y, r) => keyframes`
  from { opacity: 0; transform: translate(${x}px, ${y}px) rotate(${r}deg); }
  55% { opacity: 1; }
  85% { opacity: 1; }
  to { opacity: 0; transform: translate(0, 0) rotate(0); }
`;

const flagSettle = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const Shell = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  user-select: none;
  font-family: Tahoma, 'Noto Sans', sans-serif;
  background: #fff;
  color: #222;

  .stage {
    position: relative;
    flex: 1;
    min-height: 0;
    overflow: hidden;
    background: #fff url(${stageBg}) center / cover no-repeat;
  }

  /* ------------------------------------------------------------- header */
  .header {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 96px;
  }
  .brand {
    position: absolute;
    top: 12px;
    left: 18px;
    display: flex;
    align-items: baseline;
    animation: ${fadeIn} 300ms ease-out;
  }
  .brand-flag {
    width: 39px;
    height: 22px;
    align-self: center;
    margin-right: 7px;
    filter: drop-shadow(1px 1px 1px rgba(20, 30, 80, 0.35));
  }
  .brand-web {
    font-family: 'Franklin Gothic Medium', 'Segoe UI', 'Arial Narrow', Tahoma,
      sans-serif;
    font-size: 27px;
    letter-spacing: -0.5px;
    color: #16181c;
  }
  .brand-xp {
    width: 27px;
    margin-left: 2px;
    transform: translateY(-8px);
  }

  .pills {
    position: absolute;
    top: 10px;
    right: 14px;
    display: flex;
    align-items: flex-start;
    gap: 5px;
  }
  .pill {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    animation: ${pillDrop} 360ms ease-out both;
    transition: transform 160ms ease, filter 160ms ease;
    img {
      display: block;
      width: 44px;
      height: 21px;
    }
    &:hover {
      filter: brightness(1.08);
    }
  }
  .pill--active {
    transform: scale(1.3) translateY(4px);
  }
  .pill-label {
    position: absolute;
    top: 40px;
    right: 0;
    white-space: nowrap;
    background: #fbf6e1;
    border: 1px solid #c9b98a;
    box-shadow: 1px 2px 3px rgba(30, 40, 90, 0.25);
    padding: 3px 9px;
    font-size: 11px;
    font-weight: bold;
    color: #1c2f6e;
    animation: ${fadeIn} 200ms ease-out;
  }

  /* -------------------------------------------------------------- menu */
  .attract-hint {
    position: absolute;
    top: 42%;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 15px;
    font-weight: bold;
    color: #3050c8;
    text-shadow: 1px 1px 0 rgba(255, 255, 255, 0.8);
    animation: ${fadeIn} 400ms ease-out;
  }
  .attract-hint--mid {
    top: 62%;
  }
  .attract-hint--low {
    top: auto;
    bottom: 10%;
  }
  .menu-preview {
    position: absolute;
    top: 55%;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    align-items: flex-end;
    gap: 30px;
    animation: ${fadeUp} 420ms ease-out;
  }
  .preview-item img {
    max-width: 52px;
    max-height: 52px;
    object-fit: contain;
    filter: drop-shadow(2px 3px 3px rgba(40, 50, 100, 0.25));
  }

  /* ---------------------------------------------------- section attract */
  .cluster {
    position: absolute;
    width: 116px;
    margin-left: -58px;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    text-align: center;
    animation: ${fadeUp} 360ms ease-out;
    img {
      max-width: 58px;
      max-height: 58px;
      object-fit: contain;
      filter: drop-shadow(2px 4px 4px rgba(40, 50, 100, 0.3));
      transition: transform 140ms ease;
    }
    span {
      display: block;
      margin-top: 3px;
      font-size: 10px;
      font-weight: bold;
      line-height: 12px;
      color: #c34a12;
    }
    &:hover img {
      transform: scale(1.12);
    }
  }

  .orb-row {
    position: absolute;
    top: 46%;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    gap: 13px;
    animation: ${fadeUp} 360ms ease-out;
  }
  .orb {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    transition: transform 140ms ease, filter 140ms ease;
    img {
      display: block;
      width: 41px;
      height: 41px;
    }
    &:hover {
      transform: scale(1.18);
      filter: brightness(1.06);
    }
  }

  /* -------------------------------------------------------- topic view */
  .info-col {
    position: absolute;
    left: 22px;
    top: 150px;
    width: 104px;
    font-size: 10px;
    line-height: 14px;
    color: #555;
    animation: ${fadeIn} 300ms ease-out;
    b {
      display: block;
      margin-bottom: 4px;
      color: #333;
    }
    p {
      margin: 0;
    }
  }
  .panel {
    position: absolute;
    left: 50%;
    top: 108px;
    transform: translateX(-56%);
    width: 336px;
    height: 224px;
    animation: ${fadeUp} 300ms ease-out;
  }
  .panel-art {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  .panel-text {
    position: absolute;
    inset: 0;
    padding: 22px 24px;
    color: #fff;
    font-size: 11px;
    line-height: 16px;
    p {
      margin: 0 0 10px;
    }
    p:last-child {
      margin-bottom: 0;
    }
  }
  .side-icon {
    position: absolute;
    right: 30px;
    top: 172px;
    animation: ${fadeIn} 380ms ease-out;
    img {
      max-width: 62px;
      max-height: 62px;
      object-fit: contain;
      filter: drop-shadow(3px 5px 5px rgba(40, 50, 100, 0.35));
    }
  }
  .topic-row {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 16px;
    display: flex;
    justify-content: center;
    align-items: flex-end;
    gap: 10px;
  }
  .topic-dot {
    background: none;
    border: none;
    padding: 2px;
    cursor: pointer;
    border-radius: 4px;
    transition: transform 140ms ease;
    img {
      display: block;
      max-width: 26px;
      max-height: 26px;
      object-fit: contain;
      opacity: 0.75;
    }
    &:hover {
      transform: scale(1.15);
      img {
        opacity: 1;
      }
    }
  }
  .topic-dot--current img {
    opacity: 1;
    filter: drop-shadow(0 0 3px rgba(232, 112, 26, 0.9));
  }

  /* -------------------------------------------------------------- intro */
  .intro {
    position: absolute;
    inset: 0;
  }
  .intro-lockup {
    position: absolute;
    top: 40%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .intro-flag {
    position: relative;
    width: 86px;
    height: 76px;
  }
  /* The real intro's colored whole-flag ghosts, swooping in along the arcs
     and converging into the finished flag. */
  .echo {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 78px;
    margin: -34px 0 0 -39px;
    object-fit: contain;
  }
  .echo-red {
    animation: ${paneFly(-240, -110, -14)} 1050ms ease-out both;
    animation-delay: 80ms;
  }
  .echo-orange {
    animation: ${paneFly(250, -90, 12)} 1050ms ease-out both;
    animation-delay: 320ms;
  }
  .echo-green {
    animation: ${paneFly(-250, 100, 10)} 1050ms ease-out both;
    animation-delay: 560ms;
  }
  .echo-blue {
    animation: ${paneFly(240, 120, -10)} 1050ms ease-out both;
    animation-delay: 800ms;
  }
  .echo-gold {
    animation: ${paneFly(0, -170, 6)} 1050ms ease-out both;
    animation-delay: 1040ms;
  }
  .iflag {
    position: absolute;
    inset: 0;
    width: 86px;
    height: 69px;
    object-fit: contain;
    animation: ${flagSettle} 500ms ease-out both;
    animation-delay: 1900ms;
  }
  .iflag--mirror {
    top: 100%;
    transform: scaleY(-1);
    opacity: 0.25;
    -webkit-mask-image: linear-gradient(
      0deg,
      rgba(0, 0, 0, 0.5) 0%,
      transparent 55%
    );
    mask-image: linear-gradient(0deg, rgba(0, 0, 0, 0.5) 0%, transparent 55%);
  }
  .intro-word {
    display: flex;
    align-items: baseline;
    animation: ${fadeIn} 600ms ease-out both;
    animation-delay: 2200ms;
    .brand-web {
      font-size: 52px;
    }
    .brand-xp {
      width: 50px;
      transform: translateY(-16px);
      margin-left: 3px;
    }
  }
  .intro-title {
    position: absolute;
    top: 60%;
    left: 0;
    right: 0;
    text-align: center;
    font-family: 'Franklin Gothic Medium', 'Segoe UI', 'Arial Narrow', Tahoma,
      sans-serif;
    font-size: 17px;
    color: #45557a;
    animation: ${fadeUp} 500ms ease-out both;
    animation-delay: 2700ms;
  }
  .skip {
    position: absolute;
    left: 26px;
    bottom: 14px;
    background: none;
    border: none;
    padding: 2px;
    cursor: pointer;
    font-family: inherit;
    font-size: 12px;
    font-weight: bold;
    color: #3050c8;
    &:hover {
      text-decoration: underline;
    }
  }

  /* ---------------------------------------------------------- bottom bar */
  .bar {
    flex-shrink: 0;
    height: 30px;
    background: linear-gradient(180deg, #7490e2 0%, #5b79d6 40%, #4e6ccb 100%);
    border-top: 1px solid #93aaee;
    display: flex;
    align-items: center;
    padding: 0 7px;
    gap: 8px;
  }
  .bar-side {
    width: 58px;
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .bar-side--right {
    justify-content: flex-end;
  }
  .bar-title {
    flex: 1;
    text-align: center;
    font-size: 14px;
    font-weight: bold;
    color: #fff;
    text-shadow: 1px 1px 1px rgba(20, 30, 80, 0.5);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .btn {
    position: relative;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    img {
      display: block;
      width: 23px;
      height: 23px;
    }
    &:hover {
      filter: brightness(1.12);
    }
    &:active {
      transform: translateY(1px);
    }
  }
  .btn--music .music-glyph {
    position: absolute;
    inset: 0;
    width: 23px;
    height: 23px;
  }
`;

export default AboutMe;
