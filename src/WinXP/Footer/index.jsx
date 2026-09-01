import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';

import FooterMenu from './FooterMenu';
import Balloon from 'components/Balloon';
import ContextMenu from 'components/ContextMenu';
import TaskbarProperties from 'components/TaskbarProperties';
import XPTooltip from 'components/XPTooltip';
import startButton from 'assets/windowsIcons/start.png';
import sound from 'assets/windowsIcons/690(16x16).png';
import usb from 'assets/windowsIcons/394(16x16).png';
import risk from 'assets/windowsIcons/229(16x16).png';
import { getArt, hasArt } from '../../xpArt';
import {
  requestClose,
  requestFocus,
  requestMinimize,
  setTaskbarButton,
} from '../shellBus';
import {
  MINIMIZE_ALL,
  CASCADE_WINDOWS,
  TILE_WINDOWS_HORIZONTALLY,
  TILE_WINDOWS_VERTICALLY,
  TOGGLE_MAXIMIZE_APP,
} from '../constants/actions';
import { TASKBAR_HEIGHT } from '../constants';

import { useVolume } from '../../context/VolumeContext';
import { useVFS } from '../../context/VFSContext';
import { getCurrentUserName } from '../../context/users';
import {
  getStartMenuConfig,
  setStartMenuConfig,
  QUICK_LAUNCH_SHOW_DESKTOP,
} from '../startMenuConfig';
import { PROGRAMS } from '../apps';
import { PROGRAM_ICONS_16 } from './FooterMenuData';
import OpenWithDialog from '../../components/OpenWithDialog';
import genericAppIcon from 'assets/windowsIcons/shell32-2(16x16).png';
import VolumeSlider from '../../components/VolumeSlider';

const TASKMGR_PATH = 'C:/WINDOWS/system32/taskmgr.exe';

// Marlett caption glyphs: 2 = restore, 0 = minimize, 1 = maximize, r = close
function getSystemMenuItems(app) {
  const minimized = !!app.minimized;
  const maximized = !!app.maximized;
  const resizable = app.resizable !== false;
  return [
    {
      label: 'Restore',
      action: 'restore',
      glyph: '2',
      disabled: !minimized && !maximized,
      bold: minimized,
    },
    { label: 'Move', action: 'move', disabled: true },
    { label: 'Size', action: 'size', disabled: true },
    { label: 'Minimize', action: 'minimize', glyph: '0', disabled: minimized },
    {
      label: 'Maximize',
      action: 'maximize',
      glyph: '1',
      disabled: (maximized && !minimized) || !resizable,
    },
    { type: 'separator' },
    { label: 'Close', action: 'close', glyph: 'r', bold: !minimized },
  ];
}

const startNormal = getArt('start', startButton);
const startHover = getArt('start-hover', startNormal);
const startPressed = getArt('start-pressed', startNormal);

const getTime = () => {
  const date = new Date();
  let hour = date.getHours();
  let hourPostFix = 'AM';
  let min = date.getMinutes();
  if (hour >= 12) {
    hour -= 12;
    hourPostFix = 'PM';
  }
  if (hour === 0) {
    hour = 12;
  }
  if (min < 10) {
    min = '0' + min;
  }
  return `${hour}:${min} ${hourPostFix}`;
};

const getLongDate = () =>
  new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

function Footer({
  onMouseDownApp,
  apps,
  focusedAppId,
  onMouseDown,
  onClickMenuItem,
  allProgramsData,
  recentDocumentsData,
}) {
  const [time, setTime] = useState(getTime);
  const [menuOn, setMenuOn] = useState(false);
  const [startHovered, setStartHovered] = useState(false);
  const menu = useRef(null);

  const [showVolume, setShowVolume] = useState(false);
  const { volume, setVolume, isMuted, setIsMuted } = useVolume();
  const sliderRef = useRef(null);
  const soundIconRef = useRef(null);

  const vfs = useVFS();
  const [taskbarMenu, setTaskbarMenu] = useState(null);
  const [windowMenu, setWindowMenu] = useState(null);
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const taskbarLocked = vfs.getUserConfig('taskbarLocked', true) !== false;
  const smCfg = getStartMenuConfig(vfs, getCurrentUserName());
  const showClock = smCfg.taskbar.showClock;
  const [qlMenu, setQlMenu] = useState(null); // { x, y, slot }
  const [qlPicker, setQlPicker] = useState(null); // slot index

  // --- Quick Launch (Show Desktop / IE / WMP by default; any slot can be
  // reassigned — a deliberate departure from stock XP) ---
  const quickLaunch = smCfg.taskbar.quickLaunch || [];
  const qlEntry = slot => {
    if (slot === QUICK_LAUNCH_SHOW_DESKTOP) {
      return { icon: getArt('ShowDesktop', null), label: 'Show Desktop' };
    }
    const program = PROGRAMS[slot];
    return {
      // A slot holding something that is not a program still renders — with
      // the generic-application icon — so it can be right-clicked and
      // reassigned instead of silently vanishing from the bar.
      icon:
        PROGRAM_ICONS_16[slot] ||
        (program && program.header.icon) ||
        genericAppIcon,
      label: program
        ? program.displayName || program.name
        : String(slot)
            .split('/')
            .pop(),
    };
  };
  function launchQlSlot(slot) {
    if (slot === QUICK_LAUNCH_SHOW_DESKTOP) {
      requestFocus({ type: MINIMIZE_ALL });
    } else {
      onClickMenuItem(`open:${slot}`);
    }
  }
  function assignQlSlot(index, exePath) {
    const next = [...quickLaunch];
    next[index] = exePath;
    setStartMenuConfig(vfs, getCurrentUserName(), {
      taskbar: { ...smCfg.taskbar, quickLaunch: next },
    });
  }
  const windowMenuApp = windowMenu
    ? apps.find(app => app.id === windowMenu.id)
    : null;

  function toggleMenu(e) {
    e.stopPropagation();
    onMouseDown();
    setMenuOn(on => !on);
  }
  function _onMouseDown(e) {
    if (e.target.closest('.footer__window')) return;
    onMouseDown();
  }
  function _onContextMenu(e) {
    e.preventDefault();
    if (
      e.target.closest('.footer__window') ||
      e.target.closest('.footer__start') ||
      e.target.closest('.footer__start__menu') ||
      e.target.closest('.footer__quicklaunch') ||
      (sliderRef.current && sliderRef.current.contains(e.target))
    ) {
      return;
    }
    setTaskbarMenu({ x: e.clientX, y: e.clientY });
  }
  function _onClickMenuItem(name) {
    onClickMenuItem(name);
    setMenuOn(false);
  }
  function openWindowMenu(id, x, y) {
    setWindowMenu({ id, x, y });
  }
  function onWindowMenuAction(action) {
    const app = windowMenuApp;
    if (!app) return;
    switch (action) {
      case 'restore':
        requestFocus(app.id);
        if (!app.minimized && app.maximized) {
          requestFocus({ type: TOGGLE_MAXIMIZE_APP, payload: app.id });
        }
        break;
      case 'minimize':
        requestMinimize(app.id);
        break;
      case 'maximize':
        requestFocus(app.id);
        if (!app.maximized) {
          requestFocus({ type: TOGGLE_MAXIMIZE_APP, payload: app.id });
        }
        break;
      case 'close':
        requestClose(app.id);
        break;
      default:
    }
  }
  const workArea = () => ({
    width: window.innerWidth,
    height: window.innerHeight - TASKBAR_HEIGHT,
  });
  function onTaskbarMenuAction(action) {
    switch (action) {
      case 'cascade':
        requestFocus({ type: CASCADE_WINDOWS, payload: workArea() });
        break;
      case 'tile-horizontally':
        requestFocus({ type: TILE_WINDOWS_HORIZONTALLY, payload: workArea() });
        break;
      case 'tile-vertically':
        requestFocus({ type: TILE_WINDOWS_VERTICALLY, payload: workArea() });
        break;
      case 'show-desktop':
        requestFocus({ type: MINIMIZE_ALL });
        break;
      case 'task-manager':
        onClickMenuItem(`open:${TASKMGR_PATH}`);
        break;
      case 'lock-taskbar':
        vfs.setUserConfig('taskbarLocked', !taskbarLocked);
        break;
      case 'toolbar-quick-launch':
        setStartMenuConfig(vfs, getCurrentUserName(), {
          taskbar: {
            ...smCfg.taskbar,
            showQuickLaunch: !smCfg.taskbar.showQuickLaunch,
          },
        });
        break;
      case 'properties':
        setPropertiesOpen(true);
        break;
      default:
    }
  }
  const taskbarMenuItems = [
    {
      label: 'Toolbars',
      submenu: [
        { label: 'Address', action: 'toolbar-address', disabled: true },
        { label: 'Links', action: 'toolbar-links', disabled: true },
        { label: 'Language bar', action: 'toolbar-language', disabled: true },
        { label: 'Desktop', action: 'toolbar-desktop', disabled: true },
        {
          label: 'Quick Launch',
          action: 'toolbar-quick-launch',
          checked: smCfg.taskbar.showQuickLaunch,
        },
        { type: 'separator' },
        { label: 'New Toolbar...', action: 'toolbar-new', disabled: true },
      ],
    },
    { type: 'separator' },
    { label: 'Cascade Windows', action: 'cascade' },
    { label: 'Tile Windows Horizontally', action: 'tile-horizontally' },
    { label: 'Tile Windows Vertically', action: 'tile-vertically' },
    { label: 'Show the Desktop', action: 'show-desktop' },
    { type: 'separator' },
    { label: 'Task Manager', action: 'task-manager' },
    { type: 'separator' },
    {
      label: 'Lock the Taskbar',
      action: 'lock-taskbar',
      checked: taskbarLocked,
    },
    { label: 'Properties', action: 'properties' },
  ];
  useEffect(() => {
    const timer = setInterval(() => {
      const newTime = getTime();
      newTime !== time && setTime(newTime);
    }, 1000);
    return () => clearInterval(timer);
  }, [time]);
  useEffect(() => {
    if (!menuOn) return;
    const target = menu.current;
    if (!target) return;
    function handleMouseDown(e) {
      if (e.target.closest('.footer__start')) return;
      if (!target.contains(e.target)) {
        setMenuOn(false);
      }
    }
    window.addEventListener('mousedown', handleMouseDown);
    return () => window.removeEventListener('mousedown', handleMouseDown);
  }, [menuOn]);

  useEffect(() => {
    function handleClickOutside(event) {
      // Close if clicking outside the slider AND outside the sound icon
      if (
        showVolume &&
        sliderRef.current &&
        !sliderRef.current.contains(event.target) &&
        soundIconRef.current &&
        !soundIconRef.current.contains(event.target)
      ) {
        setShowVolume(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showVolume]);

  return (
    <Container onMouseDown={_onMouseDown} onContextMenu={_onContextMenu}>
      <div ref={menu} className="footer__start__menu">
        {menuOn && (
          <FooterMenu
            onClick={_onClickMenuItem}
            allProgramsData={allProgramsData}
            recentDocumentsData={recentDocumentsData}
          />
        )}
      </div>
      <div className="footer__items left">
        <XPTooltip text="Click here to begin" disabled={menuOn}>
          <img
            src={
              menuOn ? startPressed : startHovered ? startHover : startNormal
            }
            alt="start"
            className={`footer__start${menuOn ? ' active' : ''}`}
            onMouseDown={toggleMenu}
            onMouseEnter={() => setStartHovered(true)}
            onMouseLeave={() => setStartHovered(false)}
          />
        </XPTooltip>
        {smCfg.taskbar.showQuickLaunch && (
          <div className="footer__quicklaunch">
            {quickLaunch.map((slot, i) => {
              const entry = qlEntry(slot);
              if (!entry.icon) return null;
              return (
                <XPTooltip key={`${slot}-${i}`} text={entry.label}>
                  <img
                    className="footer__ql"
                    src={entry.icon}
                    alt={entry.label}
                    draggable={false}
                    onMouseDown={e => e.stopPropagation()}
                    onClick={() => launchQlSlot(slot)}
                    onContextMenu={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      setQlMenu({ x: e.clientX, y: e.clientY, slot: i });
                    }}
                  />
                </XPTooltip>
              );
            })}
          </div>
        )}
        {[...apps].map(
          app =>
            !app.header.noFooterWindow && (
              <FooterWindow
                key={app.id}
                id={app.id}
                icon={app.header.icon}
                title={app.header.title}
                onMouseDown={onMouseDownApp}
                onContextMenu={openWindowMenu}
                isFocus={focusedAppId === app.id}
              />
            ),
        )}
      </div>

      <div className="footer__items right">
        <XPTooltip text="Volume">
          <img
            ref={soundIconRef}
            className="footer__icon"
            src={sound}
            alt="Volume"
            onClick={() => setShowVolume(v => !v)}
            onDoubleClick={() => {
              // Double-click opens the full mixer, like the real tray
              setShowVolume(false);
              onClickMenuItem('open:C:/WINDOWS/system32/sndvol32.exe');
            }}
            style={{ cursor: 'pointer' }}
          />
        </XPTooltip>
        <XPTooltip text="Safely Remove Hardware">
          <img className="footer__icon" src={usb} alt="" />
        </XPTooltip>
        <XPTooltip text="Your computer might be at risk">
          <img className="footer__icon" src={risk} alt="" />
        </XPTooltip>
        <div style={{ position: 'relative', width: 0, height: 0 }}>
          <Balloon />
        </div>
        {showClock && (
          <XPTooltip text={getLongDate()}>
            <div className="footer__time">{time}</div>
          </XPTooltip>
        )}
      </div>

      <div ref={sliderRef}>
        {showVolume && (
          <VolumeSlider
            volume={volume}
            onVolumeChange={setVolume}
            isMuted={isMuted}
            onMuteChange={setIsMuted}
          />
        )}
      </div>

      {taskbarMenu && (
        <ContextMenu
          x={taskbarMenu.x}
          y={taskbarMenu.y}
          items={taskbarMenuItems}
          onAction={onTaskbarMenuAction}
          onClose={() => setTaskbarMenu(null)}
        />
      )}
      {windowMenuApp && (
        <ContextMenu
          x={windowMenu.x}
          y={windowMenu.y}
          items={getSystemMenuItems(windowMenuApp)}
          onAction={onWindowMenuAction}
          onClose={() => setWindowMenu(null)}
        />
      )}
      {propertiesOpen && (
        <TaskbarProperties onClose={() => setPropertiesOpen(false)} />
      )}
      {qlMenu && (
        <ContextMenu
          x={qlMenu.x}
          y={qlMenu.y}
          items={[
            { label: 'Open', action: 'open', bold: true },
            { type: 'separator' },
            { label: 'Choose Program...', action: 'choose' },
          ]}
          onAction={action => {
            if (action === 'open') launchQlSlot(quickLaunch[qlMenu.slot]);
            else if (action === 'choose') setQlPicker(qlMenu.slot);
          }}
          onClose={() => setQlMenu(null)}
        />
      )}
      {qlPicker != null && (
        <OpenWithDialog
          mode="choose"
          programsOnly
          title="Choose Program"
          headerText="Choose the program for this Quick Launch button:"
          extraPrograms={[
            {
              exePath: QUICK_LAUNCH_SHOW_DESKTOP,
              name: 'Show Desktop',
              icon: getArt('ShowDesktop', null),
            },
          ]}
          onClose={() => setQlPicker(null)}
          onLaunch={exePath => {
            assignQlSlot(qlPicker, exePath);
            setQlPicker(null);
          }}
        />
      )}
    </Container>
  );
}

function FooterWindow({
  id,
  icon,
  title,
  onMouseDown,
  onContextMenu,
  isFocus,
}) {
  const textRef = useRef(null);
  const buttonRef = useRef(null);
  const [truncated, setTruncated] = useState(false);
  useEffect(() => {
    setTaskbarButton(id, buttonRef.current);
    return () => setTaskbarButton(id, null);
  }, [id]);
  function _onMouseDown(e) {
    if (e.button !== 0) return;
    onMouseDown(id);
  }
  function _onContextMenu(e) {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu(id, e.clientX, e.clientY);
  }
  function _onMouseEnter() {
    const el = textRef.current;
    setTruncated(!!el && el.scrollWidth > el.clientWidth);
  }
  return (
    <XPTooltip text={title} disabled={!truncated}>
      <div
        ref={buttonRef}
        onMouseDown={_onMouseDown}
        onContextMenu={_onContextMenu}
        onMouseEnter={_onMouseEnter}
        className={`footer__window ${isFocus ? 'focus' : 'cover'}`}
      >
        <img className="footer__icon" src={icon} alt={title} />
        <div ref={textRef} className="footer__text">
          {title}
        </div>
      </div>
    </XPTooltip>
  );
}

const Container = styled.footer`
  height: ${TASKBAR_HEIGHT}px;
  background: linear-gradient(
    to bottom,
    #1f2f86 0,
    #3165c4 3%,
    #3682e5 6%,
    #4490e6 10%,
    #3883e5 12%,
    #2b71e0 15%,
    #2663da 18%,
    #235bd6 20%,
    #2258d5 23%,
    #2157d6 38%,
    #245ddb 54%,
    #2562df 86%,
    #245fdc 89%,
    #2158d4 92%,
    #1d4ec0 95%,
    #1941a5 98%
  );
  position: absolute;
  bottom: 0;
  right: 0;
  left: 0;
  display: flex;
  .footer__items.left {
    height: 100%;
    flex: 1;
    overflow: hidden;
  }
  .footer__items.right {
    background-color: #0b77e9;
    flex-shrink: 0;
    background: linear-gradient(
      to bottom,
      #0c59b9 1%,
      #139ee9 6%,
      #18b5f2 10%,
      #139beb 14%,
      #1290e8 19%,
      #0d8dea 63%,
      #0d9ff1 81%,
      #0f9eed 88%,
      #119be9 91%,
      #1392e2 94%,
      #137ed7 97%,
      #095bc9 100%
    );
    border-left: 1px solid #1042af;
    box-shadow: inset 1px 0 1px #18bbff;
    padding: 0 10px;
    margin-left: 10px;
  }
  .footer__items {
    display: flex;
    align-items: center;
  }
  .footer__quicklaunch {
    display: flex;
    align-items: center;
    gap: 1px;
    padding: 0 3px 0 2px;
    margin-right: 7px;
    flex-shrink: 0;
  }
  /* Toolbar-button chrome like the real Quick Launch: flat until hovered,
     then a raised 1px bevel; sunken while pressed */
  .footer__ql {
    box-sizing: content-box;
    width: 16px;
    height: 16px;
    padding: 2px;
    border: 1px solid transparent;
    cursor: pointer;
    &:hover {
      border-color: rgba(255, 255, 255, 0.7) rgba(0, 0, 60, 0.45)
        rgba(0, 0, 60, 0.45) rgba(255, 255, 255, 0.7);
      background: rgba(255, 255, 255, 0.12);
    }
    &:active {
      border-color: rgba(0, 0, 60, 0.45) rgba(255, 255, 255, 0.7)
        rgba(255, 255, 255, 0.7) rgba(0, 0, 60, 0.45);
      background: rgba(0, 0, 60, 0.08);
    }
  }
  .footer__start {
    height: 100%;
    margin-right: 10px;
    position: relative;
    ${hasArt('start-hover')
      ? ''
      : `&:hover:not(.active) {
      filter: brightness(105%);
    }`}
    ${hasArt('start-pressed')
      ? ''
      : `&.active {
      filter: brightness(85%);
    }`}
  }
  .footer__start__menu {
    position: absolute;
    left: 0;
    bottom: 100%;
  }
  .footer__window {
    flex: 1;
    max-width: 150px;
    color: #fff;
    border-radius: 2px;
    margin-top: 2px;
    padding: 0 8px;
    height: 22px;
    font-size: 11px;
    background-color: #3c81f3;
    box-shadow: inset -1px 0px rgba(0, 0, 0, 0.3),
      inset 1px 1px 1px rgba(255, 255, 255, 0.2);
    position: relative;
    display: flex;
    align-items: center;
  }
  .footer__icon {
    height: 15px;
    width: 15px;
  }
  .footer__text {
    position: absolute;
    left: 27px;
    right: 8px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .footer__window.cover:hover {
    background-color: #53a3ff;
    box-shadow: inset -1px 0px rgba(0, 0, 0, 0.3),
      inset 1px 1px 1px rgba(255, 255, 255, 0.2);
  }
  .footer__window.cover:before {
    display: block;
    content: '';
    position: absolute;
    left: -2px;
    top: -2px;
    width: 10px;
    height: 1px;
    border-bottom-right-radius: 50%;
    box-shadow: 2px 2px 3px rgba(255, 255, 255, 0.5);
  }
  .footer__window.cover:hover:active {
    background-color: #1e52b7;
    box-shadow: inset 0 0 1px 1px rgba(0, 0, 0, 0.3),
      inset 1px 0 1px rgba(0, 0, 0, 0.7);
  }
  .footer__window.focus:hover {
    background-color: #3576f3;
  }
  .footer__window.focus:hover:active {
    background-color: #1e52b7;
  }
  .footer__window.focus {
    background-color: #1e52b7;
    box-shadow: inset 0 0 1px 1px rgba(0, 0, 0, 0.2),
      inset 1px 0 1px rgba(0, 0, 0, 0.7);
  }
  .footer__time {
    margin: 0 5px;
    color: #fff;
    font-size: 11px;
    font-weight: lighter;
    text-shadow: none;
  }
`;

export default Footer;
