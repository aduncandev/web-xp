import React, { useState } from 'react';
import styled from 'styled-components';

import XPDialogFrame from '../XPDialogFrame';
import { dialogAt, dialogClient } from '../XPDialogFrame/layout';
import XPButton from '../XPButton';
import CustomizeStartMenu from '../CustomizeStartMenu';
import { useVFS } from '../../context/VFSContext';
import { getCurrentUserName } from '../../context/users';
import {
  getStartMenuConfig,
  setStartMenuConfig,
} from '../../WinXP/startMenuConfig';

// The previews as XP paints them, cropped from the sheet in the VM: eight
// taskbars (lock, grouping and Quick Launch combinations), four notification
// areas (clock, hidden icons) and the two Start menu pictures. explorer.exe's
// own bitmaps carry a Media Player icon that XP SP2 paints over, so the
// captures are the faithful source.
import taskbar146 from 'assets/xp/taskbarprops/taskbar-146.png';
import taskbar147 from 'assets/xp/taskbarprops/taskbar-147.png';
import taskbar148 from 'assets/xp/taskbarprops/taskbar-148.png';
import taskbar149 from 'assets/xp/taskbarprops/taskbar-149.png';
import taskbar150 from 'assets/xp/taskbarprops/taskbar-150.png';
import taskbar151 from 'assets/xp/taskbarprops/taskbar-151.png';
import taskbar152 from 'assets/xp/taskbarprops/taskbar-152.png';
import taskbar153 from 'assets/xp/taskbarprops/taskbar-153.png';
import tray180 from 'assets/xp/taskbarprops/tray-180.png';
import tray181 from 'assets/xp/taskbarprops/tray-181.png';
import tray182 from 'assets/xp/taskbarprops/tray-182.png';
import tray183 from 'assets/xp/taskbarprops/tray-183.png';
import startMenuXP from 'assets/xp/taskbarprops/startmenu-xp.png';
import startMenuClassic from 'assets/xp/taskbarprops/startmenu-classic.png';

const TASKBAR_PREVIEWS = [
  taskbar146,
  taskbar147,
  taskbar148,
  taskbar149,
  taskbar150,
  taskbar151,
  taskbar152,
  taskbar153,
];
const TRAY_PREVIEWS = [tray180, tray181, tray182, tray183];

const WIDTH = 404;
const HEIGHT = 455;

/**
 * Taskbar and Start Menu Properties (right-click taskbar > Properties).
 *
 * Laid out at the pixel positions of the XP sheet. Wired settings: "Lock
 * the taskbar" (per-user 'taskbarLocked', shared with the taskbar context
 * menu), "Show the clock" and "Show Quick Launch" (setStartMenuConfig).
 * The other checkboxes only change the preview. The Start Menu tab opens
 * the Customize Start Menu dialog.
 */
export default function TaskbarProperties({ onClose }) {
  const vfs = useVFS();
  const userName = getCurrentUserName();
  const [initial] = useState(() => ({
    locked: vfs.getUserConfig('taskbarLocked', true) !== false,
    showClock: getStartMenuConfig(vfs, userName).taskbar.showClock,
    showQuickLaunch: getStartMenuConfig(vfs, userName).taskbar.showQuickLaunch,
  }));

  const [tab, setTab] = useState('taskbar');
  const [dirty, setDirty] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);

  const [locked, setLocked] = useState(initial.locked);
  const [inert, setInert] = useState({
    autoHide: false,
    keepOnTop: true,
    groupButtons: true,
    hideInactive: true,
  });
  const [showQuickLaunch, setShowQuickLaunch] = useState(
    initial.showQuickLaunch,
  );
  const [showClock, setShowClock] = useState(initial.showClock);
  // the Classic Start menu is not implemented, so its picture never shows
  const [menuStyle] = useState('xp');

  const touch = () => setDirty(true);
  const toggleInert = key => setInert(s => ({ ...s, [key]: !s[key] }));

  const apply = () => {
    try {
      vfs.setUserConfig('taskbarLocked', locked);
    } catch {
      // hive unavailable: session only
    }
    setStartMenuConfig(vfs, userName, {
      taskbar: { showClock, showQuickLaunch },
    });
    setDirty(false);
  };

  const check = (x, y, checked, onChange, label) => (
    <label className="tp__check" style={dialogAt(x, y)}>
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span>{label}</span>
    </label>
  );

  const taskbarPreview =
    TASKBAR_PREVIEWS[
      (locked ? 0 : 1) +
        (inert.groupButtons ? 0 : 2) +
        (showQuickLaunch ? 0 : 4)
    ];
  const trayPreview =
    TRAY_PREVIEWS[(showClock ? 0 : 1) + (inert.hideInactive ? 0 : 2)];

  const renderTaskbar = () => (
    <>
      <fieldset className="xp-group" style={dialogAt(22, 68, 360, 169)}>
        <legend>Taskbar appearance</legend>
      </fieldset>
      <img
        className="tp__preview"
        style={dialogAt(34, 88, 336, 35)}
        src={taskbarPreview}
        alt=""
        draggable={false}
      />
      {check(
        33,
        132,
        locked,
        () => {
          setLocked(v => !v);
          touch();
        },
        'Lock the taskbar',
      )}
      {check(
        33,
        153,
        inert.autoHide,
        () => {
          toggleInert('autoHide');
          touch();
        },
        'Auto-hide the taskbar',
      )}
      {check(
        33,
        174,
        inert.keepOnTop,
        () => {
          toggleInert('keepOnTop');
          touch();
        },
        'Keep the taskbar on top of other windows',
      )}
      {check(
        33,
        196,
        inert.groupButtons,
        () => {
          toggleInert('groupButtons');
          touch();
        },
        'Group similar taskbar buttons',
      )}
      {check(
        33,
        217,
        showQuickLaunch,
        () => {
          setShowQuickLaunch(v => !v);
          touch();
        },
        'Show Quick Launch',
      )}

      <fieldset className="xp-group" style={dialogAt(22, 243, 360, 159)}>
        <legend>Notification area</legend>
      </fieldset>
      <img
        className="tp__preview"
        style={dialogAt(34, 264, 336, 35)}
        src={trayPreview}
        alt=""
        draggable={false}
      />
      {check(
        33,
        308,
        showClock,
        () => {
          setShowClock(v => !v);
          touch();
        },
        'Show the clock',
      )}
      <div className="tp__text" style={dialogAt(33, 333, 340)}>
        You can keep the notification area uncluttered by hiding icons that you
        have not clicked recently.
      </div>
      {check(
        33,
        369,
        inert.hideInactive,
        () => {
          toggleInert('hideInactive');
          touch();
        },
        'Hide inactive icons',
      )}
      <div className="tp__abs" style={dialogAt(295, 368, 75, 23)}>
        {/* Notification-area customization is not implemented */}
        <XPButton disabled>Customize...</XPButton>
      </div>
    </>
  );

  const renderStartMenu = () => (
    <>
      <img
        className="tp__preview"
        style={dialogAt(25, 70, 300, 180)}
        src={menuStyle === 'classic' ? startMenuClassic : startMenuXP}
        alt=""
        draggable={false}
      />
      <label className="tp__check" style={dialogAt(24, 278)}>
        <input type="radio" name="tp-menustyle" checked readOnly />
        <span>
          <b>Start menu</b>
        </span>
      </label>
      <div className="tp__abs" style={dialogAt(301, 273, 80, 23)}>
        <XPButton onClick={() => setCustomizeOpen(true)}>Customize...</XPButton>
      </div>
      <div className="tp__text" style={dialogAt(44, 294, 300)}>
        Select this menu style for easy access to the Internet, e-mail, and your
        favorite programs.
      </div>
      {/* The Classic Start menu is not implemented */}
      <label
        className="tp__check tp__check--disabled"
        style={dialogAt(24, 343)}
      >
        <input
          type="radio"
          name="tp-menustyle"
          checked={false}
          disabled
          readOnly
        />
        <span>
          <b>Classic Start menu</b>
        </span>
      </label>
      <div className="tp__abs" style={dialogAt(301, 338, 80, 23)}>
        <XPButton disabled>Customize...</XPButton>
      </div>
      <div
        className="tp__text tp__text--disabled"
        style={dialogAt(44, 359, 300)}
      >
        Select this option to use the menu style from earlier versions of
        Windows.
      </div>
    </>
  );

  return (
    <XPDialogFrame
      title="Taskbar and Start Menu Properties"
      width={WIDTH}
      onClose={onClose}
      zIndex={99975}
    >
      <Body style={dialogClient(WIDTH, HEIGHT)}>
        <div className="tp__tabs" style={dialogAt(11, 36)}>
          {[
            { key: 'taskbar', label: 'Taskbar' },
            { key: 'startmenu', label: 'Start Menu' },
          ].map(t => (
            <div
              key={t.key}
              className={`tp__tab${tab === t.key ? ' tp__tab--active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </div>
          ))}
        </div>
        <div className="tp__page" style={dialogAt(9, 56, 386, 360)} />
        {tab === 'taskbar' ? renderTaskbar() : renderStartMenu()}
        <div className="tp__abs" style={dialogAt(158, 422, 75, 23)}>
          <XPButton
            onClick={() => {
              apply();
              onClose();
            }}
          >
            OK
          </XPButton>
        </div>
        <div className="tp__abs" style={dialogAt(239, 422, 75, 23)}>
          <XPButton onClick={onClose}>Cancel</XPButton>
        </div>
        <div className="tp__abs" style={dialogAt(320, 422, 75, 23)}>
          <XPButton disabled={!dirty} onClick={apply}>
            Apply
          </XPButton>
        </div>
      </Body>
      {customizeOpen && (
        <CustomizeStartMenu onClose={() => setCustomizeOpen(false)} />
      )}
    </XPDialogFrame>
  );
}

const Body = styled.div`
  position: relative;
  box-sizing: border-box;
  font-size: 11px;
  font-family: Tahoma, 'Noto Sans', sans-serif;
  color: #000;

  .tp__tabs {
    position: absolute;
    display: flex;
    align-items: flex-end;
  }
  .tp__tab {
    cursor: default;
  }
  .tp__page {
    position: absolute;
    box-sizing: border-box;
  }
  .tp__abs {
    position: absolute;
    box-sizing: border-box;
    z-index: 1;
  }
  .tp__abs > .xp-button {
    width: 100%;
    height: 100%;
    min-width: 0;
    padding: 0 2px;
  }
  .xp-group {
    position: absolute;
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    min-width: 0;
    z-index: 1;
    pointer-events: none;
  }
  .xp-group > legend {
    box-sizing: border-box;
    height: 13px;
    margin-left: 8px;
    padding: 0 2px;
    line-height: 13px;
    color: var(--xp-group-box-text, #0046d5);
  }
  .tp__preview {
    position: absolute;
    display: block;
    image-rendering: pixelated;
    z-index: 1;
  }
  .tp__check {
    position: absolute;
    display: flex;
    align-items: flex-start;
    gap: 3px;
    height: 13px;
    line-height: 13px;
    white-space: nowrap;
    cursor: default;
    z-index: 1;
    input {
      margin: 0;
      flex-shrink: 0;
    }
  }
  .tp__check--disabled span,
  .tp__text--disabled {
    color: var(--xp-gray-text, #aca899);
  }
  .tp__text {
    position: absolute;
    line-height: 13px;
    z-index: 1;
  }
`;
