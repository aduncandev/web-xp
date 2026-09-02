import React, { useState, useEffect, useMemo, useRef } from 'react';
import styled from 'styled-components';

import { useVFS } from '../../../context/VFSContext';
import {
  SaverSurface,
  ScreenSaverOverlay,
  SAVER_NAMES,
  hasSettings,
  readScreenSaverConfig,
  SCREENSAVER_DEFAULTS,
} from '../../../components/ScreenSaver';
import SaverSettings from '../../../components/ScreenSaver/SaverSettings';
import * as usersApi from '../../../context/users';
import XPButton from '../../../components/XPButton';
import XPSelect from '../../../components/XPSelect';
import FileDialog from '../../../components/FileDialog';
import { SPECIAL_FOLDERS } from '../../../context/vfsConstants';
import { getBaseName, getExtension } from '../../../context/vfsUtils';
import { WALLPAPER_EXTENSIONS } from '../../shell/fileTypes';

import blissWallpaper from 'assets/windowsIcons/wallpaper.jpeg';
import imageFileIcon from 'assets/windowsIcons/680(16x16).png';
import { getArt } from '../../../xpArt';
import sliderThumb from 'assets/xp/SliderThumb.png';

const TABS = ['Themes', 'Desktop', 'Screen Saver', 'Appearance', 'Settings'];
// The picture formats a browser can paint as a background
const IMAGE_EXTS = WALLPAPER_EXTENSIONS;
const DEFAULT_WALLPAPER = {
  kind: 'asset',
  value: 'bliss',
  position: 'stretch',
};

// Classic XP desktop color palette (default #3A6EA5 first)
const COLORS = [
  '#3A6EA5',
  '#000000',
  '#808080',
  '#C0C0C0',
  '#FFFFFF',
  '#800000',
  '#FF0000',
  '#808000',
  '#FFFF00',
  '#008000',
  '#00FF00',
  '#008080',
  '#00FFFF',
  '#000080',
  '#0000FF',
  '#800080',
  '#FF00FF',
];

const safe = (fn, fallback) => {
  try {
    return typeof fn === 'function' ? fn() : fallback;
  } catch {
    return fallback;
  }
};

export default function DisplayProperties({ onClose, onSetHeader }) {
  const vfs = useVFS();
  const currentUser = safe(usersApi.getCurrentUserName, 'Skillz');
  const [tab, setTab] = useState('Desktop');
  const [applied, setApplied] = useState(() =>
    safe(
      () =>
        vfs.getUserConfigFor(currentUser, 'wallpaper', DEFAULT_WALLPAPER),
      DEFAULT_WALLPAPER,
    ),
  );
  const [sel, setSel] = useState(applied);
  const [browsed, setBrowsed] = useState([]);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  // Screen saver config lives in the profile hive, like the wallpaper
  const storedSaver = safe(() => readScreenSaverConfig(vfs), {
    ...SCREENSAVER_DEFAULTS,
  });
  const [screenSaver, setScreenSaver] = useState(storedSaver.name);
  const [saverWait, setSaverWait] = useState(storedSaver.waitMinutes);
  const [saverOnResume, setSaverOnResume] = useState(
    !!storedSaver.onResumeLogon,
  );
  const [saverSettings, setSaverSettings] = useState(
    storedSaver.settings || {},
  );
  const [saverSetupOpen, setSaverSetupOpen] = useState(false);
  const [saverPreviewing, setSaverPreviewing] = useState(false);
  const [saverDirty, setSaverDirty] = useState(false);
  // The slideshow preview needs real image URLs, same as the full-screen run
  const [saverPictures, setSaverPictures] = useState([]);
  useEffect(() => {
    if (!vfs.initialized || screenSaver !== 'My Pictures Slideshow') {
      setSaverPictures([]);
      return undefined;
    }
    let live = true;
    (async () => {
      const urls = [];
      for (const e of entries) {
        if (!e.path) continue;
        // eslint-disable-next-line no-await-in-loop
        const url = await vfs.readFileUrl(e.path);
        if (url) urls.push(url);
      }
      if (live) setSaverPictures(urls);
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenSaver, vfs.initialized, vfs.version]);
  const [previewUrl, setPreviewUrl] = useState(null);
  const urlCache = useRef({});

  useEffect(() => {
    if (onSetHeader) onSetHeader({ title: 'Display Properties' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Wallpaper entries: (None), Bliss, My Pictures images, browsed extras
  const entries = useMemo(() => {
    const out = [
      { id: 'none', label: '(None)' },
      { id: 'bliss', label: 'Bliss' },
    ];
    if (vfs.initialized) {
      const pics = vfs
        .listDir(SPECIAL_FOLDERS.MY_PICTURES)
        .filter(
          n => n.type === 'file' && IMAGE_EXTS.includes(getExtension(n.path)),
        );
      for (const p of pics)
        out.push({ id: `vfs:${p.path}`, label: p.name, path: p.path });
    }
    for (const path of browsed) {
      if (!out.some(e => e.path === path))
        out.push({ id: `vfs:${path}`, label: getBaseName(path), path });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vfs.version, vfs.initialized, browsed]);

  const selectedId =
    sel.kind === 'color'
      ? 'none'
      : sel.kind === 'asset'
      ? 'bliss'
      : `vfs:${sel.value}`;

  // Resolve the preview image for VFS wallpapers
  useEffect(() => {
    let live = true;
    if (sel.kind === 'vfs') {
      if (urlCache.current[sel.value]) {
        setPreviewUrl(urlCache.current[sel.value]);
      } else {
        setPreviewUrl(null);
        Promise.resolve(vfs.readFileUrl(sel.value))
          .then(url => {
            if (url) urlCache.current[sel.value] = url;
            if (live) setPreviewUrl(url || null);
          })
          .catch(() => {
            if (live) setPreviewUrl(null);
          });
      }
    } else {
      setPreviewUrl(null);
    }
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel.kind, sel.value]);

  const dirty = JSON.stringify(sel) !== JSON.stringify(applied);

  const applySaver = () => {
    if (!saverDirty) return;
    safe(
      () =>
        vfs.setUserConfig('screenSaver', {
          name: screenSaver,
          waitMinutes: saverWait,
          onResumeLogon: saverOnResume,
          settings: saverSettings,
        }),
      null,
    );
    setSaverDirty(false);
  };

  const apply = () => {
    applySaver();
    if (!dirty) return;
    safe(() => vfs.setUserConfigFor(currentUser, 'wallpaper', sel), null);
    setApplied(sel);
  };

  const pickEntry = e => {
    if (e.id === 'none') {
      setSel(s => ({
        kind: 'color',
        value: s.kind === 'color' ? s.value : COLORS[0],
        position: s.position,
      }));
    } else if (e.id === 'bliss') {
      setSel(s => ({ kind: 'asset', value: 'bliss', position: s.position }));
    } else {
      setSel(s => ({ kind: 'vfs', value: e.path, position: s.position }));
    }
  };

  const previewStyle = () => {
    if (sel.kind === 'color') return { backgroundColor: sel.value };
    const url = sel.kind === 'asset' ? blissWallpaper : previewUrl;
    if (!url) return { backgroundColor: '#3A6EA5' };
    if (sel.position === 'tile')
      return {
        backgroundImage: `url(${url})`,
        backgroundRepeat: 'repeat',
        backgroundSize: '40%',
      };
    if (sel.position === 'center')
      return {
        backgroundImage: `url(${url})`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundSize: '60%',
        backgroundColor: '#3A6EA5',
      };
    return { backgroundImage: `url(${url})`, backgroundSize: '100% 100%' };
  };

  return (
    <Root>
      <div className="dp__tabs">
        {TABS.map(t => (
          <div
            key={t}
            className={t === tab ? 'dp__tab dp__tab--active' : 'dp__tab'}
            onClick={() => setTab(t)}
          >
            {t}
          </div>
        ))}
      </div>
      <div className="dp__page">
        {tab === 'Desktop' && (
          <>
            <Monitor style={previewStyle()} />
            <div className="dp__row">
              <div className="dp__col">
                <div className="dp__label">Background:</div>
                <div className="dp__list">
                  {entries.map(e => (
                    <div
                      key={e.id}
                      className={
                        e.id === selectedId
                          ? 'dp__item dp__item--sel'
                          : 'dp__item'
                      }
                      onClick={() => pickEntry(e)}
                    >
                      <img src={imageFileIcon} alt="" width={14} height={14} />
                      {e.label}
                    </div>
                  ))}
                </div>
              </div>
              <div className="dp__col dp__col--right">
                <XPButton onClick={() => setBrowseOpen(true)}>
                  Browse...
                </XPButton>
                <div className="dp__label">Position:</div>
                <XPSelect
                  options={[
                    { value: 'center', label: 'Center' },
                    { value: 'tile', label: 'Tile' },
                    { value: 'stretch', label: 'Stretch' },
                  ]}
                  value={sel.position}
                  onChange={v => setSel(s => ({ ...s, position: v }))}
                />
                <div className="dp__label">Color:</div>
                <div className="dp__colorwrap">
                  <button
                    type="button"
                    className="dp__colorbtn"
                    disabled={sel.kind !== 'color'}
                    onClick={() => setColorOpen(o => !o)}
                  >
                    <span
                      className="dp__swatch"
                      style={{
                        backgroundColor:
                          sel.kind === 'color' ? sel.value : '#3A6EA5',
                      }}
                    />
                    <span className="dp__coldrop">▾</span>
                  </button>
                  {colorOpen && sel.kind === 'color' && (
                    <div className="dp__palette">
                      {COLORS.map(c => (
                        <span
                          key={c}
                          className="dp__swatch dp__swatch--pick"
                          style={{ backgroundColor: c }}
                          onClick={() => {
                            setSel(s => ({ ...s, value: c }));
                            setColorOpen(false);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {tab === 'Themes' && (
          <>
            <div className="dp__label">Theme:</div>
            <div className="dp__inline">
              <XPSelect
                className="dp__select--wide"
                options={[{ value: 'Windows XP', label: 'Windows XP' }]}
                value="Windows XP"
              />
              <XPButton disabled>Save As...</XPButton>
              <XPButton disabled>Delete</XPButton>
            </div>
            <div className="dp__label">Sample:</div>
            <MiniDesktop wallpaperUrl={blissWallpaper} />
          </>
        )}

        {tab === 'Screen Saver' && (
          <>
            <Monitor>
              <SaverSurface
                name={screenSaver}
                settings={saverSettings}
                pictures={saverPictures}
                className="m__saver"
              />
            </Monitor>
            <div className="dp__group">
              <div className="dp__group-title">Screen saver</div>
              <div className="dp__inline">
                <XPSelect
                  className="dp__select--wide"
                  options={SAVER_NAMES.map(n => ({ value: n, label: n }))}
                  value={screenSaver}
                  onChange={v => {
                    setScreenSaver(v);
                    setSaverSettings({});
                    setSaverDirty(true);
                  }}
                />
                <XPButton
                  disabled={!hasSettings(screenSaver)}
                  onClick={() => setSaverSetupOpen(true)}
                >
                  Settings
                </XPButton>
                <XPButton
                  disabled={screenSaver === '(None)'}
                  onClick={() => setSaverPreviewing(true)}
                >
                  Preview
                </XPButton>
              </div>
              <div className="dp__inline dp__inline--gap">
                <span>Wait:</span>
                <input
                  className="dp__spin"
                  type="number"
                  value={saverWait}
                  min={1}
                  max={9999}
                  onChange={e => {
                    setSaverWait(Math.max(1, Number(e.target.value) || 1));
                    setSaverDirty(true);
                  }}
                />
                <span>minutes</span>
                <label className="dp__check">
                  <input
                    type="checkbox"
                    checked={saverOnResume}
                    onChange={() => {
                      setSaverOnResume(v => !v);
                      setSaverDirty(true);
                    }}
                  />
                  On resume, display Welcome screen
                </label>
              </div>
            </div>
            <div className="dp__group">
              <div className="dp__group-title">Monitor power</div>
              <div className="dp__inline dp__inline--between">
                <span className="dp__hint">
                  To adjust monitor power settings and save energy, click Power.
                </span>
                <XPButton disabled>Power...</XPButton>
              </div>
            </div>
            {saverSetupOpen && (
              <SaverSettings
                name={screenSaver}
                settings={saverSettings}
                onSave={next => {
                  setSaverSettings(next);
                  setSaverDirty(true);
                }}
                onClose={() => setSaverSetupOpen(false)}
              />
            )}
            {saverPreviewing && (
              <ScreenSaverOverlay
                name={screenSaver}
                settings={saverSettings}
                pictures={saverPictures}
                onDismiss={() => setSaverPreviewing(false)}
              />
            )}
          </>
        )}

        {tab === 'Appearance' && (
          <>
            <MiniDesktop />
            <div className="dp__label">Windows and buttons:</div>
            <XPSelect
              className="dp__select--wide dp__select--left"
              options={[
                { value: 'Windows XP style', label: 'Windows XP style' },
              ]}
              value="Windows XP style"
            />
            <div className="dp__label">Color scheme:</div>
            <XPSelect
              className="dp__select--wide dp__select--left"
              options={[{ value: 'Default (blue)', label: 'Default (blue)' }]}
              value="Default (blue)"
            />
            <div className="dp__label">Font size:</div>
            <div className="dp__inline">
              <XPSelect
                className="dp__select--wide"
                options={[{ value: 'Normal', label: 'Normal' }]}
                value="Normal"
              />
              <XPButton disabled>Effects...</XPButton>
              <XPButton disabled>Advanced</XPButton>
            </div>
          </>
        )}

        {tab === 'Settings' && (
          <>
            {/* Ref: the monitor previews the actual desktop, and a
                "Display:" line names the monitor + adapter */}
            <Monitor style={previewStyle()} />
            <div className="dp__display">
              <div>Display:</div>
              <div className="dp__display-name">
                Plug and Play Monitor on NVIDIA GeForce4 MX 440
              </div>
            </div>
            <div className="dp__row dp__row--settings">
              <div className="dp__col">
                <div className="dp__group dp__group--legend">
                  <div className="dp__legend">Screen resolution</div>
                  <div className="dp__inline dp__inline--gap">
                    <span className="dp__hint">Less</span>
                    <div className="dp__sliderwrap">
                      <input
                        className="dp__slider"
                        type="range"
                        min={0}
                        max={100}
                        defaultValue={100}
                        disabled
                      />
                      <div className="dp__ticks">
                        {Array.from({ length: 7 }).map((_, i) => (
                          <span key={i} />
                        ))}
                      </div>
                    </div>
                    <span className="dp__hint">More</span>
                  </div>
                  <div className="dp__res">
                    {typeof window !== 'undefined' && window.screen
                      ? `${window.screen.width} by ${window.screen.height} pixels`
                      : '1024 by 768 pixels'}
                  </div>
                </div>
              </div>
              <div className="dp__col">
                <div className="dp__group dp__group--legend">
                  <div className="dp__legend">Color quality</div>
                  <XPSelect
                    className="dp__select--wide"
                    options={[
                      { value: 'Highest (32 bit)', label: 'Highest (32 bit)' },
                    ]}
                    value="Highest (32 bit)"
                  />
                  <div className="dp__colorbar" />
                </div>
              </div>
            </div>
            <div className="dp__inline dp__inline--end">
              <XPButton>Troubleshoot...</XPButton>
              <XPButton>Advanced</XPButton>
            </div>
          </>
        )}
      </div>

      <div className="dp__buttons">
        <XPButton
          onClick={() => {
            apply();
            onClose();
          }}
        >
          OK
        </XPButton>
        <XPButton onClick={onClose}>Cancel</XPButton>
        <XPButton disabled={!dirty && !saverDirty} onClick={apply}>
          Apply
        </XPButton>
      </div>

      {browseOpen && (
        <FileDialog
          mode="open"
          title="Browse"
          initialPath={SPECIAL_FOLDERS.MY_PICTURES}
          filters={[
            {
              label: `Background Files (${IMAGE_EXTS.map(e => `*${e}`).join(
                ';',
              )})`,
              extensions: IMAGE_EXTS,
            },
            { label: 'All Files', extensions: null },
          ]}
          onSelect={path => {
            setBrowseOpen(false);
            setBrowsed(b => (b.includes(path) ? b : [...b, path]));
            setSel(s => ({ kind: 'vfs', value: path, position: s.position }));
          }}
          onCancel={() => setBrowseOpen(false)}
        />
      )}
    </Root>
  );
}

/** The XP monitor with a live preview screen. Uses the genuine CRT bitmap
 *  (cropped from the real Settings-tab screenshot); the live preview is
 *  overlaid on its glass. The drawn bezel is only the fallback. */
function Monitor({ style, children }) {
  const art = getArt('DisplayMonitor', null);
  if (art) {
    return (
      <MonitorReal>
        <img src={art} alt="" width={182} height={164} draggable={false} />
        <div className="m__live" style={style}>
          {children}
        </div>
      </MonitorReal>
    );
  }
  return (
    <MonitorWrap>
      <div className="m__bezel">
        <div className="m__screen" style={style}>
          {children}
        </div>
      </div>
      <div className="m__neck" />
      <div className="m__base" />
      <div className="m__power" />
    </MonitorWrap>
  );
}

const MonitorReal = styled.div`
  position: relative;
  width: 182px;
  margin: 6px auto 0;

  img {
    display: block;
  }
  /* The full glass area of the bitmap (measured from the crop) — covers
     the baked-in desktop screenshot, taskbar included */
  .m__live {
    position: absolute;
    left: 13px;
    top: 17px;
    width: 152px;
    height: 112px;
    background-size: cover;
    background-position: center;
    overflow: hidden;
  }
  /* The screen saver preview runs live inside the monitor's glass */
  .m__saver {
    display: block;
    width: 100%;
    height: 100%;
  }
`;

/** Tiny desktop sample used by Themes/Appearance. */
function MiniDesktop({ wallpaperUrl }) {
  return (
    <Mini
      style={
        wallpaperUrl
          ? { backgroundImage: `url(${wallpaperUrl})`, backgroundSize: 'cover' }
          : { backgroundColor: '#3A6EA5' }
      }
    >
      <div className="mw mw--inactive">
        <div className="mw__bar mw__bar--inactive">Inactive Window</div>
      </div>
      <div className="mw mw--active">
        <div className="mw__bar">Active Window</div>
        <div className="mw__body">
          <div className="mw__text">Window Text</div>
          <div className="mw__btn">OK</div>
        </div>
      </div>
    </Mini>
  );
}

const Root = styled.div`
  position: absolute;
  inset: 0;
  background: #ece9d8;
  font-family: Tahoma, 'Noto Sans', sans-serif;
  font-size: 11px;
  display: flex;
  flex-direction: column;
  padding: 8px 8px 10px;
  user-select: none;

  .dp__tabs {
    display: flex;
    padding-left: 2px;
    position: relative;
    top: 1px;
    flex-shrink: 0;
  }
  .dp__tab {
    padding: 4px 10px 3px;
    border: 1px solid #919b9c;
    border-bottom: none;
    border-radius: 3px 3px 0 0;
    margin-right: 2px;
    background: linear-gradient(to bottom, #fefefd, #ece9d8);
    cursor: default;
  }
  .dp__tab--active {
    background: #fdfdfa;
    position: relative;
    z-index: 2;
    padding-top: 5px;
    top: -1px;
    border-top: 2px solid #e68b2c;
  }
  .dp__page {
    flex: 1;
    border: 1px solid #919b9c;
    background: #fdfdfa;
    padding: 12px 14px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .dp__row {
    display: flex;
    width: 100%;
    gap: 14px;
    margin-top: 10px;
    flex: 1;
    min-height: 0;
  }
  .dp__col {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .dp__col--right {
    flex: 0 0 120px;
    gap: 4px;
    align-items: stretch;
  }
  .dp__label {
    margin: 6px 0 3px;
    align-self: flex-start;
  }
  .dp__list {
    flex: 1;
    min-height: 60px;
    overflow-y: auto;
    border: 1px solid #7f9db9;
    background: #fff;
  }
  .dp__item {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 1px 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    cursor: default;
  }
  .dp__item--sel {
    background: #316ac5;
    color: #fff;
  }
  .dp__select--wide {
    min-width: 170px;
  }
  .dp__select--left {
    align-self: flex-start;
  }
  .dp__colorwrap {
    position: relative;
  }
  .dp__colorbtn {
    display: flex;
    align-items: center;
    gap: 3px;
    width: 100%;
    height: 21px;
    border: 1px solid #7f9db9;
    background: #fff;
    padding: 2px;
    cursor: default;
    &:disabled {
      opacity: 0.5;
    }
  }
  .dp__swatch {
    display: inline-block;
    flex: 1;
    height: 100%;
    min-height: 13px;
    border: 1px solid #808080;
  }
  .dp__coldrop {
    font-size: 8px;
    color: #4d6185;
  }
  .dp__palette {
    position: absolute;
    top: 22px;
    right: 0;
    z-index: 5;
    background: #fff;
    border: 1px solid #7f9db9;
    padding: 4px;
    display: grid;
    grid-template-columns: repeat(6, 16px);
    gap: 3px;
  }
  .dp__swatch--pick {
    width: 16px;
    height: 14px;
    flex: none;
    cursor: pointer;
    &:hover {
      outline: 1px solid #316ac5;
    }
  }
  .dp__inline {
    display: flex;
    align-items: center;
    gap: 6px;
    align-self: flex-start;
    margin: 2px 0;
  }
  .dp__inline--gap {
    margin-top: 8px;
  }
  .dp__inline--between {
    width: 100%;
    justify-content: space-between;
  }
  .dp__inline--end {
    align-self: flex-end;
    margin-top: 8px;
  }
  .dp__group {
    width: 100%;
    border: 1px solid #d0cdb9;
    border-radius: 3px;
    padding: 8px 10px 10px;
    margin-top: 10px;
  }
  .dp__group-title {
    color: #003399;
    margin-bottom: 4px;
  }
  .dp__spin {
    width: 48px;
    height: 19px;
    border: 1px solid #7f9db9;
    font-family: Tahoma, 'Noto Sans', sans-serif;
    font-size: 11px;
  }
  .dp__check {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-left: 12px;
  }
  .dp__hint {
    color: #666;
  }
  .dp__res {
    margin-top: 4px;
    text-align: center;
  }
  /* align-self overrides the page's centered column layout */
  .dp__display {
    margin: 10px 0 0;
    line-height: 15px;
    text-align: left;
    align-self: stretch;
  }
  .dp__display-name {
    margin-top: 2px;
  }
  /* XP groupbox: etched box with the caption riding the top border.
     The Settings row splits into two EQUAL boxes, like the real tab. */
  .dp__row--settings {
    gap: 12px;
  }
  .dp__row--settings .dp__group--legend {
    flex: 1;
  }
  .dp__group--legend {
    position: relative;
    margin-top: 12px;
    padding-top: 12px;
  }
  .dp__legend {
    position: absolute;
    top: -8px;
    left: 8px;
    background: #fdfdfa;
    padding: 0 3px;
    color: #003399;
  }
  /* Luna slider, measured from the genuine Settings-tab screenshot: thin
     2px etched track ~88px long, the real 11x21 thumb bitmap, and seven
     tick marks under the travel. */
  .dp__sliderwrap {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .dp__slider {
    width: 88px;
    height: 21px;
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
  }
  .dp__slider::-webkit-slider-runnable-track {
    height: 2px;
    border: none;
    border-radius: 1px;
    background: #9a9a91;
    box-shadow: 0 1px 0 #ffffff;
  }
  .dp__slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 11px;
    height: 21px;
    margin-top: -10px;
    border: none;
    border-radius: 0;
    background: url(${sliderThumb}) no-repeat center;
  }
  .dp__slider::-moz-range-track {
    height: 2px;
    border: none;
    border-radius: 1px;
    background: #9a9a91;
    box-shadow: 0 1px 0 #ffffff;
  }
  .dp__slider::-moz-range-thumb {
    width: 11px;
    height: 21px;
    border: none;
    border-radius: 0;
    background: url(${sliderThumb}) no-repeat center;
  }
  .dp__ticks {
    display: flex;
    justify-content: space-between;
    width: 78px;
    margin-top: 1px;
  }
  .dp__ticks span {
    width: 1px;
    height: 3px;
    background: #808080;
  }
  .dp__colorbar {
    height: 12px;
    margin-top: 4px;
    border: 1px solid #808080;
    background: linear-gradient(
      to right,
      red,
      yellow,
      lime,
      cyan,
      blue,
      magenta,
      red
    );
  }
  .dp__buttons {
    flex-shrink: 0;
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    padding-top: 8px;
  }
`;

const MonitorWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;

  .m__bezel {
    width: 180px;
    height: 138px;
    background: linear-gradient(to bottom, #ece9dd, #cfcaba);
    border: 1px solid #8a8778;
    border-radius: 6px;
    padding: 8px;
  }
  .m__screen {
    width: 100%;
    height: 100%;
    border: 1px solid #5b5b5b;
    background-color: #3a6ea5;
  }
  .m__neck {
    width: 34px;
    height: 8px;
    background: #cfcaba;
    border: 1px solid #8a8778;
    border-top: none;
  }
  .m__base {
    width: 76px;
    height: 7px;
    background: linear-gradient(to bottom, #dfdacb, #b8b4a2);
    border: 1px solid #8a8778;
    border-radius: 2px;
  }
  .m__power {
    position: relative;
    top: -12px;
    left: 60px;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #3aa13a;
  }
`;

const Mini = styled.div`
  width: 300px;
  height: 150px;
  border: 1px solid #808080;
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
  margin-bottom: 4px;

  .mw {
    position: absolute;
    border: 2px solid #0831d9;
    border-radius: 4px 4px 0 0;
    background: #ece9d8;
  }
  .mw--inactive {
    left: 14px;
    top: 12px;
    width: 200px;
    height: 70px;
    border-color: #6582f5;
  }
  .mw--active {
    left: 44px;
    top: 38px;
    width: 220px;
    height: 96px;
  }
  .mw__bar {
    height: 18px;
    line-height: 18px;
    padding-left: 6px;
    color: #fff;
    font-weight: 700;
    font-size: 10px;
    border-radius: 2px 2px 0 0;
    background: linear-gradient(
      to bottom,
      #0058ee 0%,
      #3593ff 8%,
      #0054e3 40%,
      #0055eb 88%,
      #003092 100%
    );
    text-shadow: 1px 1px #000;
  }
  .mw__bar--inactive {
    background: linear-gradient(to bottom, #7697e7, #7b99e1 60%, #abbae3 100%);
  }
  .mw__body {
    padding: 8px;
  }
  .mw__text {
    font-size: 10px;
  }
  .mw__btn {
    width: 56px;
    height: 18px;
    margin-top: 10px;
    border: 1px solid #003c74;
    border-radius: 3px;
    background: linear-gradient(to bottom, #ffffff, #ecebe5 86%, #d8d0c4);
    font-size: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;

