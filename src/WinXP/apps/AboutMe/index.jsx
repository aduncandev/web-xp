/*
 * aduncan.dev Tour (tour.exe) — the site's About page, dressed as the real
 * "Take a tour of Windows XP" experience: the OOBE deep-blue stage, Franklin
 * Gothic headlines, #003399 bands with the gold rule, and the genuine green
 * arrow / help-orb art from C:\WINDOWS\system32\oobe. A title screen offers
 * the sections; each section is a short deck of pages walked with Back/Next.
 *
 * All copy lives in SECTIONS below — edit there, the chrome adapts.
 */
import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';

import xpLogo from 'assets/windowsIcons/xplogo.png';
import nextArrow from 'assets/xp/oobe-next.png';
import helpOrb from 'assets/xp/oobe-help.png';

const SECTIONS = [
  {
    id: 'basics',
    label: 'Desktop Basics',
    pages: [
      {
        title: 'Have a look around',
        body: (
          <>
            <p>
              This is a full Windows XP desktop. Open things from the Start
              button, drag windows around, stack them, minimize them to the
              taskbar.
            </p>
            <p>
              Right-click works too. Try it on the desktop, on files, on just
              about anything.
            </p>
            <p className="tour__hint">
              Click the green arrow to keep going, or Home to pick another
              section.
            </p>
          </>
        ),
      },
      {
        title: 'The programs',
        body: (
          <>
            <ul>
              <li>
                <b>Paint</b>, <b>Notepad</b> and <b>Minesweeper</b> work like
                you remember.
              </li>
              <li>
                <b>Winamp</b> and <b>Windows Media Player</b> play whatever is
                in My Music.
              </li>
              <li>
                <b>Internet Explorer</b> browses the real web, for better or
                worse.
              </li>
              <li>
                <b>Task Manager</b> can end anything that misbehaves. You might
                need it someday.
              </li>
            </ul>
          </>
        ),
      },
    ],
  },
  {
    id: 'files',
    label: 'Your Files',
    pages: [
      {
        title: 'They are real files',
        body: (
          <>
            <p>
              Anything you save here (a drawing, a note, a download) becomes a
              real file in a real filesystem. It lives in your browser and will
              still be here next visit.
            </p>
            <p>
              Browse it all in My Computer, zip things up, set a picture as your
              account photo. If you want a copy of everything, there is a Backup
              tool under Start &gt; All Programs &gt; Accessories &gt; System
              Tools.
            </p>
          </>
        ),
      },
    ],
  },
  {
    id: 'shop',
    label: 'The XP Shop',
    pages: [
      {
        title: 'Free stuff',
        body: (
          <>
            <p>
              The XP Shop on the desktop has extra games, software and music to
              download. Most of it is free.
            </p>
            <p>
              Some titles cost XP Points. The shop will tell you how to earn
              those. More or less.
            </p>
          </>
        ),
      },
    ],
  },
  {
    id: 'about',
    label: 'About This Site',
    pages: [
      {
        title: 'About this site',
        body: (
          <>
            <p>
              Made by Aaron Duncan, using the real XP and Wii Shop assets
              wherever possible.
            </p>
            <ul>
              <li>
                GitHub:{' '}
                <a
                  href="https://github.com/aduncandev"
                  target="_blank"
                  rel="noreferrer"
                >
                  github.com/aduncandev
                </a>
              </li>
              <li>
                E-mail:{' '}
                <a href="mailto:aduncandev@proton.me">aduncandev@proton.me</a>
              </li>
            </ul>
          </>
        ),
      },
      {
        title: 'Credits',
        body: (
          <>
            <p>This computer stands on other people's work:</p>
            <ul>
              <li>
                <b>winXP</b> by{' '}
                <a
                  href="https://github.com/ShizukuIchi/winXP"
                  target="_blank"
                  rel="noreferrer"
                >
                  ShizukuIchi
                </a>
                , the open source project this site grew from.
              </li>
              <li>
                <b>Webamp</b> by Jordan Eldredge. The <b>Pipes</b> screensaver
                by Isaiah Odhner. <b>3D Pinball</b> via 98.js.org.
              </li>
              <li>
                <b>Voltorb Flip</b> is built on steiner26's web version.{' '}
                <b>PictoChat</b> runs ayunami2000's ayunpictojava.
              </li>
              <li>
                <b>Mario vs Luigi</b> by ipodtouch0218 and contributors.
              </li>
              <li>
                Wii Shop pages and art preserved by{' '}
                <a
                  href="https://wiishopchannel.net"
                  target="_blank"
                  rel="noreferrer"
                >
                  wiishopchannel.net
                </a>
                .
              </li>
              <li>
                Windows XP belongs to Microsoft. The Wii Shop, Mario, PictoChat
                and Voltorb Flip belong to Nintendo. The dog belongs to Toby
                Fox.
              </li>
            </ul>
            <p>
              This is a non-commercial fan tribute. The full list lives in the
              README on GitHub.
            </p>
            <p className="tour__hint">Thanks for looking around.</p>
          </>
        ),
      },
    ],
  },
];

function AboutMe({ onClose }) {
  // null = title screen; otherwise { section: index, page: index }
  const [at, setAt] = useState(null);

  const section = at ? SECTIONS[at.section] : null;
  const page = section ? section.pages[at.page] : null;

  const goNext = () => {
    if (!at) return;
    if (at.page + 1 < section.pages.length) {
      setAt({ ...at, page: at.page + 1 });
    } else if (at.section + 1 < SECTIONS.length) {
      setAt({ section: at.section + 1, page: 0 });
    } else {
      setAt(null); // the tour wraps home
    }
  };
  const goBack = () => {
    if (!at) return;
    if (at.page > 0) setAt({ ...at, page: at.page - 1 });
    else setAt(null);
  };

  return (
    <Shell>
      <div className="tour__band tour__band--top">
        <img src={xpLogo} alt="" className="tour__logo" draggable={false} />
        <span className="tour__brand">aduncan.dev Tour</span>
      </div>
      <div className="tour__rule tour__rule--light" />

      {at === null ? (
        <div className="tour__stage" key="home">
          <h1 className="tour__title">
            Welcome to the
            <br />
            aduncan.dev Tour
          </h1>
          <p className="tour__lead">
            A quick look at what this computer can do. Pick a section to begin.
          </p>
          <div className="tour__menu">
            {SECTIONS.map((s, i) => (
              <button
                key={s.id}
                className="tour__pill"
                onClick={() => setAt({ section: i, page: 0 })}
              >
                <img src={nextArrow} alt="" draggable={false} />
                <span>{s.label}</span>
              </button>
            ))}
          </div>
          <div className="tour__orb">
            <img src={helpOrb} alt="" width={40} draggable={false} />
            <p>
              Everything on this desktop is interactive. The tour just points.
            </p>
          </div>
        </div>
      ) : (
        <div className="tour__stage" key={`${at.section}-${at.page}`}>
          <div className="tour__crumb">{section.label}</div>
          <h1 className="tour__title tour__title--page">{page.title}</h1>
          <div className="tour__body">{page.body}</div>
          <div className="tour__count">
            {at.page + 1} of {section.pages.length}
          </div>
        </div>
      )}

      <div className="tour__rule tour__rule--gold" />
      <div className="tour__band tour__band--bottom">
        <button className="tour__nav" onClick={onClose}>
          Exit Tour
        </button>
        {at !== null && (
          <div className="tour__nav-group">
            <button className="tour__nav" onClick={() => setAt(null)}>
              Home
            </button>
            <button className="tour__nav" onClick={goBack}>
              <img
                src={nextArrow}
                alt=""
                className="tour__arrow tour__arrow--back"
                draggable={false}
              />
              Back
            </button>
            <button className="tour__nav" onClick={goNext}>
              Next
              <img
                src={nextArrow}
                alt=""
                className="tour__arrow"
                draggable={false}
              />
            </button>
          </div>
        )}
      </div>
    </Shell>
  );
}

const rise = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Shell = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: #fff;
  font-family: Tahoma, 'Noto Sans', sans-serif;
  font-size: 12px;
  user-select: none;

  .tour__band {
    flex-shrink: 0;
    background: #003399;
    display: flex;
    align-items: center;
  }
  .tour__band--top {
    height: 44px;
    padding-left: 14px;
    gap: 10px;
  }
  .tour__band--bottom {
    height: 44px;
    justify-content: space-between;
    padding: 0 16px;
  }
  .tour__logo {
    height: 30px;
  }
  .tour__brand {
    font-family: 'Franklin Gothic Medium', 'Segoe UI', 'Arial Narrow', Tahoma,
      sans-serif;
    font-size: 16px;
    letter-spacing: 0.3px;
    text-shadow: 1px 1px 2px rgba(0, 0, 60, 0.4);
  }
  .tour__rule {
    height: 2px;
    flex-shrink: 0;
  }
  .tour__rule--light {
    background: #adc8f7;
  }
  .tour__rule--gold {
    background: #eb913b;
  }

  /* The OOBE stage: base blue, glow upper-left, wash lower-right */
  .tour__stage {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    position: relative;
    padding: 18px 30px 34px;
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
    animation: ${rise} 260ms ease-out;
  }

  .tour__title {
    font-family: 'Franklin Gothic Medium', 'Segoe UI', 'Arial Narrow', Tahoma,
      sans-serif;
    font-weight: 400;
    font-size: 30px;
    line-height: 1.15;
    margin: 6px 0 14px;
    text-shadow: 1px 2px 2px rgba(0, 0, 60, 0.35);
  }
  .tour__title--page {
    font-size: 26px;
  }
  .tour__crumb {
    font-size: 11px;
    color: #ffd24a;
    letter-spacing: 0.4px;
  }
  .tour__lead {
    max-width: 420px;
    line-height: 1.5;
    margin: 0 0 20px;
  }

  .tour__menu {
    display: flex;
    flex-direction: column;
    gap: 9px;
    max-width: 330px;
  }
  .tour__pill {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 12px;
    font: inherit;
    color: #fff;
    text-align: left;
    cursor: pointer;
    border: 1px solid rgba(255, 255, 255, 0.45);
    border-radius: 14px;
    background: linear-gradient(
      to bottom,
      rgba(255, 255, 255, 0.28) 0%,
      rgba(255, 255, 255, 0.08) 45%,
      rgba(0, 20, 90, 0.18) 55%,
      rgba(255, 255, 255, 0.06) 100%
    );
    box-shadow: 0 1px 3px rgba(0, 0, 60, 0.35);
    img {
      width: 22px;
      height: 22px;
    }
    &:hover {
      border-color: #ffd24a;
      background: linear-gradient(
        to bottom,
        rgba(255, 255, 255, 0.38) 0%,
        rgba(255, 255, 255, 0.14) 45%,
        rgba(0, 20, 90, 0.14) 55%,
        rgba(255, 255, 255, 0.1) 100%
      );
    }
    &:active {
      transform: translateY(1px);
    }
  }

  .tour__body {
    max-width: 470px;
    line-height: 1.55;
    p {
      margin: 0 0 12px;
    }
    ul {
      margin: 0 0 12px;
      padding-left: 18px;
    }
    li {
      margin-bottom: 8px;
    }
    b {
      color: #ffd24a;
      font-weight: bold;
    }
    a {
      color: #ffd24a;
    }
  }
  .tour__hint {
    color: #cfe0ff;
    font-size: 11px;
  }
  .tour__count {
    position: absolute;
    right: 30px;
    bottom: 12px;
    font-size: 11px;
    color: #cfe0ff;
  }

  .tour__orb {
    margin: 22px 4px 0 auto;
    width: 150px;
    text-align: center;
    img {
      margin: 0 auto 4px;
      display: block;
    }
    p {
      margin: 0;
      font-size: 10px;
      line-height: 14px;
      color: #cfe0ff;
    }
  }

  .tour__nav-group {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .tour__nav {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    background: none;
    border: none;
    padding: 3px;
    color: #fff;
    font: inherit;
    cursor: pointer;
    .tour__arrow {
      width: 26px;
      height: 26px;
    }
    .tour__arrow--back {
      transform: scaleX(-1);
    }
    &:hover img {
      filter: brightness(1.12);
    }
    &:active img {
      filter: brightness(0.9);
    }
    &:hover {
      text-decoration: underline;
    }
    &:focus {
      outline: 1px dotted rgba(255, 255, 255, 0.7);
    }
  }
`;

export default AboutMe;
