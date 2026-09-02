import React, { useState } from 'react';
import styled from 'styled-components';

import XPDialogFrame from '../XPDialogFrame';
import XPButton from '../XPButton';
import XPSelect from '../XPSelect';
import { useVFS } from '../../context/VFSContext';
import { getCurrentUserName } from '../../context/users';
import {
  getStartMenuConfig,
  setStartMenuConfig,
  clearMfu,
} from '../../WinXP/startMenuConfig';

import ieLarge from 'assets/windowsIcons/ie.png';
import ieSmall from 'assets/windowsIcons/896(16x16).png';
import controlPanelIcon from 'assets/windowsIcons/300(16x16).png';
import myComputerIcon from 'assets/windowsIcons/676(16x16).png';
import myDocumentsIcon from 'assets/windowsIcons/308(16x16).png';
import myMusicIcon from 'assets/windowsIcons/550(32x32).png';
import myPicturesIcon from 'assets/windowsIcons/307(32x32).png';

// "Start menu items" list — alphabetical, like the real dialog.
// kind 'radios': Display as a link / menu / Don't display (menu not
// implemented, so that radio is disabled). kind 'check': plain checkbox
// (checked = 'link', unchecked = 'hide').
const START_MENU_ITEMS = [
  {
    key: 'controlPanel',
    label: 'Control Panel',
    kind: 'radios',
    icon: controlPanelIcon,
  },
  { key: 'helpSupport', label: 'Help and Support', kind: 'check' },
  {
    key: 'myComputer',
    label: 'My Computer',
    kind: 'radios',
    icon: myComputerIcon,
  },
  {
    key: 'myDocuments',
    label: 'My Documents',
    kind: 'radios',
    icon: myDocumentsIcon,
  },
  { key: 'myMusic', label: 'My Music', kind: 'radios', icon: myMusicIcon },
  {
    key: 'myPictures',
    label: 'My Pictures',
    kind: 'radios',
    icon: myPicturesIcon,
  },
  { key: 'printers', label: 'Printers and Faxes', kind: 'check' },
  { key: 'run', label: 'Run command', kind: 'check' },
  { key: 'search', label: 'Search', kind: 'check' },
];

/**
 * Customize Start Menu — opened from the Start Menu tab of Taskbar and
 * Start Menu Properties. OK commits everything through setStartMenuConfig;
 * Cancel discards (the two Clear List buttons act immediately, like the
 * real dialog).
 */
export default function CustomizeStartMenu({ onClose }) {
  const vfs = useVFS();
  const userName = getCurrentUserName();
  const [initial] = useState(() => getStartMenuConfig(vfs, userName).settings);

  const [tab, setTab] = useState('general');
  const [iconSize, setIconSize] = useState(initial.iconSize);
  const [mfuCount, setMfuCount] = useState(initial.mfuCount);
  const [showInternet, setShowInternet] = useState(initial.showInternet);
  const [showEmail, setShowEmail] = useState(initial.showEmail);
  const [hoverSubmenus, setHoverSubmenus] = useState(initial.hoverSubmenus);
  const [highlightNew, setHighlightNew] = useState(true); // inert
  const [recentDocs, setRecentDocs] = useState(initial.recentDocs);
  const [items, setItems] = useState({ ...initial.items });

  const clampCount = n => Math.max(0, Math.min(30, n));
  const setItem = (key, value) => setItems(s => ({ ...s, [key]: value }));

  const ok = () => {
    setStartMenuConfig(vfs, userName, {
      settings: {
        iconSize,
        mfuCount: clampCount(Number(mfuCount) || 0),
        showInternet,
        showEmail,
        hoverSubmenus,
        recentDocs,
        items,
      },
    });
    onClose();
  };

  const onCountInput = e => {
    const digits = e.target.value.replace(/\D/g, '');
    setMfuCount(digits === '' ? '' : clampCount(parseInt(digits, 10)));
  };
  const bumpCount = delta =>
    setMfuCount(c => clampCount((Number(c) || 0) + delta));

  const renderGeneral = () => (
    <>
      <fieldset className="csm__group">
        <legend>Select an icon size for programs</legend>
        <div className="csm__icon-row">
          <img
            className="csm__icon-lg"
            src={ieLarge}
            alt=""
            draggable={false}
          />
          <label className="csm__row">
            <input
              type="radio"
              name="csm-iconsize"
              checked={iconSize === 'large'}
              onChange={() => setIconSize('large')}
            />
            <span>Large icons</span>
          </label>
          <img
            className="csm__icon-sm"
            src={ieSmall}
            alt=""
            draggable={false}
          />
          <label className="csm__row">
            <input
              type="radio"
              name="csm-iconsize"
              checked={iconSize === 'small'}
              onChange={() => setIconSize('small')}
            />
            <span>Small icons</span>
          </label>
        </div>
      </fieldset>

      <fieldset className="csm__group">
        <legend>Programs</legend>
        <div className="csm__text">
          The Start menu contains shortcuts to the programs you use most often.
          Clearing the list of shortcuts does not delete the programs.
        </div>
        <div className="csm__count-row">
          <span>Number of programs on Start menu:</span>
          <span className="csm__spinner">
            <input
              type="text"
              value={mfuCount}
              onChange={onCountInput}
              onBlur={() => setMfuCount(c => clampCount(Number(c) || 0))}
            />
            <span className="csm__spinner-buttons">
              <button
                type="button"
                tabIndex={-1}
                onClick={() => bumpCount(1)}
                aria-label="Increase"
              >
                <i className="up" />
              </button>
              <button
                type="button"
                tabIndex={-1}
                onClick={() => bumpCount(-1)}
                aria-label="Decrease"
              >
                <i className="down" />
              </button>
            </span>
          </span>
        </div>
        <div className="csm__clear-row">
          <XPButton onClick={() => clearMfu(vfs, userName)}>
            Clear List
          </XPButton>
        </div>
      </fieldset>

      <fieldset className="csm__group">
        <legend>Show on Start menu</legend>
        <div className="csm__show-row">
          <label className="csm__row">
            <input
              type="checkbox"
              checked={showInternet}
              onChange={() => setShowInternet(v => !v)}
            />
            <span>Internet:</span>
          </label>
          <XPSelect
            className="csm__select"
            disabled
            options={[{ value: 'ie', label: 'Internet Explorer' }]}
            value="ie"
          />
        </div>
        <div className="csm__show-row">
          <label className="csm__row">
            <input
              type="checkbox"
              checked={showEmail}
              onChange={() => setShowEmail(v => !v)}
            />
            <span>Shop:</span>
          </label>
          <XPSelect
            className="csm__select"
            disabled
            options={[{ value: 'shop', label: 'XP Shop' }]}
            value="shop"
          />
        </div>
      </fieldset>
    </>
  );

  const renderAdvanced = () => (
    <>
      <fieldset className="csm__group">
        <legend>Start menu settings</legend>
        <label className="csm__row">
          <input
            type="checkbox"
            checked={hoverSubmenus}
            onChange={() => setHoverSubmenus(v => !v)}
          />
          <span>Open submenus when I pause on them with my mouse</span>
        </label>
        <label className="csm__row">
          <input
            type="checkbox"
            checked={highlightNew}
            onChange={() => setHighlightNew(v => !v)}
          />
          <span>Highlight newly installed programs</span>
        </label>
      </fieldset>

      <fieldset className="csm__group">
        <legend>Start menu items</legend>
        <div className="csm__items">
          {START_MENU_ITEMS.map(item =>
            item.kind === 'radios' ? (
              <div key={item.key}>
                <div className="csm__item-head">
                  {item.icon && (
                    <img src={item.icon} alt="" draggable={false} />
                  )}
                  {item.label}
                </div>
                <div className="csm__indent">
                  <label className="csm__row">
                    <input
                      type="radio"
                      name={`csm-item-${item.key}`}
                      checked={items[item.key] === 'link'}
                      onChange={() => setItem(item.key, 'link')}
                    />
                    <span>Display as a link</span>
                  </label>
                  {/* 'Display as a menu' is not implemented */}
                  <label className="csm__row csm__row--disabled">
                    <input
                      type="radio"
                      name={`csm-item-${item.key}`}
                      checked={false}
                      disabled
                      readOnly
                    />
                    <span>Display as a menu</span>
                  </label>
                  <label className="csm__row">
                    <input
                      type="radio"
                      name={`csm-item-${item.key}`}
                      checked={items[item.key] === 'hide'}
                      onChange={() => setItem(item.key, 'hide')}
                    />
                    <span>Don&apos;t display this item</span>
                  </label>
                </div>
              </div>
            ) : (
              <label key={item.key} className="csm__row">
                <input
                  type="checkbox"
                  checked={items[item.key] === 'link'}
                  onChange={() =>
                    setItem(
                      item.key,
                      items[item.key] === 'link' ? 'hide' : 'link',
                    )
                  }
                />
                <span>{item.label}</span>
              </label>
            ),
          )}
        </div>
      </fieldset>

      <fieldset className="csm__group">
        <legend>Recent documents</legend>
        <div className="csm__text">
          Select this option to provide quick access to the documents you opened
          most recently. Clearing this list does not delete the documents.
        </div>
        <div className="csm__recent-row">
          <label className="csm__row">
            <input
              type="checkbox"
              checked={recentDocs}
              onChange={() => setRecentDocs(v => !v)}
            />
            <span>List my most recently opened documents</span>
          </label>
          <XPButton onClick={() => vfs.clearRecentDocuments()}>
            Clear List
          </XPButton>
        </div>
      </fieldset>
    </>
  );

  return (
    <XPDialogFrame
      title="Customize Start Menu"
      width={352}
      onClose={onClose}
      zIndex={99980}
    >
      <Body>
        <div className="csm__tabs">
          {[
            { key: 'general', label: 'General' },
            { key: 'advanced', label: 'Advanced' },
          ].map(t => (
            <div
              key={t.key}
              className={`csm__tab${tab === t.key ? ' csm__tab--active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </div>
          ))}
        </div>
        <div className="csm__page">
          {tab === 'general' ? renderGeneral() : renderAdvanced()}
        </div>
        <div className="csm__buttons">
          <XPButton onClick={ok}>OK</XPButton>
          <XPButton onClick={onClose}>Cancel</XPButton>
        </div>
      </Body>
    </XPDialogFrame>
  );
}

const Body = styled.div`
  padding: 8px 8px 10px;
  font-size: 11px;
  font-family: Tahoma, 'Noto Sans', sans-serif;

  .csm__tabs {
    display: flex;
    margin-left: 2px;
  }
  .csm__tab {
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
  .csm__tab--active {
    background: #fcfcfe;
    padding-top: 4px;
    top: 0;
    border-top: 2px solid #e68b2c;
    z-index: 1;
  }
  .csm__page {
    border: 1px solid #919b9c;
    background: #fcfcfe;
    padding: 12px 10px;
    min-height: 340px;
  }
  .csm__group {
    border: 1px solid #d0d0bf;
    border-radius: 3px;
    margin: 0 0 10px;
    padding: 6px 10px 8px;
    legend {
      color: #0046d5;
      padding: 0 2px;
    }
  }
  .csm__row {
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
  .csm__row--disabled span {
    color: #a0a0a0;
  }
  .csm__text {
    line-height: 13px;
    margin: 2px 0 8px;
  }
  .csm__icon-row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 0 2px;
    .csm__row {
      margin: 0 14px 0 0;
    }
  }
  .csm__icon-lg {
    width: 32px;
    height: 32px;
  }
  .csm__icon-sm {
    width: 16px;
    height: 16px;
    margin-left: 8px;
  }
  .csm__count-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .csm__spinner {
    display: inline-flex;
    height: 20px;
    input {
      width: 26px;
      height: 20px;
      box-sizing: border-box;
      border: 1px solid var(--xp-select-border, #7f9db9);
      border-right: none;
      padding: 0 3px;
      font-family: Tahoma, 'Noto Sans', sans-serif;
      font-size: 11px;
      outline: none;
    }
  }
  .csm__spinner-buttons {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--xp-select-border, #7f9db9);
    button {
      width: 14px;
      height: 9px;
      padding: 0;
      border: none;
      background: linear-gradient(to bottom, #fff, #d8d0c4);
      display: flex;
      align-items: center;
      justify-content: center;
      &:active {
        background: #d8d0c4;
      }
    }
    button + button {
      border-top: 1px solid var(--xp-face-shadow, #aca899);
    }
    i {
      display: block;
      width: 0;
      height: 0;
      border-left: 3px solid transparent;
      border-right: 3px solid transparent;
    }
    i.up {
      border-bottom: 3px solid #4b545c;
    }
    i.down {
      border-top: 3px solid #4b545c;
    }
  }
  .csm__clear-row {
    display: flex;
    justify-content: flex-end;
    margin-top: 6px;
  }
  .csm__show-row {
    display: flex;
    align-items: center;
    margin: 4px 0;
    .csm__row {
      width: 76px;
      flex-shrink: 0;
      margin: 0;
    }
  }
  .csm__select {
    flex: 1;
  }
  .csm__items {
    border: 1px solid var(--xp-select-border, #7f9db9);
    background: #fff;
    height: 110px;
    overflow-y: auto;
    padding: 3px 6px;
  }
  .csm__item-head {
    display: flex;
    align-items: center;
    gap: 5px;
    margin: 3px 0 1px;
    img {
      width: 16px;
      height: 16px;
    }
  }
  .csm__indent {
    margin-left: 20px;
  }
  .csm__recent-row {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 8px;
    .csm__row {
      margin: 0;
    }
  }
  .csm__buttons {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    margin-top: 10px;
  }
`;
