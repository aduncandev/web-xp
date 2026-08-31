import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';

import winLoginLogo from 'assets/windowsIcons/xplogo.png';
import offIcon from 'assets/windowsIcons/310(32x32).png';
import adminAvatar from 'assets/userIcons/dog.bmp';
import arrowIcon from 'assets/windowsIcons/290.ico';
import errorIcon from 'assets/windowsIcons/897(16x16).png';

import {
  getAvatar,
  getUser,
  createUser,
  userHasPassword,
  getPasswordHint,
  verifyUserPassword,
} from '../../context/users';
import { getArt } from '../../xpArt';
import XPTooltip from '../XPTooltip';

// The single logon surface (logonui.exe + winlogon status screens). The
// chrome — header/footer bands, separator glows, body gradient — stays
// mounted across every phase; only the stage content crossfades, exactly as
// the real thing morphs between "Please wait...", the user list, "welcome"
// and "Saving your settings...".
//
// Measurements sampled from refkit/shots/realxp/login-welcome.png and
// shutting-down.png (800x600); the welcome interstitial layout and status
// text color (#00309C bold) from refkit/shots/reborn/welcome-anim frames.

export const STATUS_DEFAULT_MS = 1300;

/* Screens cut in instantly, like the real thing; the only fade XP ever did
   here is the welcome screen dissolving over the desktop on logon. */
const Container = styled.div`
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  font-family: 'Tahoma', sans-serif;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 9998;
  overflow: hidden;
  background-color: #5a7edc;
  transition: opacity 0.3s ease-in;
  opacity: ${props => (props.$exiting ? 0 : 1)};
  pointer-events: ${props => (props.$exiting ? 'none' : 'auto')};
`;

/* Ref: solid #00309C, rows y=0..77 (78px). */
const HeaderBar = styled.div`
  height: 78px;
  width: 100%;
  background-color: #00309c;
  flex-shrink: 0;

  @media (max-width: 768px) {
    height: 44px;
  }
`;

/* Ref: 2px line at y=78..79 — soft light-blue sheen, brightest ~26% from
   the left (peak rgb(199,221,255)), fading toward both edges. */
const HeaderSeparator = styled.div`
  height: 2px;
  width: 100%;
  flex-shrink: 0;
  background: linear-gradient(
    90deg,
    #5075d3 0%,
    #89a7e8 11%,
    #c7ddff 26%,
    #acc6f6 51%,
    #8dabeb 66%,
    #6e90e0 81%,
    #5479d6 100%
  );
`;

/* Ref: 2px line at y=504..505 — orange glow, peak rgb(249,151,55) at ~26%,
   blending into the surrounding blues at both ends. */
const FooterSeparator = styled.div`
  height: 2px;
  width: 100%;
  flex-shrink: 0;
  background: linear-gradient(
    90deg,
    #0c3a9a 0%,
    #7a656c 11%,
    #eb923d 21%,
    #f99737 26%,
    #ed923b 36%,
    #bd7f4f 51%,
    #7a656a 66%,
    #3a4c86 81%,
    #0c3a9a 100%
  );
`;

const Stage = styled.div`
  flex-grow: 1;
  width: 100%;
  background: radial-gradient(
    19.48% 42.48% at 10% 22.48%,
    #9cc0e9 0%,
    #5a7edc 100%
  );
  position: relative;
  z-index: 0;
  color: white;
  overflow: hidden;
`;

/* One phase's stage content. All layers stay mounted and swap instantly —
   real XP cuts between the user list, "welcome" and the status screens. */
const Layer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  opacity: ${props => (props.$active ? 1 : 0)};
  pointer-events: ${props => (props.$active ? 'auto' : 'none')};
`;

const SplitLayer = styled(Layer)`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 0 5%;
  box-sizing: border-box;
  overflow-y: auto;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    align-content: center;
    justify-items: center;
    padding: 15px;
    gap: 20px;
  }
`;

const CenterLayer = styled(Layer)``;

/* Centered logo-over-text stack at ~36% height. (The real 800x600 screen
   leans the pair right of center with the text offset left, but that
   composition reads unbalanced on wide viewports — centered wins.) */
const StatusBlock = styled.div`
  position: absolute;
  left: 50%;
  top: 36%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const Branding = styled.div`
  display: flex;
  justify-content: center;
  align-items: flex-end;
  flex-direction: column;
  text-align: right;
  padding-right: 20px;

  img {
    width: 150px;
    margin-bottom: 20px;
  }
  h1 {
    font-family: 'Franklin Gothic Medium', 'Tahoma', sans-serif;
    font-weight: 400;
    font-size: 17px;
    margin: 0;
  }

  @media (max-width: 768px) {
    padding-right: 0;
    padding-top: 0;
    align-items: center;
    text-align: center;
    img {
      margin-bottom: 8px;
    }
    h1 {
      font-size: 1em;
    }
  }
`;

const VerticalLine = styled.div`
  width: 2px;
  height: 70%;
  align-self: center;
  background: linear-gradient(
    180deg,
    #5a7edc 0%,
    rgba(255, 255, 255, 0.59) 47.4%,
    #5a7edc 98.96%
  );

  @media (max-width: 768px) {
    display: none;
  }
`;

const UsersArea = styled.div`
  padding-left: 24px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;

  @media (max-width: 768px) {
    padding-left: 0;
    align-items: center;
    width: 100%;
    gap: 15px;
  }
`;

/* Ref tile: band x=425..~800, y=253..322 (70px tall), horizontal gradient
   #1242A6 -> background, 1px pale edge ring fading out to the right. The
   band appears whenever the tile is hot — hovered or selected — along with
   the gold picture frame (real-XP hover capture, user-verified). */
const tileBand =
  'linear-gradient(90deg, #1242a6 0%, #2955b8 50%, rgba(90, 126, 220, 0) 100%)';

const UserCard = styled.div`
  position: relative;
  width: 375px;
  height: 70px;
  box-sizing: border-box;
  border-radius: 5px;
  display: flex;
  align-items: flex-start;
  padding: 9px 0 0 10px;
  cursor: pointer;
  overflow: visible;

  background: ${props => (props.$selected ? tileBand : 'transparent')};

  &:hover {
    background: ${tileBand};
  }

  /* Pale 1px edge ring on the band, fading with the band itself. */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: 5px;
    border: 1px solid rgba(160, 183, 235, 0.95);
    pointer-events: none;
    -webkit-mask-image: linear-gradient(
      90deg,
      #000 0%,
      rgba(0, 0, 0, 0.55) 60%,
      transparent 95%
    );
    mask-image: linear-gradient(
      90deg,
      #000 0%,
      rgba(0, 0, 0, 0.55) 60%,
      transparent 95%
    );
    opacity: ${props => (props.$selected ? 1 : 0)};
  }

  &:hover::before {
    opacity: 1;
  }

  @media (max-width: 768px) {
    width: 90%;
    min-width: 290px;
  }
`;

/* Ref frame: 48px picture + 2px border. Gold when hot/selected (outer 1px
   #FFB600, inner 1px #FFEE00), whitish otherwise; soft blue drop shadow to
   the lower right. */
const AvatarIcon = styled.div`
  width: 52px;
  height: 52px;
  box-sizing: border-box;
  border: 1px solid
    ${props => (props.$selected ? '#ffb600' : 'rgba(255, 255, 255, 0.85)')};
  /* Flex centering instead of padding: fractional DPI zoom can round a
     1px padding unevenly, drifting the picture off-center in its mat */
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${props => (props.$selected ? '#ffee00' : '#ffffff')};
  border-radius: 3px;
  flex-shrink: 0;
  box-shadow: 2px 2px 3px rgba(10, 30, 100, 0.4);

  ${UserCard}:hover & {
    border-color: #ffb600;
    background-color: #ffee00;
  }

  img {
    width: 48px;
    height: 48px;
    display: block;
    object-fit: cover;
    border-radius: 1px;
  }
`;

const UserDetails = styled.div`
  color: #fff;
  flex-grow: 1;
  min-width: 0;
  margin-left: 13px;
  padding-top: 1px;
  display: flex;
  flex-direction: column;

  h3 {
    font-family: 'Franklin Gothic Medium', 'Tahoma', sans-serif;
    font-weight: 400;
    font-size: 21px;
    line-height: 22px;
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  p {
    font-family: 'Tahoma', sans-serif;
    font-size: 11px;
    margin: 2px 0 0 0;
    color: #ffffff;
    line-height: 1;
    font-weight: 400;
  }
`;

/* Ref: "Type your password" 11px Tahoma; gently rounded white input 164x27
   that overhangs the bottom of the band by ~8px; green OK arrow 24px. */
const PasswordSection = styled.div`
  margin-top: 4px;
  position: relative;

  .instruction {
    font-family: 'Tahoma', sans-serif;
    font-size: 11px;
    font-weight: 400;
    color: #fff;
    margin: 0 0 1px 0;
    line-height: 13px;
  }

  form {
    display: flex;
    align-items: center;
    gap: 11px;
  }

  /* Ref pixel-scan: the real field is a sharp borderless white rectangle —
     band color to #FFF in one pixel, no rounding. */
  input {
    padding: 0 6px;
    border: none;
    outline: none;
    background-color: white;
    color: black;
    font-family: 'Tahoma', sans-serif;
    font-size: 11px;
    width: 164px;
    height: 27px;
    box-sizing: border-box;
    border-radius: 0;
  }

  button {
    background: transparent;
    border: none;
    padding: 0;
    cursor: pointer;
    line-height: 0;
    width: 24px;
    height: 24px;

    img {
      width: 100%;
      height: 100%;
    }
  }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Tooltip = styled.div`
  position: absolute;
  top: 48px; /* Position below the input */
  left: -20px;
  width: 260px;
  background-color: #ffffe1;
  border: 1px solid black;
  border-radius: 5px;
  padding: 8px 10px;
  z-index: 100;
  box-shadow: 2px 2px 2px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: flex-start;
  gap: 8px;
  color: black;
  animation: ${fadeIn} 0.2s ease-out;

  &:before {
    content: '';
    position: absolute;
    top: -11px;
    left: 45px;
    width: 0;
    height: 0;
    border-style: solid;
    border-width: 0 11px 11px 11px;
    border-color: transparent transparent black transparent;
  }

  &:after {
    content: '';
    position: absolute;
    top: -10px;
    left: 46px;
    width: 0;
    height: 0;
    border-style: solid;
    border-width: 0 10px 10px 10px;
    border-color: transparent transparent #ffffe1 transparent;
  }

  .tooltip-icon {
    width: 16px;
    height: 16px;
    margin-top: 2px;
    flex-shrink: 0;
  }

  .tooltip-content {
    font-family: 'Tahoma', sans-serif;
    font-size: 11px;
    line-height: 1.3;

    strong {
      display: block;
      margin-bottom: 4px;
      font-weight: 700;
    }
  }
`;

/* Ref (reborn welcome-anim): lowercase italic "welcome", Franklin Gothic
   Medium, right-aligned toward the divider like the login branding block. */
const WelcomePane = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding-right: 36px;

  @media (max-width: 768px) {
    justify-content: center;
    padding-right: 0;
  }
`;

const WelcomeText = styled.div`
  font-family: 'Franklin Gothic Medium', 'Tahoma', sans-serif;
  font-weight: 400;
  font-style: italic;
  font-size: 46px;
  letter-spacing: 1px;
  color: #ffffff;
  text-shadow: 2px 2px 3px rgba(10, 25, 90, 0.5);
`;

/* The welcome interstitial's user tile: same geometry as a login tile but
   inert — no band, no gold hover, plain white picture frame. */
const WelcomeTile = styled.div`
  position: relative;
  width: 375px;
  height: 70px;
  box-sizing: border-box;
  display: flex;
  align-items: flex-start;
  padding: 9px 0 0 10px;

  @media (max-width: 768px) {
    width: auto;
    min-width: 290px;
  }
`;

const WelcomeAvatar = styled.div`
  width: 52px;
  height: 52px;
  box-sizing: border-box;
  border: 1px solid rgba(255, 255, 255, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #ffffff;
  border-radius: 3px;
  flex-shrink: 0;
  box-shadow: 2px 2px 3px rgba(10, 30, 100, 0.4);

  img {
    width: 48px;
    height: 48px;
    display: block;
    object-fit: cover;
    border-radius: 1px;
  }
`;

/* Ref (reborn f07 + real-XP logged-on capture): tile status lines —
   "Loading your personal settings..." / "2 programs running." / "Logged on"
   — 11px Tahoma bold, navy #00309C, tight under the name. Doubled
   ampersand outweighs the UserDetails descendant p rule. Navy is illegible
   on the hot tile's dark band, so it flips to white there. */
const TileStatus = styled.p`
  && {
    font-family: 'Tahoma', sans-serif;
    font-size: 11px;
    font-weight: 700;
    color: #00309c;
    margin: 3px 0 0 0;
    line-height: 1;
  }

  ${UserCard}:hover && {
    color: #ffffff;
  }
`;

const StatusLogo = styled.img`
  display: block;
  width: 150px;
  height: auto;
  margin: 0 0 13px;
  filter: drop-shadow(1px 1px 2px rgba(0, 0, 0, 0.3));
`;

const StatusMessage = styled.div`
  font-family: 'Franklin Gothic Medium', 'Tahoma', sans-serif;
  font-weight: 400;
  font-size: 19px;
  text-align: center;
  text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.2);
`;

/* Ref: 94px band (y=506..599), left-to-right gradient #3833AC -> #00309C.
   Content hangs near the top: icon 24px at (27,+20), helper text right block
   ~50px in from the right edge. */
const FooterBar = styled.div`
  height: 94px;
  width: 100%;
  box-sizing: border-box;
  background: linear-gradient(90deg, #3833ac 0%, #1c31a4 50%, #00309c 100%);
  position: relative;
  flex-shrink: 0;

  @media (max-width: 768px) {
    height: 56px;
  }
`;

const FooterContent = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px 50px 0 27px;
  box-sizing: border-box;
  opacity: ${props => (props.$active ? 1 : 0)};
  pointer-events: ${props => (props.$active ? 'auto' : 'none')};

  @media (max-width: 768px) {
    flex-direction: row;
    justify-content: center;
    padding: 8px 10px;
    gap: 10px;
  }
`;

const FooterBtn = styled.div`
  display: flex;
  align-items: center;
  cursor: pointer;

  button {
    background: transparent;
    border: none;
    padding: 0;
    width: 24px;
    height: 24px;
    cursor: pointer;
    outline: none;
    transition: transform 0.05s ease-in-out, filter 0.05s ease-in-out;

    &:active {
      transform: translate(1px, 1px);
      filter: brightness(0.85);
    }

    img {
      width: 100%;
      height: 100%;
      display: block;
    }
  }

  p {
    color: #fff;
    margin: 0 0 0 8px;
    font-size: 18px;
    font-family: 'Franklin Gothic Medium', 'Tahoma', sans-serif;
    font-weight: 400;
  }

  /* Real XP underlines the label while the control is hot. */
  &:hover p {
    text-decoration: underline;
  }

  @media (max-width: 768px) {
    button {
      width: 40px;
      height: 40px;
    }
  }
`;

const FooterInfo = styled.div`
  color: #fff;
  font-family: 'Tahoma', sans-serif;
  font-size: 11px;
  text-align: left;
  font-weight: 400;
  line-height: 14px;
  margin-top: 3px;

  p {
    margin: 0;
    font-weight: 400;
  }

  @media (max-width: 768px) {
    display: none;
  }
`;

/**
 * phase: 'login' | 'welcome' | 'status'
 *  - 'login'   — the user list ("To begin, click your user name")
 *  - 'welcome' — italic "welcome" + the chosen user's tile with a status line
 *  - 'status'  — centered logo + winlogon message ("Please wait...",
 *                "Saving your settings...", "Windows is shutting down...")
 *
 * statusMessages: array of strings or { text, ms }; each holds for its ms
 * (default 1300), then onStatusDone fires after the last one.
 * exiting: fades the whole surface out (desktop reveal); the parent owns the
 * matching timer.
 */
const LogonUI = ({
  phase,
  users = [],
  loggedOnUsers = [],
  programCounts = {},
  onLogin,
  onInitiateShutdown,
  welcomeUser = null,
  welcomeStatus = 'Loading your personal settings...',
  statusMessages = [],
  onStatusDone,
  exiting = false,
}) => {
  // Real XP tile status for a backgrounded session: the running-program
  // count when there is one, plain "Logged on" otherwise.
  const sessionStatus = name => {
    const count = programCounts[name] || 0;
    if (count === 1) return '1 program running.';
    if (count > 1) return `${count} programs running.`;
    return 'Logged on';
  };
  const [selectedUser, setSelectedUser] = useState(null);
  const [showAdminPasswordPrompt, setShowAdminPasswordPrompt] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showError, setShowError] = useState(false);
  const [adminRevealed, setAdminRevealed] = useState(false);

  // Password prompt for regular accounts that have one
  const [typedPassword, setTypedPassword] = useState('');
  const [showPwError, setShowPwError] = useState(false);
  const [showPwHint, setShowPwHint] = useState(false);
  const hintArt = getArt('LoginQuestion', null);
  // High-res green OK arrow (XPIcons Go.png); the old 16px .ico is the
  // fallback if the asset ever goes missing.
  const okArt = getArt('LoginGo', arrowIcon);

  // FLIP glide: the clicked tile's list position is captured at logon so the
  // welcome layer's tile can slide from there to its centered spot, the way
  // the real welcome screen pulls your tile into place.
  const welcomeFromRectRef = useRef(null);
  const welcomeTileRef = useRef(null);
  const captureTileRect = lower => {
    const el = document.querySelector(`[data-user="${lower}"]`);
    welcomeFromRectRef.current = el ? el.getBoundingClientRect() : null;
  };

  useLayoutEffect(() => {
    if (phase !== 'welcome') return undefined;
    const el = welcomeTileRef.current;
    const from = welcomeFromRectRef.current;
    welcomeFromRectRef.current = null;
    if (!el || !from) return undefined;
    const to = el.getBoundingClientRect();
    const dx = from.left - to.left;
    const dy = from.top - to.top;
    if (!dx && !dy) return undefined;
    el.style.transition = 'none';
    el.style.transform = `translate(${dx}px, ${dy}px)`;
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => {
        el.style.transition = 'transform 0.35s ease-out';
        el.style.transform = 'translate(0, 0)';
      });
    });
    return () => {
      cancelAnimationFrame(raf);
      el.style.transition = '';
      el.style.transform = '';
    };
  }, [phase]);

  // ---- status message sequencing --------------------------------------
  const [msgIndex, setMsgIndex] = useState(0);
  const onStatusDoneRef = useRef(onStatusDone);
  onStatusDoneRef.current = onStatusDone;

  useEffect(() => {
    setMsgIndex(0);
  }, [statusMessages]);

  useEffect(() => {
    if (phase !== 'status' || statusMessages.length === 0) return undefined;
    const entry = statusMessages[Math.min(msgIndex, statusMessages.length - 1)];
    const ms = (typeof entry === 'object' && entry.ms) || STATUS_DEFAULT_MS;
    const timer = setTimeout(() => {
      if (msgIndex < statusMessages.length - 1) {
        setMsgIndex(i => i + 1);
      } else if (onStatusDoneRef.current) {
        onStatusDoneRef.current();
      }
    }, ms);
    return () => clearTimeout(timer);
  }, [phase, msgIndex, statusMessages]);

  const statusEntry =
    statusMessages.length > 0
      ? statusMessages[Math.min(msgIndex, statusMessages.length - 1)]
      : null;
  const statusText =
    statusEntry === null
      ? ''
      : typeof statusEntry === 'object'
      ? statusEntry.text
      : statusEntry;

  // Leaving the login phase always clears its transient selection state.
  useEffect(() => {
    if (phase !== 'login') {
      setSelectedUser(null);
      setShowAdminPasswordPrompt(false);
      setAdminPassword('');
      setShowError(false);
    }
  }, [phase]);

  // Real XP hides the built-in Administrator on the Welcome screen as soon as
  // a real account exists — it stays reachable only through the hidden
  // secure-attention path. Browsers can't see Ctrl+Alt+Del, so we accept the
  // standard SAS substitutes (Ctrl+Alt+End as in Remote Desktop, or
  // Ctrl+Alt+Insert as in Virtual PC), pressed twice like the real thing.
  const adminIsRealAccount = users.some(
    u => u.name.toLowerCase() === 'administrator',
  );
  const showAdminTile =
    !adminIsRealAccount && (users.length === 0 || adminRevealed);

  useEffect(() => {
    if (phase !== 'login') return undefined;
    let presses = 0;
    let timer = null;
    const onKeyDown = e => {
      const isSas =
        e.ctrlKey &&
        e.altKey &&
        (e.key === 'End' || e.key === 'Insert' || e.key === 'Delete');
      if (!isSas) return;
      e.preventDefault();
      presses += 1;
      clearTimeout(timer);
      if (presses >= 2) {
        presses = 0;
        setAdminRevealed(v => !v);
      } else {
        timer = setTimeout(() => {
          presses = 0;
        }, 2000);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      clearTimeout(timer);
    };
  }, [phase]);

  // If the tile gets hidden while its password prompt is open, reset it.
  useEffect(() => {
    if (!showAdminTile && selectedUser === 'administrator') {
      setShowAdminPasswordPrompt(false);
      setSelectedUser(null);
      setAdminPassword('');
      setShowError(false);
    }
  }, [showAdminTile, selectedUser]);

  const handleAdminClick = e => {
    e.stopPropagation();
    if (selectedUser === 'administrator') return;
    setSelectedUser('administrator');
    setShowAdminPasswordPrompt(true);
    setAdminPassword('');
    setShowError(false);
  };

  const handleUserClick = (e, user) => {
    e.stopPropagation();
    const lower = user.name.toLowerCase();
    setShowAdminPasswordPrompt(false);
    if (userHasPassword(user.name)) {
      // Passworded accounts prompt in the tile, like the real thing
      if (selectedUser === lower) return;
      setSelectedUser(lower);
      setTypedPassword('');
      setShowPwError(false);
      setShowPwHint(false);
    } else {
      setSelectedUser(lower);
      captureTileRect(lower);
      if (onLogin) onLogin(user.name);
    }
  };

  const handleUserPasswordSubmit = (e, user) => {
    e.preventDefault();
    if (verifyUserPassword(user.name, typedPassword)) {
      captureTileRect(user.name.toLowerCase());
      if (onLogin) onLogin(user.name);
    } else {
      setTypedPassword('');
      setShowPwHint(false);
      setShowPwError(true);
    }
  };

  const handleAdminPasswordSubmit = e => {
    e.preventDefault();
    if (adminPassword === 'ILoveFemboys') {
      // The hidden Administrator account becomes real on first login
      if (!getUser('Administrator')) createUser('Administrator', 'dog');
      captureTileRect('administrator');
      if (getUser('Administrator') && onLogin) onLogin('Administrator');
    } else {
      setAdminPassword('');
      setShowError(true);
    }
  };

  const handlePasswordChange = e => {
    setAdminPassword(e.target.value);
    if (showError) setShowError(false);
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (!selectedUser) return;
      const wrapper = event.target.closest(`[data-user="${selectedUser}"]`);
      if (wrapper) return;
      // Clicking away collapses whichever password prompt is open
      setShowAdminPasswordPrompt(false);
      setSelectedUser(null);
      setAdminPassword('');
      setShowError(false);
      setTypedPassword('');
      setShowPwError(false);
      setShowPwHint(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedUser]);

  const welcomeAvatarSrc = welcomeUser
    ? welcomeUser.name.toLowerCase() === 'administrator' &&
      !getUser('Administrator')
      ? adminAvatar
      : getAvatar(welcomeUser.avatarKey)
    : null;

  return (
    <Container $exiting={exiting}>
      <HeaderBar />
      <HeaderSeparator />
      <Stage>
        {/* ---- login: the user list -------------------------------- */}
        <SplitLayer $active={phase === 'login'}>
          <Branding>
            <img
              src={winLoginLogo}
              alt="Windows Logo"
              onError={e => (e.target.style.opacity = 0)}
            />
            <h1>To begin, click your user name</h1>
          </Branding>
          <VerticalLine />
          <UsersArea>
            {/* Administrator — hidden account behind a password */}
            {showAdminTile && (
              <div data-user="administrator">
                <UserCard
                  $selected={selectedUser === 'administrator'}
                  onClick={handleAdminClick}
                >
                  <AvatarIcon $selected={selectedUser === 'administrator'}>
                    <img
                      src={adminAvatar}
                      alt="Admin"
                      onError={e => {
                        e.target.style.display = 'none';
                        e.target.parentNode.style.backgroundColor = '#888';
                        e.target.parentNode.innerText = 'A';
                        e.target.parentNode.style.color = 'white';
                        e.target.parentNode.style.fontSize = '24px';
                      }}
                    />
                  </AvatarIcon>
                  <UserDetails>
                    <h3>Administrator</h3>
                    {showAdminPasswordPrompt &&
                      selectedUser === 'administrator' && (
                        <PasswordSection>
                          <p className="instruction">Type your password</p>
                          <form onSubmit={handleAdminPasswordSubmit}>
                            <input
                              type="password"
                              value={adminPassword}
                              onChange={handlePasswordChange}
                              autoFocus
                            />
                            <XPTooltip text="OK">
                              <button type="submit">
                                <img src={okArt} alt="OK" />
                              </button>
                            </XPTooltip>
                          </form>
                          {showError && (
                            <Tooltip onClick={() => setShowError(false)}>
                              <img
                                className="tooltip-icon"
                                src={errorIcon}
                                alt="Error"
                              />
                              <div className="tooltip-content">
                                <strong>Did you forget your password?</strong>
                                Please type your password again.
                                <br />
                                Be sure to use the correct uppercase and
                                lowercase letters.
                              </div>
                            </Tooltip>
                          )}
                        </PasswordSection>
                      )}
                  </UserDetails>
                </UserCard>
              </div>
            )}

            {/* Registered accounts */}
            {users.map(user => {
              const lower = user.name.toLowerCase();
              const selected = selectedUser === lower;
              const promptOpen = selected && userHasPassword(user.name);
              const hint = getPasswordHint(user.name);
              return (
                <div data-user={lower} key={user.name}>
                  <UserCard
                    $selected={selected}
                    onClick={e => handleUserClick(e, user)}
                  >
                    <AvatarIcon $selected={selected}>
                      <img
                        src={getAvatar(user.avatarKey)}
                        alt={user.name}
                        onError={e => {
                          e.target.style.display = 'none';
                          e.target.parentNode.style.backgroundColor = '#888';
                          e.target.parentNode.innerText = user.name
                            .charAt(0)
                            .toUpperCase();
                          e.target.parentNode.style.color = 'white';
                          e.target.parentNode.style.fontSize = '24px';
                        }}
                      />
                    </AvatarIcon>
                    <UserDetails>
                      <h3>{user.name}</h3>
                      {!promptOpen && loggedOnUsers.includes(user.name) && (
                        <TileStatus>{sessionStatus(user.name)}</TileStatus>
                      )}
                      {promptOpen && (
                        <PasswordSection>
                          <p className="instruction">Type your password</p>
                          <form
                            onSubmit={e => handleUserPasswordSubmit(e, user)}
                          >
                            <input
                              type="password"
                              value={typedPassword}
                              onChange={e => {
                                setTypedPassword(e.target.value);
                                if (showPwError) setShowPwError(false);
                              }}
                              autoFocus
                            />
                            <XPTooltip text="OK">
                              <button type="submit">
                                <img src={okArt} alt="OK" />
                              </button>
                            </XPTooltip>
                            {hint && hintArt && (
                              <XPTooltip text="Show password hint">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowPwHint(v => !v);
                                    setShowPwError(false);
                                  }}
                                >
                                  <img src={hintArt} alt="Password hint" />
                                </button>
                              </XPTooltip>
                            )}
                          </form>
                          {showPwError && (
                            <Tooltip onClick={() => setShowPwError(false)}>
                              <img
                                className="tooltip-icon"
                                src={errorIcon}
                                alt="Error"
                              />
                              <div className="tooltip-content">
                                <strong>Did you forget your password?</strong>
                                Please type your password again.
                                <br />
                                Be sure to use the correct uppercase and
                                lowercase letters.
                              </div>
                            </Tooltip>
                          )}
                          {showPwHint && (
                            <Tooltip onClick={() => setShowPwHint(false)}>
                              <div className="tooltip-content">{hint}</div>
                            </Tooltip>
                          )}
                        </PasswordSection>
                      )}
                    </UserDetails>
                  </UserCard>
                </div>
              );
            })}
          </UsersArea>
        </SplitLayer>

        {/* ---- welcome: italic "welcome" + the chosen tile ---------- */}
        <SplitLayer $active={phase === 'welcome'}>
          <WelcomePane>
            <WelcomeText>welcome</WelcomeText>
          </WelcomePane>
          <VerticalLine />
          <UsersArea>
            {welcomeUser && (
              <WelcomeTile ref={welcomeTileRef}>
                <WelcomeAvatar>
                  <img
                    src={welcomeAvatarSrc}
                    alt={welcomeUser.name}
                    onError={e => (e.target.style.display = 'none')}
                  />
                </WelcomeAvatar>
                <UserDetails>
                  <h3>{welcomeUser.name}</h3>
                  <TileStatus>{welcomeStatus}</TileStatus>
                </UserDetails>
              </WelcomeTile>
            )}
          </UsersArea>
        </SplitLayer>

        {/* ---- status: winlogon messages ---------------------------- */}
        <CenterLayer $active={phase === 'status'}>
          <StatusBlock>
            <StatusLogo
              src={winLoginLogo}
              alt="Windows XP"
              onError={e => (e.target.style.opacity = 0)}
            />
            <StatusMessage>{statusText}</StatusMessage>
          </StatusBlock>
        </CenterLayer>
      </Stage>
      <FooterSeparator />
      <FooterBar>
        <FooterContent $active={phase === 'login'}>
          {/* The whole row is the control, exactly like the real thing */}
          <FooterBtn onClick={onInitiateShutdown}>
            <XPTooltip text="Turn off computer">
              <button type="button">
                <img src={offIcon} alt="Turn off" />
              </button>
            </XPTooltip>
            <p>Turn off computer</p>
          </FooterBtn>
          <FooterInfo>
            <p>After you log on, you can add or change accounts.</p>
            <p>Just go to Control Panel and click User Accounts.</p>
          </FooterInfo>
        </FooterContent>
      </FooterBar>
    </Container>
  );
};

export default LogonUI;
