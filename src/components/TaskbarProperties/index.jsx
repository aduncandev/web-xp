import React, { useState } from 'react';
import styled from 'styled-components';

import XPDialogFrame from '../XPDialogFrame';
import XPButton from '../XPButton';
import CustomizeStartMenu from '../CustomizeStartMenu';
import { useVFS } from '../../context/VFSContext';
import { getCurrentUserName } from '../../context/users';
import {
  getStartMenuConfig,
  setStartMenuConfig,
} from '../../WinXP/startMenuConfig';

/**
 * Taskbar and Start Menu Properties (right-click taskbar > Properties).
 *
 * Wired settings: "Lock the taskbar" (per-user 'taskbarLocked', shared
 * with the taskbar context menu) and "Show the clock"
 * (cfg.taskbar.showClock via setStartMenuConfig). The other Taskbar tab
 * checkboxes are faithful-but-inert. The Start Menu tab opens the
 * Customize Start Menu dialog.
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

  // Taskbar appearance — only Lock the taskbar persists; the rest are
  // faithful-but-inert (their behaviors are not implemented).
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
  // Notification area
  const [showClock, setShowClock] = useState(initial.showClock);

  const touch = () => setDirty(true);
  const toggleInert = key => setInert(s => ({ ...s, [key]: !s[key] }));

  const apply = () => {
    try {
      vfs.setUserConfig('taskbarLocked', locked);
    } catch {
      // hive unavailable — session only
    }
    setStartMenuConfig(vfs, userName, {
      taskbar: { showClock, showQuickLaunch },
    });
    setDirty(false);
  };

  const check = (checked, onChange, label, disabled) => (
    <label className={`tp__row${disabled ? ' tp__row--disabled' : ''}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
      <span>{label}</span>
    </label>
  );

  const renderTaskbar = () => (
    <>
      <fieldset className="tp__group">
        <legend>Taskbar appearance</legend>
        <div className="tp__preview">
          <div className="tp__preview-taskbar">
            <div className="tp__preview-clockless" />
          </div>
        </div>
        {check(
          locked,
          () => {
            setLocked(v => !v);
            touch();
          },
          'Lock the taskbar',
        )}
        {check(
          inert.autoHide,
          () => {
            toggleInert('autoHide');
            touch();
          },
          'Auto-hide the taskbar',
        )}
        {check(
          inert.keepOnTop,
          () => {
            toggleInert('keepOnTop');
            touch();
          },
          'Keep the taskbar on top of other windows',
        )}
        {check(
          inert.groupButtons,
          () => {
            toggleInert('groupButtons');
            touch();
          },
          'Group similar taskbar buttons',
        )}
        {check(
          showQuickLaunch,
          () => {
            setShowQuickLaunch(v => !v);
            touch();
          },
          'Show Quick Launch',
        )}
      </fieldset>

      <fieldset className="tp__group">
        <legend>Notification area</legend>
        <div className="tp__preview">
          <div className="tp__preview-tray">
            <span className="tp__preview-clock">1:23 PM</span>
          </div>
        </div>
        {check(
          showClock,
          () => {
            setShowClock(v => !v);
            touch();
          },
          'Show the clock',
        )}
        <div className="tp__text">
          You can keep the notification area uncluttered by hiding icons that
          you have not clicked recently.
        </div>
        {check(
          inert.hideInactive,
          () => {
            toggleInert('hideInactive');
            touch();
          },
          'Hide inactive icons',
        )}
        <div className="tp__customize-row">
          {/* Notification-area customization is not implemented */}
          <XPButton disabled>Customize...</XPButton>
        </div>
      </fieldset>
    </>
  );

  const renderStartMenu = () => (
    <>
      <div className="tp__sm-preview">
        {/* CSS-only silhouette of the Luna Start menu (no artwork) */}
        <div className="tp__sm-menu">
          <div className="tp__sm-header" />
          <div className="tp__sm-columns">
            <div className="tp__sm-left">
              {[0, 1, 2, 3, 4, 5].map(i => (
                <div key={i} className="tp__sm-line" />
              ))}
            </div>
            <div className="tp__sm-right">
              {[0, 1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="tp__sm-line tp__sm-line--right" />
              ))}
            </div>
          </div>
          <div className="tp__sm-footer" />
        </div>
      </div>

      <div className="tp__sm-choice">
        <label className="tp__row">
          <input type="radio" name="tp-menustyle" checked readOnly />
          <span>
            <b>Start menu</b>
          </span>
        </label>
        <XPButton onClick={() => setCustomizeOpen(true)}>Customize...</XPButton>
      </div>
      <div className="tp__sm-desc">
        Select this menu style for easy access to the Internet, e-mail, and your
        favorite programs.
      </div>

      <div className="tp__sm-choice">
        {/* The Classic Start menu is not implemented */}
        <label className="tp__row tp__row--disabled">
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
        <XPButton disabled>Customize...</XPButton>
      </div>
      <div className="tp__sm-desc tp__sm-desc--disabled">
        Select this option to use the menu style from earlier versions of
        Windows.
      </div>
    </>
  );

  return (
    <XPDialogFrame
      title="Taskbar and Start Menu Properties"
      width={380}
      onClose={onClose}
      zIndex={99975}
    >
      <Body>
        <div className="tp__tabs">
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
        <div className="tp__page">
          {tab === 'taskbar' ? renderTaskbar() : renderStartMenu()}
        </div>
        <div className="tp__buttons">
          <XPButton
            onClick={() => {
              apply();
              onClose();
            }}
          >
            OK
          </XPButton>
          <XPButton onClick={onClose}>Cancel</XPButton>
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
  padding: 8px 8px 10px;
  font-size: 11px;
  font-family: Tahoma, 'Noto Sans', sans-serif;

  .tp__tabs {
    display: flex;
    margin-left: 2px;
  }
  .tp__tab {
    padding: 3px 12px 4px;
    border: 1px solid #919b9c;
    border-bottom: none;
    border-radius: 3px 3px 0 0;
    background: linear-gradient(to bottom, #fff, #f0efe4);
    margin-right: 2px;
    cursor: default;
    position: relative;
    top: 1px;
  }
  .tp__tab--active {
    background: #fcfcfe;
    padding-top: 4px;
    top: 0;
    border-top: 2px solid #e68b2c;
    z-index: 1;
  }
  .tp__page {
    border: 1px solid #919b9c;
    background: #fcfcfe;
    padding: 12px 10px;
    min-height: 328px;
  }
  .tp__group {
    border: 1px solid #d0d0bf;
    border-radius: 3px;
    margin: 0 0 10px;
    padding: 6px 10px 8px;
    legend {
      color: #0046d5;
      padding: 0 2px;
    }
  }
  .tp__row {
    display: flex;
    align-items: flex-start;
    gap: 5px;
    margin: 3px 0;
    cursor: default;
    input {
      margin: 0;
      flex-shrink: 0;
    }
    span {
      line-height: 14px;
    }
  }
  .tp__row--disabled span {
    color: #a0a0a0;
  }
  .tp__text {
    line-height: 13px;
    margin: 6px 0 2px;
  }
  .tp__preview {
    border: 1px solid #7f9db9;
    box-shadow: inset 1px 1px 1px rgba(0, 0, 0, 0.15);
    background: #fff;
    padding: 2px;
    margin: 2px 0 8px;
  }
  .tp__preview-taskbar,
  .tp__preview-tray {
    height: 22px;
    background: linear-gradient(
      to bottom,
      #1f2f86 0,
      #3165c4 3%,
      #3682e5 6%,
      #4490e6 10%,
      #2b71e0 15%,
      #2258d5 23%,
      #2157d6 38%,
      #245ddb 54%,
      #2562df 86%,
      #2158d4 92%,
      #1941a5 98%
    );
  }
  .tp__preview-tray {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    background: linear-gradient(
      to bottom,
      #0c59b9 1%,
      #139ee9 6%,
      #18b5f2 10%,
      #1290e8 19%,
      #0d8dea 63%,
      #0d9ff1 81%,
      #119be9 91%,
      #137ed7 97%,
      #095bc9 100%
    );
  }
  .tp__preview-clock {
    color: #fff;
    font-size: 10px;
    padding-right: 6px;
  }
  .tp__customize-row {
    display: flex;
    justify-content: flex-end;
    margin-top: 4px;
  }

  .tp__sm-preview {
    border: 1px solid #7f9db9;
    box-shadow: inset 1px 1px 1px rgba(0, 0, 0, 0.15);
    background: #5a7edc;
    padding: 12px 16px;
    margin: 0 0 10px;
    display: flex;
    justify-content: center;
  }
  .tp__sm-menu {
    width: 210px;
    border: 1px solid #003c74;
    border-radius: 4px 4px 0 0;
    overflow: hidden;
    background: #fff;
  }
  .tp__sm-header {
    height: 26px;
    background: linear-gradient(
      to bottom,
      #1b58ce 0%,
      #2c68e0 50%,
      #1b58ce 100%
    );
  }
  .tp__sm-columns {
    display: flex;
    height: 96px;
  }
  .tp__sm-left {
    flex: 1;
    background: #fff;
    padding: 6px;
  }
  .tp__sm-right {
    flex: 1;
    background: #cbdcf6;
    border-left: 1px solid #a9bcda;
    padding: 6px;
  }
  .tp__sm-line {
    height: 5px;
    border-radius: 2px;
    background: #d5d5cf;
    margin: 0 0 8px;
  }
  .tp__sm-line--right {
    background: #a9bfe0;
    margin-bottom: 6px;
  }
  .tp__sm-footer {
    height: 12px;
    background: linear-gradient(to bottom, #2c68e0 0%, #1b58ce 100%);
  }
  .tp__sm-choice {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 4px 0 0;
    .tp__row {
      margin: 0;
    }
  }
  .tp__sm-desc {
    margin: 2px 0 10px 19px;
    line-height: 13px;
  }
  .tp__sm-desc--disabled {
    color: #a0a0a0;
  }

  .tp__buttons {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    margin-top: 10px;
  }
`;
