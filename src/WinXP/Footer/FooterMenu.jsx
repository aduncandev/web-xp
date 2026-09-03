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
import documents from 'assets/windowsIcons/308(32x32).png';
import recentDocuments from 'assets/windowsIcons/301(32x32).png';
import pictures from 'assets/windowsIcons/307(32x32).png';
import music from 'assets/windowsIcons/550(32x32).png';
import computer from 'assets/windowsIcons/676(32x32).png';
import controlPanel from 'assets/windowsIcons/300(32x32).png';
import printer from 'assets/windowsIcons/549(32x32).png';
import setAccess from 'assets/xp/SetProgramAccess(32x32).png';
import help from 'assets/windowsIcons/747(32x32).png';
import search from 'assets/windowsIcons/299(32x32).png';
import run from 'assets/windowsIcons/743(32x32).png';
import user from 'assets/userIcons/skillz.bmp';
import { getUser, getAvatar } from '../../context/users';
import storeBag from 'assets/store/bag.gif';
import empty from 'assets/empty.png';

import { useVFS } from '../../context/VFSContext';
import { EXE_PATHS } from '../../context/vfsConstants';
import { MFU_EXCLUDED, getProgramByPath } from '../apps';
import {
  getStartMenuConfig,
  togglePinned,
  removeFromMfu,
  MFU_SEEDS,
} from '../startMenuConfig';
import { programIcon16, programIcon32 } from '../apps/programMeta';

/** What My Recent Documents shows before anything has been opened. */
const MyRecentDocuments = [{ type: 'item', icon: empty, text: '(Empty)' }];

// Pre-seeded most-frequently-used list lives in the shared config module
// (Clear List needs it too); shown until real usage fills in. Which
// programs the list never shows is a flag on their registry entries.

/** Build a left-column row descriptor for a registered program. */
function programEntry(exePath, small) {
  const program = getProgramByPath(exePath);
  if (!program) return null;
  const icon =
    (small ? programIcon16(exePath) : programIcon32(exePath)) ||
    program.header.icon;
  return {
    exePath,
    icon,
    text: program.displayName,
    // Every launch goes through the shell's 'open:<path>' passthrough. A
    // program used to need a third identity — a display-name "action"
    // string — that the shell then translated straight back into the exe
    // path the caller already had.
    action: `open:${exePath}`,
  };
}

function FooterMenu({
  className,
  userName,
  onClick,
  allProgramsData,
  recentDocumentsData,
}) {
  const vfs = useVFS();
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
  const exeExists = p => vfs.exists(p);
  const resolveEntry = key => {
    const asProgram = programEntry(key, small);
    // a registered program with no exe on disk was uninstalled
    if (asProgram) return exeExists(key) ? asProgram : null;
    const node = vfs.getNode(key);
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
        getProgramByPath(p) &&
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
    // Rows identify themselves; a pinned shortcut that happens to be named
    // 'All Programs' is not the All Programs row
    const text = item.dataset.menuId;
    if (!text) return;
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
  // pinnable, functional or not. Entries carry 'open:<vfs path>' actions -
  // shortcuts to registered programs pin as the program; anything else
  // pins as its VFS path and opens like a normal click would.
  function onAllProgramsContextMenu(e, item) {
    const key = item.action;
    if (typeof key !== 'string' || !key.startsWith('open:')) return;
    const node = vfs.getNode(key.slice(5));
    if (!node) return;
    const target = node.type === 'shortcut' ? node.target : node.path;
    const program = target ? getProgramByPath(target) : null;
    const entry = program
      ? programEntry(program.exePath, small)
      : {
          exePath: node.path,
          icon: node.icon,
          text: node.name,
          action: `open:${node.path}`,
        };
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
    <div className={`${className} xp-startmenu`}>
      <header>
        <span className="header__tile">
          <img
            className="header__img"
            src={getAvatar(getUser(userName)?.avatarKey) || user}
            alt="avatar"
          />
        </span>
        <span className="header__text">{userName}</span>
      </header>
      <section className="menu" onMouseOver={onMouseOver}>
        <hr className="orange-hr" />
        <div className={`menu__left${small ? ' menu__left--small' : ''}`}>
          {settings.showInternet && (
            <Item
              onClick={onClick}
              text="Internet"
              action={`open:${EXE_PATHS.IEXPLORE}`}
              bold
              icon={
                (small
                  ? programIcon16(EXE_PATHS.IEXPLORE)
                  : programIcon32(EXE_PATHS.IEXPLORE)) || ie
              }
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
              id={`pin:${entry.exePath}`}
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
              id={`mfu:${entry.exePath}`}
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
            id="All Programs"
            className="menu__item--allprograms"
            bold
            style={
              hovering === 'All Programs'
                ? {
                    backgroundColor: 'var(--xp-start-hover, #2f71cd)',
                    color: '#FFF',
                  }
                : {}
            }
            onClick={() => openNow('All Programs')}
            text={
              <div style={{ display: 'flex', alignItems: 'center' }}>
                All Programs
                <span className="menu__moreprog-arrow" />
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
                      backgroundColor: 'var(--xp-start-hover, #2f71cd)',
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
                    hovering === 'My Recent Documents'
                      ? 'var(--xp-highlight-text, #fff)'
                      : 'var(--xp-start-right-text, #00136b)',
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
          {(items.setProgramAccess || 'link') === 'link' && (
            <Item
              className="menu__item--tall"
              text="Set Program Access and Defaults"
              icon={setAccess}
              onClick={onClick}
            />
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
            data={allProgramsData || []}
            onClick={onClick}
            onItemContextMenu={onAllProgramsContextMenu}
          />
        )}
      </section>
      <footer>
        <div className="footer__item" onClick={() => onClick('Log Off')}>
          <span className="footer__item__img footer__item__img--logoff" />
          <span>
            <u>L</u>og Off
          </span>
        </div>
        <div
          className="footer__item"
          onClick={() => onClick('Turn Off Computer')}
        >
          <span className="footer__item__img footer__item__img--turnoff" />
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
  id,
  text,
  action,
  icon,
  bold,
  className,
  onClick = () => {},
  onContextMenu,
  children,
}) {
  // `action` lets an item display one label but report another on click
  function _onClick() {
    onClick(action || text);
  }
  return (
    <div
      className={`menu__item${bold ? ' menu__item--bold' : ''}${
        className ? ` ${className}` : ''
      }`}
      // what the hover handler keys on; plain labels serve for the fixed rows
      data-menu-id={id || (typeof text === 'string' ? text : undefined)}
      style={style}
      onClick={_onClick}
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
  font-size: var(--xp-font-ui, 11px);
  image-rendering: pixelated;
  line-height: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: var(--xp-start-body, transparent);
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
    padding: 0 5px 0 1px;
    width: 100%;
    border-top-left-radius: 5px;
    border-top-right-radius: 5px;
    /* the style's user pane bitmap; the gradient is the fallback */
    border: 0 solid transparent;
    border-image: var(--xp-p-startpanel-userpane-1, none);
    background: var(
        --xp-start-header,
        linear-gradient(
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
        )
      );
    overflow: hidden;
  }
  /* the picture in the style's tile: 48px inside its frame */
  .header__tile {
    box-sizing: border-box;
    width: 62px;
    height: 62px;
    padding: 8px 6px 6px 8px;
    margin: 1px 3px 0 0;
    align-self: flex-start;
    flex-shrink: 0;
    border: 0 solid transparent;
    border-image: var(--xp-p-startpanel-userpicture-1, none);
    image-rendering: pixelated;
  }
  .header__img {
    display: block;
    width: 48px;
    height: 48px;
  }
  .header__text {
    font-size: 19px;
    font-weight: normal;
    line-height: normal;
    font-family: 'Franklin Gothic Medium', 'Franklin Gothic', 'Segoe UI', Tahoma,
      sans-serif;
    text-shadow: 2px 2px var(--xp-start-user-shadow, rgba(0, 0, 0, 0.5));
  }
  footer {
    display: flex;
    align-self: flex-end;
    align-items: center;
    justify-content: flex-end;
    color: #fff;
    height: 40px;
    width: 100%;
    border: 0 solid transparent;
    border-image: var(--xp-p-startpanel-logoff-1, none);
    background: var(
        --xp-start-footer,
        linear-gradient(
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
        )
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
  /* the key and the power orb, cut from the style's three-orb strip */
  .footer__item__img {
    margin-right: 2px;
    width: 24px;
    height: 24px;
    background: var(--xp-i-startpanel-logoffbuttons-1, none) no-repeat;
  }
  .footer__item__img--logoff {
    background-position: -24px 0;
  }
  .footer__item__img--turnoff {
    background-position: -48px 0;
  }
  .footer__item:hover .footer__item__img {
    background-image: var(--xp-i-startpanel-logoffbuttons-hot-1, none);
  }
  .menu {
    display: flex;
    margin: 0;
    position: relative;
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
    box-sizing: content-box;
    background-color: var(--xp-start-right, transparent);
    border: 0 solid transparent;
    border-left: solid var(--xp-start-right-border, transparent) 1px;
    border-image: var(--xp-p-startpanel-placeslist-1, none);
    image-rendering: pixelated;
    box-sizing: border-box;
    padding: 6px 8px 5px 6px;
    width: 192px;
    color: var(--xp-start-right-text, #00136b);
  }
  .menu__right .menu__item:hover {
    background-color: var(--xp-start-places-hover, #2f71cd);
  }
  .menu__left {
    background-color: var(--xp-window, #fff);
    border: 0 solid transparent;
    border-image: var(--xp-p-startpanel-proglist-1, none);
    image-rendering: pixelated;
    box-sizing: border-box;
    padding: 8px 5px 0 9px;
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
    height: 2px;
    margin: 2px 0 3px;
    background: var(--xp-i-startpanel-proglistseparator-1, none) center
      no-repeat;
  }
  .menu__right .menu__separator {
    background-image: var(--xp-i-startpanel-placeslistseparator-1, none);
  }
  .menu__item {
    box-sizing: border-box;
    padding: 1px;
    display: flex;
    align-items: center;
    margin-bottom: 4px;
  }
  .menu__left .menu__item {
    height: 36px;
  }
  .menu__right .menu__item {
    height: 26px;
    margin-bottom: 4px;
    line-height: 13px;
  }
  /* a row whose caption wraps stands 36px, like Set Program Access and Defaults */
  .menu__right .menu__item--tall {
    height: 32px;
  }
  .menu__item {
    color: var(--xp-start-prog-text, #000);
  }
  .menu__right .menu__item {
    color: var(--xp-start-right-text, #00136b);
  }
  .menu__item:hover,
  .menu__right .menu__item:hover {
    color: var(--xp-highlight-text, #fff);
  }
  .menu__item:hover {
    background-color: var(--xp-start-hover, #2f71cd);
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
    margin-right: 5px;
    width: 22px;
    height: 22px;
  }
  .menu__left .menu__item__img {
    margin-right: 5px;
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
    margin-bottom: 7px;
  }
  .menu__moreprog-arrow {
    width: 16px;
    height: 20px;
    margin-left: 6px;
    background: var(--xp-i-startpanel-moreprogramsarrow-1, none) center
      no-repeat;
  }
  .menu__item:hover .menu__moreprog-arrow {
    background-image: var(--xp-i-startpanel-moreprogramsarrow-hot-1, none);
  }
  .menu__item:hover .menu__arrow {
    border-left-color: #fff;
  }
  .menu__arrow {
    border: 3.5px solid transparent;
    border-right: 0;
    border-left-color: var(--xp-start-right-text, #00136b);
    position: absolute;
    left: 146px;
  }
`;
