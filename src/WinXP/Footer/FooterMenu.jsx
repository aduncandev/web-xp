import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

import SubMenu from 'components/SubMenu';
import ContextMenu from 'components/ContextMenu';
import {
  menuFade,
  MENU_FADE_MS,
  SUBMENU_SHOW_DELAY_MS,
} from 'components/menuFade';
import ie from 'assets/windowsIcons/ie.png';
import mine from 'assets/minesweeper/mine-icon.png';
import outlook from 'assets/windowsIcons/887(32x32).png';
import mediaPlayer from 'assets/windowsIcons/846(32x32).png';
import messenger from 'assets/windowsIcons/pictochat.png';
import documents from 'assets/windowsIcons/308(32x32).png';
import recentDocuments from 'assets/windowsIcons/301(32x32).png';
import pictures from 'assets/windowsIcons/307(32x32).png';
import music from 'assets/windowsIcons/550(32x32).png';
import computer from 'assets/windowsIcons/676(32x32).png';
import controlPanel from 'assets/windowsIcons/300(32x32).png';
import printer from 'assets/windowsIcons/549(32x32).png';
import paint from 'assets/windowsIcons/680(32x32).png';
import help from 'assets/windowsIcons/747(32x32).png';
import search from 'assets/windowsIcons/299(32x32).png';
import run from 'assets/windowsIcons/743(32x32).png';
import lock from 'assets/windowsIcons/546(32x32).png';
import user from 'assets/userIcons/skillz.bmp';
import { getCurrentUserName, getUser, getAvatar } from '../../context/users';
import shut from 'assets/windowsIcons/310(32x32).png';
import allProgramsIcon from 'assets/windowsIcons/all-programs.ico';
import winamp from 'assets/windowsIcons/winamp.png';
import notepad from 'assets/windowsIcons/327(32x32).png';
import storeBag from 'assets/store/bag.gif';
import empty from 'assets/empty.png';

import { useVFS } from '../../context/VFSContext';
import { EXE_PATHS } from '../../context/vfsConstants';
import { PROGRAMS } from '../apps';
import {
  getStartMenuConfig,
  togglePinned,
  removeFromMfu,
  MFU_SEEDS,
} from '../startMenuConfig';
import {
  AllPrograms,
  MyRecentDocuments,
  PROGRAM_ICONS_16,
} from './FooterMenuData';

const OUTLOOK_EXE = 'C:/Program Files/Outlook Express/msimn.exe';

// 32px icons for the large-icon left column, keyed by exe path. The
// small-icon variants live in FooterMenuData's PROGRAM_ICONS_16.
const PROGRAM_ICONS_32 = {
  [EXE_PATHS.IEXPLORE]: ie,
  [OUTLOOK_EXE]: outlook,
  [EXE_PATHS.WINMINE]: mine,
  [EXE_PATHS.NOTEPAD]: notepad,
  [EXE_PATHS.WINAMP]: winamp,
  [EXE_PATHS.MSPAINT]: paint,
  [EXE_PATHS.WMPLAYER]: mediaPlayer,
  [EXE_PATHS.MPLAYER2]: mediaPlayer,
  [EXE_PATHS.PICTOCHAT]: messenger,
};

// Click actions the WinXP onClickMenuItem switch already understands;
// anything else launches through the 'open:<path>' passthrough.
const LEGACY_ACTIONS = {
  [EXE_PATHS.IEXPLORE]: 'Internet Explorer',
  [OUTLOOK_EXE]: 'Outlook Express',
  [EXE_PATHS.WINMINE]: 'Minesweeper',
  [EXE_PATHS.NOTEPAD]: 'Notepad',
  [EXE_PATHS.WINAMP]: 'Winamp',
  [EXE_PATHS.MSPAINT]: 'Paint',
  [EXE_PATHS.WMPLAYER]: 'Media Player',
  [EXE_PATHS.PICTOCHAT]: 'PictoChat',
  [EXE_PATHS.TOUR]: 'About Me',
  [EXE_PATHS.VOLTORB]: 'Voltorb Flip',
  [EXE_PATHS.PINBALL]: 'Pinball',
  [EXE_PATHS.CMD]: 'Command Prompt',
  [EXE_PATHS.EXPLORER]: 'Windows Explorer',
};

// Display-name overrides where the Start Menu label differs from the
// program registry's displayName.
const LEGACY_LABELS = {
  [EXE_PATHS.TOUR]: 'About Me',
};

// Menu label/action -> program exe, for resolving right-clicked entries in
// the All Programs cascade (which only carries display text).
const TEXT_TO_EXE = (() => {
  const m = {};
  for (const [exe, action] of Object.entries(LEGACY_ACTIONS)) m[action] = exe;
  for (const [exe, p] of Object.entries(PROGRAMS)) {
    const label = p.displayName || p.name;
    if (label && !(label in m)) m[label] = exe;
  }
  return m;
})();

// Pre-seeded most-frequently-used list lives in the shared config module
// (Clear List needs it too); shown until real usage fills in.

// Programs the MFU list never surfaces (shell surfaces and the permanent
// IE/shop slots, mirroring XP's launch-count kill list).
const MFU_EXCLUDED = [
  EXE_PATHS.IEXPLORE,
  OUTLOOK_EXE,
  EXE_PATHS.STORE,
  EXE_PATHS.MISSINGNO,
  EXE_PATHS.EXPLORER,
  EXE_PATHS.DOGVIRUS,
  EXE_PATHS.DOGWINDOW,
  'C:/WINDOWS/system32/control.exe',
  'C:/WINDOWS/system32/taskmgr.exe',
];

/** Build a left-column row descriptor for a registered program. */
function programEntry(exePath, small) {
  const program = PROGRAMS[exePath];
  if (!program) return null;
  const icon =
    (small
      ? PROGRAM_ICONS_16[exePath]
      : PROGRAM_ICONS_32[exePath] || PROGRAM_ICONS_16[exePath]) ||
    program.header.icon;
  return {
    exePath,
    icon,
    text: LEGACY_LABELS[exePath] || program.displayName || program.name,
    action: LEGACY_ACTIONS[exePath] || `open:${exePath}`,
  };
}

function FooterMenu({
  className,
  onClick,
  allProgramsData,
  recentDocumentsData,
}) {
  const vfs = useVFS();
  const userName = getCurrentUserName();
  const cfg = getStartMenuConfig(vfs, userName);
  const { settings } = cfg;
  const small = settings.iconSize === 'small';

  const [hovering, setHovering] = useState('');
  const [open, setOpen] = useState('');
  const [ctxMenu, setCtxMenu] = useState(null);
  const openTimer = useRef(null);

  // --- Pinned area (Internet, E-mail, then user pins) ---
  // A pinned key is either a registered program's exe path or any VFS
  // path (anything from All Programs can be pinned, functional or not).
  const exeExists = p => !!vfs.findNodeCI(p);
  const resolveEntry = key => {
    const asProgram = programEntry(key, small);
    // a registered program with no exe on disk was uninstalled
    if (asProgram) return exeExists(key) ? asProgram : null;
    const node = vfs.findNodeCI(key);
    if (!node) return null;
    return {
      exePath: key,
      icon: node.icon,
      text: node.name,
      action: `open:${node.path}`,
    };
  };
  const pinnedEntries = cfg.pinned.map(resolveEntry).filter(Boolean);
  const pinnedSet = new Set(cfg.pinned);

  // --- Most-frequently-used list: top launch counts, seeded with the
  // default six while usage is sparse. Removed entries (seeds included)
  // stay gone until that program is launched again. ---
  const excluded = new Set([...MFU_EXCLUDED, ...cfg.pinned, ...cfg.mfuRemoved]);
  const mfuPaths = Object.entries(cfg.usage)
    .filter(
      ([p, count]) =>
        count > 0 &&
        PROGRAMS[p] &&
        !excluded.has(p) &&
        exeExists(p) &&
        p.toLowerCase().endsWith('.exe'),
    )
    .sort((a, b) => b[1] - a[1])
    .slice(0, settings.mfuCount)
    .map(([p]) => p);
  for (const p of MFU_SEEDS) {
    if (mfuPaths.length >= settings.mfuCount) break;
    if (!excluded.has(p) && !mfuPaths.includes(p) && exeExists(p))
      mfuPaths.push(p);
  }
  const mfuEntries = mfuPaths.map(p => programEntry(p, small)).filter(Boolean);

  function onMouseOver(e) {
    const item = e.target.closest('.menu__item');
    if (!item) return;
    const textEl = item.querySelector('.menu__item__text');
    if (!textEl) return;
    const text = textEl.textContent;
    if (text === hovering) return;
    setHovering(text);
    clearTimeout(openTimer.current);
    openTimer.current = setTimeout(() => {
      setOpen(prev => {
        if (settings.hoverSubmenus) return text;
        // Click-to-open mode: pausing elsewhere closes an open submenu
        // but never opens one
        return prev && prev !== text ? '' : prev;
      });
    }, SUBMENU_SHOW_DELAY_MS);
  }
  function openNow(text) {
    clearTimeout(openTimer.current);
    setHovering(text);
    setOpen(text);
  }
  useEffect(() => () => clearTimeout(openTimer.current), []);

  function onProgramContextMenu(e, entry, isMfu) {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ x: e.clientX, y: e.clientY, entry, isMfu });
  }

  // Right-click in the All Programs cascade: EVERY concrete item is
  // pinnable, functional or not. Dynamic entries carry 'open:<vfs path>'
  // actions — shortcuts to registered programs pin as the program; anything
  // else pins as its VFS path and opens like a normal click would.
  function onAllProgramsContextMenu(e, item) {
    const key = item.action || item.text;
    let entry = null;
    if (typeof key === 'string' && key.startsWith('open:')) {
      const node = vfs.findNodeCI(key.slice(5));
      if (!node) return;
      const target = node.type === 'shortcut' ? node.target : node.path;
      entry =
        target && PROGRAMS[target]
          ? programEntry(target, small)
          : {
              exePath: node.path,
              icon: node.icon,
              text: node.name,
              action: `open:${node.path}`,
            };
    } else {
      const exe = TEXT_TO_EXE[key];
      if (exe && PROGRAMS[exe]) entry = programEntry(exe, small);
    }
    if (!entry) return;
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ x: e.clientX, y: e.clientY, entry, isMfu: false });
  }

  function onProgramContextAction(action) {
    if (!ctxMenu) return;
    const { entry, isMfu } = ctxMenu;
    if (action === 'open') {
      onClick(entry.action);
    } else if (action === 'toggle-pin') {
      togglePinned(vfs, userName, entry.exePath);
    } else if (action === 'remove-mfu' && isMfu) {
      removeFromMfu(vfs, userName, entry.exePath);
    }
  }

  const items = settings.items;
  const hasTopGroup =
    settings.showInternet || settings.showEmail || pinnedEntries.length > 0;
  const hasMiddleRight =
    items.controlPanel === 'link' || items.printers === 'link';
  const hasBottomRight =
    items.helpSupport === 'link' ||
    items.search === 'link' ||
    items.run === 'link';

  return (
    <div className={className}>
      <header>
        <img
          className="header__img"
          src={getAvatar(getUser(getCurrentUserName())?.avatarKey) || user}
          alt="avatar"
        />
        <span className="header__text">{getCurrentUserName()}</span>
      </header>
      <section className="menu" onMouseOver={onMouseOver}>
        <hr className="orange-hr" />
        <div className={`menu__left${small ? ' menu__left--small' : ''}`}>
          {settings.showInternet && (
            <Item
              onClick={onClick}
              text="Internet"
              bold
              icon={small ? PROGRAM_ICONS_16[EXE_PATHS.IEXPLORE] || ie : ie}
            >
              {!small && (
                <div className="menu__item__subtext">Internet Explorer</div>
              )}
            </Item>
          )}
          {settings.showEmail && (
            <Item
              onClick={onClick}
              text="Shop"
              action={`open:${EXE_PATHS.STORE}`}
              bold
              icon={storeBag}
            >
              {!small && <div className="menu__item__subtext">XP Shop</div>}
            </Item>
          )}
          {pinnedEntries.map(entry => (
            <Item
              key={entry.exePath}
              onClick={onClick}
              text={entry.text}
              action={entry.action}
              icon={entry.icon}
              bold
              onContextMenu={e => onProgramContextMenu(e, entry, false)}
            />
          ))}
          {hasTopGroup && <div className="menu__separator" />}
          {mfuEntries.map(entry => (
            <Item
              key={entry.exePath}
              onClick={onClick}
              text={entry.text}
              action={entry.action}
              icon={entry.icon}
              onContextMenu={e => onProgramContextMenu(e, entry, true)}
            />
          ))}
          <div style={{ flex: 1 }} />
          <div className="menu__separator" />
          <Item
            className="menu__item--allprograms"
            bold
            style={
              hovering === 'All Programs'
                ? {
                    backgroundColor: '#2f71cd',
                    color: '#FFF',
                  }
                : {}
            }
            onClick={() => openNow('All Programs')}
            text={
              <div style={{ display: 'flex', alignItems: 'center' }}>
                All Programs
                <img
                  src={allProgramsIcon}
                  alt=""
                  style={{
                    marginLeft: '5px',
                    height: '18px',
                  }}
                />
              </div>
            }
            icon={empty}
          />
        </div>
        <div className="menu__right">
          {items.myDocuments === 'link' && (
            <Item text="My Documents" icon={documents} bold onClick={onClick} />
          )}
          {settings.recentDocs && (
            <Item
              bold
              style={
                hovering === 'My Recent Documents'
                  ? {
                      backgroundColor: '#2f71cd',
                      color: '#FFF',
                    }
                  : {}
              }
              text={
                <span>
                  My Recent <u>D</u>ocuments
                </span>
              }
              icon={recentDocuments}
              onClick={() => openNow('My Recent Documents')}
            >
              <div
                style={{
                  borderLeftColor:
                    hovering === 'My Recent Documents' ? '#FFF' : '#00136b',
                }}
                className="menu__arrow"
              />
              {open === 'My Recent Documents' && (
                <SubMenu
                  left="153px"
                  data={recentDocumentsData || MyRecentDocuments}
                  onClick={onClick}
                />
              )}
            </Item>
          )}
          {items.myPictures === 'link' && (
            <Item text="My Pictures" icon={pictures} bold onClick={onClick} />
          )}
          {items.myMusic === 'link' && (
            <Item text="My Music" icon={music} bold onClick={onClick} />
          )}
          {items.myComputer === 'link' && (
            <Item text="My Computer" icon={computer} bold onClick={onClick} />
          )}
          {hasMiddleRight && <div className="menu__separator" />}
          {items.controlPanel === 'link' && (
            <Item text="Control Panel" icon={controlPanel} onClick={onClick} />
          )}
          {items.printers === 'link' && (
            <Item onClick={onClick} text="Printers and Faxes" icon={printer} />
          )}
          {hasBottomRight && <div className="menu__separator" />}
          {items.helpSupport === 'link' && (
            <Item text="Help and Support" icon={help} onClick={onClick} />
          )}
          {items.search === 'link' && (
            <Item text="Search" icon={search} onClick={onClick} />
          )}
          {items.run === 'link' && (
            <Item text="Run..." icon={run} onClick={onClick} />
          )}
        </div>
        {/* The Programs cascade pops over the left column and past its right
            edge (ref: left edge ~145px in, bottom ~5px above the footer) */}
        {open === 'All Programs' && (
          <SubMenu
            left="143px"
            bottom="5px"
            data={allProgramsData || AllPrograms}
            onClick={onClick}
            onItemContextMenu={onAllProgramsContextMenu}
          />
        )}
      </section>
      <footer>
        <div className="footer__item" onClick={() => onClick('Log Off')}>
          <img className="footer__item__img" src={lock} alt="" />
          <span>
            <u>L</u>og Off
          </span>
        </div>
        <div
          className="footer__item"
          onClick={() => onClick('Turn Off Computer')}
        >
          <img className="footer__item__img" src={shut} alt="" />
          <span>
            T<u>u</u>rn Off Computer
          </span>
        </div>
      </footer>
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={[
            { label: 'Open', action: 'open', bold: true },
            { type: 'separator' },
            {
              label: pinnedSet.has(ctxMenu.entry.exePath)
                ? 'Unpin from Start menu'
                : 'Pin to Start menu',
              action: 'toggle-pin',
            },
            ...(ctxMenu.isMfu
              ? [{ label: 'Remove from This List', action: 'remove-mfu' }]
              : []),
          ]}
          onAction={onProgramContextAction}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </div>
  );
}
function Item({
  style,
  text,
  action,
  icon,
  bold,
  className,
  onHover = () => {},
  onClick = () => {},
  onContextMenu,
  children,
}) {
  // `action` lets an item display one label but report another on click
  function _onClick() {
    onClick(action || text);
  }
  function onMouseEnter() {
    onHover(text);
  }
  return (
    <div
      className={`menu__item${bold ? ' menu__item--bold' : ''}${
        className ? ` ${className}` : ''
      }`}
      style={style}
      onClick={_onClick}
      onMouseEnter={onMouseEnter}
      onContextMenu={onContextMenu}
    >
      <img className="menu__item__img" src={icon} alt="" />
      <div className="menu__item__texts">
        <div className="menu__item__text ">{text}</div>
        {children}
      </div>
    </div>
  );
}
export default styled(FooterMenu)`
  font-size: 11px;
  line-height: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: #4282d6;
  border-top-left-radius: 5px;
  border-top-right-radius: 5px;
  box-shadow: 2px 4px 2px rgba(0, 0, 0, 0.5);
  animation: ${menuFade} ${MENU_FADE_MS}ms;
  header {
    position: relative;
    align-self: flex-start;
    display: flex;
    align-items: center;
    color: #fff;
    height: 65px;
    padding: 0 5px 0 7px;
    width: 100%;
    border-top-left-radius: 5px;
    border-top-right-radius: 5px;
    background: linear-gradient(
      to bottom,
      #1868ce 0%,
      #0e60cb 12%,
      #0e60cb 20%,
      #1164cf 32%,
      #1667cf 33%,
      #1b6cd3 47%,
      #1e70d9 54%,
      #2476dc 60%,
      #297ae0 65%,
      #3482e3 77%,
      #3786e5 79%,
      #428ee9 90%,
      #4791eb 100%
    );
    overflow: hidden;
  }
  header:before {
    content: '';
    display: block;
    position: absolute;
    top: 1px;
    left: 0;
    width: 100%;
    height: 3px;
    background: linear-gradient(
      to right,
      transparent 0,
      rgb(255, 255, 255, 0.3) 1%,
      rgb(255, 255, 255, 0.5) 2%,
      rgb(255, 255, 255, 0.5) 95%,
      rgb(255, 255, 255, 0.3) 98%,
      rgb(255, 255, 255, 0.2) 99%,
      transparent 100%
    );
    box-shadow: inset 0 -1px 1px #0e60cb;
  }
  .header__img {
    box-sizing: content-box; /* 48px picture inside the 2px frame, like ref */
    width: 48px;
    height: 48px;
    margin-right: 10px;
    border-radius: 3px;
    border: 2px solid #ccd6eb;
  }
  .header__text {
    font-size: 19px;
    font-weight: normal;
    line-height: normal;
    font-family: 'Franklin Gothic Medium', 'Franklin Gothic', 'Segoe UI', Tahoma,
      sans-serif;
    text-shadow: 1px 2px 2px rgba(0, 0, 0, 0.5);
  }
  footer {
    display: flex;
    align-self: flex-end;
    align-items: center;
    justify-content: flex-end;
    color: #fff;
    height: 41px;
    width: 100%;
    background: linear-gradient(
      to bottom,
      #4282d6 0%,
      #3b85e0 3%,
      #418ae3 5%,
      #418ae3 17%,
      #3c87e2 21%,
      #3786e4 26%,
      #3482e3 29%,
      #2e7ee1 39%,
      #2374df 49%,
      #2072db 57%,
      #196edb 62%,
      #176bd8 72%,
      #1468d5 75%,
      #1165d2 83%,
      #0f61cb 88%
    );
  }

  .footer__item {
    padding: 3px;
    display: flex;
    margin-right: 10px;
    align-items: center;
    &:hover {
      background-color: rgba(60, 80, 210, 0.5);
    }
    &:hover:active > * {
      transform: translate(1px, 1px);
    }
  }
  .footer__item__img {
    border-radius: 3px;
    margin-right: 2px;
    width: 22px;
    height: 22px;
  }
  .menu {
    display: flex;
    margin: 0 2px;
    position: relative;
    border-top: 1px solid #385de7;
    box-shadow: 0 1px #385de7;
  }
  .orange-hr {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    display: block;
    height: 2px;
    background: linear-gradient(
      to right,
      rgba(0, 0, 0, 0) 0%,
      #da884a 50%,
      rgba(0, 0, 0, 0) 100%
    );
    border: 0;
  }
  .menu__right {
    background-color: #cbe3ff;
    border-left: solid #3a3aff5e 1px;
    padding: 6px 5px 5px;
    width: 190px;
    color: #00136b;
  }
  .menu__left {
    background-color: #fff;
    padding: 6px 5px 0;
    width: 190px;
    display: flex;
    flex-direction: column;
  }
  .sub_menu {
    border: 1px solid black;
    position: absolute;
    left: 100%;
    bottom: 0;
    background-color: #fff;
    display: flex;
    flex-direction: column;
  }

  .menu__separator {
    height: 7.5px;
    background: linear-gradient(
      to right,
      rgba(0, 0, 0, 0) 0%,
      rgba(0, 0, 0, 0.1) 50%,
      rgba(0, 0, 0, 0) 100%
    );
    border-top: 3px solid transparent;
    border-bottom: 3px solid transparent;
    background-clip: content-box;
  }
  .menu__right .menu__separator {
    background: linear-gradient(
      to right,
      rgba(0, 0, 0, 0) 0%,
      #87b3e2b5 50%,
      rgba(0, 0, 0, 0) 100%
    );
    background-clip: content-box;
  }
  .menu__item {
    padding: 1px;
    display: flex;
    align-items: center;
    margin-bottom: 4px;
  }
  .menu__left .menu__item {
    height: 34px;
  }
  .menu__right .menu__item {
    height: 26px;
    margin-bottom: 4px;
    line-height: 13px;
  }
  .menu__item:hover {
    color: white;
    background-color: #2f71cd;
  }
  .menu__item:hover .menu__item__subtext {
    color: white;
  }
  .menu__item__texts {
    display: flex;
    flex-direction: column;
    justify-content: center;
    height: 100%;
    position: relative;
  }
  .menu__right .menu__item__img {
    margin-right: 3px;
    width: 22px;
    height: 22px;
  }
  .menu__left .menu__item__img {
    margin-right: 3px;
    width: 30px;
    height: 30px;
  }
  /* XP's "Small icons" Customize option: 16px program icons on tighter
     single-line rows (left column only, like the real Start menu) */
  .menu__left--small .menu__item {
    height: 22px;
    margin-bottom: 2px;
  }
  .menu__left--small .menu__item__img {
    width: 16px;
    height: 16px;
    margin-right: 5px;
  }
  .menu__item--bold .menu__item__text {
    font-weight: 700;
  }
  .menu__item__subtext {
    color: rgba(0, 0, 0, 0.4);
    line-height: 12px;
    margin-bottom: 1px;
  }
  .menu__left .menu__item--allprograms {
    height: 24px;
  }
  .menu__item:hover .menu__arrow {
    border-left-color: #fff;
  }
  .menu__arrow {
    border: 3.5px solid transparent;
    border-right: 0;
    border-left-color: #00136b;
    position: absolute;
    left: 146px;
  }
`;
