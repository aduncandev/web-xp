import React, { useState, useEffect, useRef } from 'react';

import FooterMenu from './FooterMenu';
import Balloon from 'components/Balloon';
import ContextMenu from 'components/ContextMenu';
import TaskbarProperties from 'components/TaskbarProperties';
import XPTooltip from 'components/XPTooltip';
import startButton from 'assets/windowsIcons/start.png';
import usb from 'assets/windowsIcons/394(16x16).png';
import risk from 'assets/windowsIcons/229(16x16).png';
import { getArt } from '../../xpArt';
import {
  ARRANGE,
  requestArrange,
  requestClose,
  requestFocus,
  requestMinimize,
  requestToggleMaximize,
} from '../shellBus';
import { TASKBAR_HEIGHT } from '../constants';
import { useVFS } from '../../context/VFSContext';
import { EXE_PATHS } from '../../context/vfsConstants';
import { getStartMenuConfig, setStartMenuConfig } from '../startMenuConfig';
import Clock from './Clock';
import TrayVolume from './TrayVolume';
import QuickLaunch from './QuickLaunch';
import FooterWindow from './FooterWindow';
import { systemMenuItems, taskbarMenuItems } from './menus';
import { Container } from './styles';

const startNormal = getArt('start', startButton);
const startHover = getArt('start-hover', startNormal);
const startPressed = getArt('start-pressed', startNormal);

function Footer({
  userName,
  onMouseDownApp,
  apps,
  focusedAppId,
  onMouseDown,
  onClickMenuItem,
  allProgramsData,
  recentDocumentsData,
}) {
  const [menuOn, setMenuOn] = useState(false);
  const [startHovered, setStartHovered] = useState(false);
  const menu = useRef(null);

  const vfs = useVFS();
  const [taskbarMenu, setTaskbarMenu] = useState(null);
  const [windowMenu, setWindowMenu] = useState(null);
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  // This session's own settings, not the on-screen user's: fast user
  // switching keeps backgrounded taskbars mounted too
  const taskbarLocked =
    vfs.getUserConfigFor(userName, 'taskbarLocked', true) !== false;
  const smCfg = getStartMenuConfig(vfs, userName);
  const windowMenuApp = windowMenu
    ? apps.find(app => app.id === windowMenu.id)
    : null;
  const launch = exePath => onClickMenuItem(`open:${exePath}`);

  function toggleMenu(e) {
    e.stopPropagation();
    onMouseDown();
    setMenuOn(on => !on);
  }
  function _onMouseDown(e) {
    if (e.target.closest('.footer__window')) return;
    onMouseDown();
  }
  // The strips with menus of their own (window buttons, Quick Launch, the
  // volume slider) stop the event before it gets here
  function _onContextMenu(e) {
    e.preventDefault();
    if (
      e.target.closest('.footer__start') ||
      e.target.closest('.footer__start__menu')
    )
      return;
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
        if (!app.minimized && app.maximized) requestToggleMaximize(app.id);
        break;
      case 'minimize':
        requestMinimize(app.id);
        break;
      case 'maximize':
        requestFocus(app.id);
        if (!app.maximized) requestToggleMaximize(app.id);
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
        requestArrange(ARRANGE.CASCADE, workArea());
        break;
      case 'tile-horizontally':
        requestArrange(ARRANGE.TILE_HORIZONTAL, workArea());
        break;
      case 'tile-vertically':
        requestArrange(ARRANGE.TILE_VERTICAL, workArea());
        break;
      case 'show-desktop':
        requestArrange(ARRANGE.SHOW_DESKTOP);
        break;
      case 'task-manager':
        launch(EXE_PATHS.TASKMGR);
        break;
      case 'lock-taskbar':
        vfs.setUserConfigFor(userName, 'taskbarLocked', !taskbarLocked);
        break;
      case 'toolbar-quick-launch':
        setStartMenuConfig(vfs, userName, {
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

  // The Start menu closes on a press anywhere outside it
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

  return (
    <Container onMouseDown={_onMouseDown} onContextMenu={_onContextMenu}>
      <div ref={menu} className="footer__start__menu">
        {menuOn && (
          <FooterMenu
            userName={userName}
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
          <>
            {!taskbarLocked && <div className="footer__grip" />}
            <QuickLaunch
              vfs={vfs}
              userName={userName}
              taskbar={smCfg.taskbar}
              onLaunch={launch}
            />
          </>
        )}
        {/* Unlocking the taskbar shows the toolbars' drag grips */}
        {!taskbarLocked && <div className="footer__grip" />}
        {apps.map(
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
        <TrayVolume onOpenMixer={() => launch(EXE_PATHS.SNDVOL32)} />
        <XPTooltip text="Safely Remove Hardware">
          <img className="footer__icon" src={usb} alt="" />
        </XPTooltip>
        <XPTooltip text="Your computer might be at risk">
          <img className="footer__icon" src={risk} alt="" />
        </XPTooltip>
        <div style={{ position: 'relative', width: 0, height: 0 }}>
          <Balloon />
        </div>
        {smCfg.taskbar.showClock && <Clock />}
      </div>

      {taskbarMenu && (
        <ContextMenu
          x={taskbarMenu.x}
          y={taskbarMenu.y}
          items={taskbarMenuItems({
            showQuickLaunch: smCfg.taskbar.showQuickLaunch,
            taskbarLocked,
          })}
          onAction={onTaskbarMenuAction}
          onClose={() => setTaskbarMenu(null)}
        />
      )}
      {windowMenuApp && (
        <ContextMenu
          x={windowMenu.x}
          y={windowMenu.y}
          items={systemMenuItems(windowMenuApp)}
          onAction={onWindowMenuAction}
          onClose={() => setWindowMenu(null)}
        />
      )}
      {propertiesOpen && (
        <TaskbarProperties onClose={() => setPropertiesOpen(false)} />
      )}
    </Container>
  );
}

export default Footer;
