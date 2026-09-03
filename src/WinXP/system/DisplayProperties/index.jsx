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
import recycleBinIcon from 'assets/xp/recycle-empty.png';
import { getArt } from '../../../xpArt';
import { STYLE, LUNA_SCHEMES, FONT_SIZES, themeVars } from '../../theme/tokens';
import { CLASSIC_SCHEMES } from '../../theme/classicSchemes';
import { readAppearance } from '../../theme/useAppearance';
import { MODES, applyDisplay, getDisplay, modeLabel } from '../../screen';
import XPDialogFrame from '../../../components/XPDialogFrame';
import sliderThumb from 'assets/xp/SliderThumb.png';
import classicMin from 'assets/xp/classic/glyph-minimize.png';
import classicMax from 'assets/xp/classic/glyph-maximize.png';
import classicClose from 'assets/xp/classic/glyph-close.png';
import classicScrollUp from 'assets/xp/classic/glyph-scroll-up.png';
import classicScrollDown from 'assets/xp/classic/glyph-scroll-down.png';
import EffectsDialog, { DEFAULT_EFFECTS } from './EffectsDialog';

const TABS = ['Themes', 'Desktop', 'Screen Saver', 'Appearance', 'Settings'];

// XP's default desktop colour, seen around a centred or tiled picture
const DESKTOP_COLOR = '#004E98';
const desktopColor = sel =>
  sel.kind === 'color' ? sel.value : sel.color || DESKTOP_COLOR;

// XP lays the sheet out in fixed positions. Everything below is measured in
// pixels from the dialog's top-left corner on a real XP, then mapped into
// the window's client area (4px frame, 29px caption) or the tab page
// (whose top-left inner pixel sits at 9, 54).
const box = (x, y, w, h) => ({
  position: 'absolute',
  left: x,
  top: y,
  ...(w != null ? { width: w } : {}),
  ...(h != null ? { height: h } : {}),
});
// The sheet's coordinates were taken with the dialog's origin one pixel
// right and four down of its true corner; the fixed 3px frame and the 29px
// caption come off after that correction.
const rootAt = (x, y, w, h) => box(x + 1 - 3, y + 4 - 29, w, h);
const at = (x, y, w, h) => box(x - 8, y - 52, w, h);
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

// The Themes tab's presets: a theme is an appearance plus a background
const THEME_PRESETS = {
  'Windows XP': {
    appearance: { style: STYLE.LUNA, scheme: 'blue', fontSize: 'normal' },
    wallpaper: DEFAULT_WALLPAPER,
  },
  'Windows Classic': {
    appearance: {
      style: STYLE.CLASSIC,
      scheme: 'standard',
      fontSize: 'normal',
    },
    wallpaper: { kind: 'color', value: '#3A6EA5', position: 'stretch' },
  },
};
const sameAppearance = (a, b) =>
  a.style === b.style && a.scheme === b.scheme && a.fontSize === b.fontSize;
/** Which preset the pending settings amount to, or My Current Theme. */
function themeNameFor(appearance, wallpaper) {
  for (const [name, preset] of Object.entries(THEME_PRESETS)) {
    if (
      sameAppearance(appearance, preset.appearance) &&
      wallpaper.kind === preset.wallpaper.kind
    )
      return name;
  }
  return 'My Current Theme';
}
const STYLE_OPTIONS = [
  { value: STYLE.LUNA, label: 'Windows XP style' },
  { value: STYLE.CLASSIC, label: 'Windows Classic style' },
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
      () => vfs.getUserConfigFor(currentUser, 'wallpaper', DEFAULT_WALLPAPER),
      DEFAULT_WALLPAPER,
    ),
  );
  const [sel, setSel] = useState(applied);
  // Appearance: Windows and buttons, colour scheme, font size
  const [appearApplied, setAppearApplied] = useState(() =>
    readAppearance(vfs, currentUser),
  );
  const [appear, setAppear] = useState(appearApplied);
  const appearDirty = JSON.stringify(appear) !== JSON.stringify(appearApplied);
  // Settings: resolution, colour quality and DPI, machine-wide like XP's
  const [dispApplied, setDispApplied] = useState(() => getDisplay());
  const [disp, setDisp] = useState(dispApplied);
  const dispDirty = JSON.stringify(disp) !== JSON.stringify(dispApplied);
  const [keepPrompt, setKeepPrompt] = useState(null); // { prev }
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [effectsOpen, setEffectsOpen] = useState(false);
  // the slider's stops: XP's modes plus the browser window itself (null)
  const modes = useMemo(() => {
    const native = [window.innerWidth, window.innerHeight];
    const all = MODES.some(m => m[0] === native[0] && m[1] === native[1])
      ? [...MODES]
      : [...MODES, native];
    return all
      .sort((a, b) => a[0] - b[0] || a[1] - b[1])
      .map(m => (m[0] === native[0] && m[1] === native[1] ? null : m));
  }, []);
  const sameMode = (a, b) =>
    (!a && !b) || (a && b && a[0] === b[0] && a[1] === b[1]);
  const modeIndex = modes.findIndex(m => sameMode(m, disp.mode));
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
  const themeName = themeNameFor(appear, sel);

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
    if (dispDirty) {
      const prev = dispApplied;
      applyDisplay(disp);
      setDispApplied(disp);
      // a new resolution or DPI has to be confirmed, or it comes back
      if (!sameMode(prev.mode, disp.mode) || prev.dpi !== disp.dpi)
        setKeepPrompt({ prev });
    }
    if (appearDirty) {
      safe(() => vfs.setUserConfigFor(currentUser, 'appearance', appear), null);
      setAppearApplied(appear);
    }
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
    if (!url) return { backgroundColor: desktopColor(sel) };
    if (sel.position === 'tile')
      return {
        backgroundImage: `url(${url})`,
        backgroundRepeat: 'repeat',
        backgroundSize: '40%',
        backgroundColor: desktopColor(sel),
      };
    if (sel.position === 'center')
      return {
        backgroundImage: `url(${url})`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundSize: '60%',
        backgroundColor: desktopColor(sel),
      };
    return { backgroundImage: `url(${url})`, backgroundSize: '100% 100%' };
  };

  return (
    <Root>
      <div className="dp__tabs" style={rootAt(10, 32, 384, 21)}>
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
      <div className="dp__page" style={rootAt(8, 52, 386, 360)}>
        {tab === 'Desktop' && (
          <>
            <div className="dp__abs" style={at(112, 72)}>
              <Monitor style={previewStyle()} />
            </div>
            <div className="dp__abs dp__label" style={at(23, 246)}>
              Background:
            </div>
            <div className="dp__abs dp__list" style={at(23, 260, 272, 114)}>
              {entries.map(e => (
                <div
                  key={e.id}
                  className={
                    e.id === selectedId ? 'dp__item dp__item--sel' : 'dp__item'
                  }
                  onClick={() => pickEntry(e)}
                >
                  <img src={imageFileIcon} alt="" width={14} height={14} />
                  {e.label}
                </div>
              ))}
            </div>
            <div className="dp__abs" style={at(305, 260, 75, 23)}>
              <XPButton onClick={() => setBrowseOpen(true)}>Browse...</XPButton>
            </div>
            <div className="dp__abs dp__label" style={at(305, 296)}>
              Position:
            </div>
            <div className="dp__abs" style={at(305, 311, 75, 21)}>
              <XPSelect
                width={75}
                options={[
                  { value: 'center', label: 'Center' },
                  { value: 'tile', label: 'Tile' },
                  { value: 'stretch', label: 'Stretch' },
                ]}
                value={sel.position}
                onChange={v => setSel(s => ({ ...s, position: v }))}
              />
            </div>
            <div className="dp__abs dp__label" style={at(305, 336)}>
              Color:
            </div>
            <div className="dp__abs dp__colorwrap" style={at(305, 359, 75, 21)}>
              <button
                type="button"
                className="dp__colorbtn"
                onClick={() => setColorOpen(o => !o)}
              >
                <span
                  className="dp__swatch"
                  style={{ backgroundColor: desktopColor(sel) }}
                />
                <span className="dp__coldrop" />
              </button>
              {colorOpen && (
                <div className="dp__palette">
                  {COLORS.map(c => (
                    <span
                      key={c}
                      className="dp__swatch dp__swatch--pick"
                      style={{ backgroundColor: c }}
                      onClick={() => {
                        setSel(s =>
                          s.kind === 'color'
                            ? { ...s, value: c }
                            : { ...s, color: c },
                        );
                        setColorOpen(false);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="dp__abs" style={at(23, 379, 135, 23)}>
              <XPButton disabled>Customize Desktop...</XPButton>
            </div>
          </>
        )}

        {tab === 'Themes' && (
          <>
            <div className="dp__abs dp__text" style={at(23, 58, 360)}>
              A theme is a background plus a set of sounds, icons, and other
              elements to help you personalize your computer with one click.
            </div>
            <div className="dp__abs dp__label" style={at(23, 104)}>
              Theme:
            </div>
            <div className="dp__abs" style={at(23, 122, 192, 21)}>
              <XPSelect
                width={192}
                options={[
                  ...(themeName === 'My Current Theme'
                    ? [{ value: themeName, label: themeName }]
                    : []),
                  ...Object.keys(THEME_PRESETS).map(n => ({
                    value: n,
                    label: n,
                  })),
                ]}
                value={themeName}
                onChange={name => {
                  const preset = THEME_PRESETS[name];
                  if (!preset) return;
                  setAppear(preset.appearance);
                  setSel(preset.wallpaper);
                }}
              />
            </div>
            <div className="dp__abs" style={at(221, 119, 75, 23)}>
              <XPButton disabled>Save As...</XPButton>
            </div>
            <div className="dp__abs" style={at(302, 119, 75, 23)}>
              <XPButton disabled>Delete</XPButton>
            </div>
            <div className="dp__abs dp__label" style={at(23, 153)}>
              Sample:
            </div>
            <div className="dp__abs dp__frame" style={at(26, 171, 350, 222)}>
              <MiniDesktop
                variant="themes"
                appearance={appear}
                wallpaperUrl={
                  sel.kind === 'asset'
                    ? blissWallpaper
                    : sel.kind === 'vfs'
                    ? previewUrl
                    : null
                }
                color={sel.kind === 'color' ? sel.value : null}
              />
            </div>
          </>
        )}

        {tab === 'Screen Saver' && (
          <>
            <div className="dp__abs" style={at(112, 72)}>
              <Monitor>
                <SaverSurface
                  name={screenSaver}
                  settings={saverSettings}
                  pictures={saverPictures}
                  className="m__saver"
                />
              </Monitor>
            </div>
            <div className="dp__abs dp__group" style={at(23, 245, 357, 71)} />
            <div className="dp__abs dp__legend" style={at(31, 239)}>
              Screen saver
            </div>
            <div className="dp__abs" style={at(32, 256, 173, 21)}>
              <XPSelect
                width={173}
                options={SAVER_NAMES.map(n => ({ value: n, label: n }))}
                value={screenSaver}
                onChange={v => {
                  setScreenSaver(v);
                  setSaverSettings({});
                  setSaverDirty(true);
                }}
              />
            </div>
            <div className="dp__abs" style={at(210, 254, 75, 23)}>
              <XPButton
                disabled={!hasSettings(screenSaver)}
                onClick={() => setSaverSetupOpen(true)}
              >
                Settings
              </XPButton>
            </div>
            <div className="dp__abs" style={at(291, 254, 75, 23)}>
              <XPButton
                disabled={screenSaver === '(None)'}
                onClick={() => setSaverPreviewing(true)}
              >
                Preview
              </XPButton>
            </div>
            <div className="dp__abs dp__label" style={at(32, 289)}>
              Wait:
            </div>
            <div className="dp__abs dp__spinbox" style={at(60, 285, 50, 20)}>
              <input
                className="dp__spin"
                type="text"
                inputMode="numeric"
                value={saverWait}
                onChange={e => {
                  const n = parseInt(e.target.value, 10);
                  setSaverWait(
                    Number.isNaN(n) ? 1 : Math.min(9999, Math.max(1, n)),
                  );
                  setSaverDirty(true);
                }}
              />
              <span className="dp__spinbtns">
                <button
                  type="button"
                  className="dp__spinbtn dp__spinbtn--up"
                  tabIndex={-1}
                  onClick={() => {
                    setSaverWait(w => Math.min(9999, w + 1));
                    setSaverDirty(true);
                  }}
                />
                <button
                  type="button"
                  className="dp__spinbtn dp__spinbtn--down"
                  tabIndex={-1}
                  onClick={() => {
                    setSaverWait(w => Math.max(1, w - 1));
                    setSaverDirty(true);
                  }}
                />
              </span>
            </div>
            <div className="dp__abs dp__label" style={at(117, 289)}>
              minutes
            </div>
            <label className="dp__abs dp__check" style={at(158, 287)}>
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
            <div className="dp__abs dp__group" style={at(23, 326, 357, 78)} />
            <div className="dp__abs dp__legend" style={at(31, 320)}>
              Monitor power
            </div>
            <div className="dp__abs dp__text" style={at(120, 345, 250)}>
              To adjust monitor power settings and save energy, click Power.
            </div>
            <div className="dp__abs" style={at(293, 373, 75, 23)}>
              <XPButton disabled>Power...</XPButton>
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
            <div className="dp__abs dp__frame" style={at(26, 65, 350, 188)}>
              <MiniDesktop appearance={appear} />
            </div>
            <div className="dp__abs dp__label" style={at(23, 268)}>
              Windows and buttons:
            </div>
            <div className="dp__abs" style={at(23, 283, 197, 21)}>
              <XPSelect
                width={197}
                options={STYLE_OPTIONS}
                value={appear.style}
                onChange={style =>
                  setAppear(a => ({
                    ...a,
                    style,
                    // each style starts on its own default scheme, like XP
                    scheme: style === STYLE.CLASSIC ? 'standard' : 'blue',
                  }))
                }
              />
            </div>
            <div className="dp__abs dp__label" style={at(23, 314)}>
              Color scheme:
            </div>
            <div className="dp__abs" style={at(23, 329, 197, 21)}>
              <XPSelect
                width={197}
                options={(appear.style === STYLE.CLASSIC
                  ? CLASSIC_SCHEMES
                  : LUNA_SCHEMES
                ).map(s => ({ value: s.id, label: s.name }))}
                value={appear.scheme}
                onChange={scheme => setAppear(a => ({ ...a, scheme }))}
              />
            </div>
            <div className="dp__abs dp__label" style={at(23, 361)}>
              Font size:
            </div>
            <div className="dp__abs" style={at(23, 376, 197, 21)}>
              <XPSelect
                width={197}
                options={FONT_SIZES.map(f => ({ value: f.id, label: f.name }))}
                value={appear.fontSize}
                onChange={fontSize => setAppear(a => ({ ...a, fontSize }))}
              />
            </div>
            <div className="dp__abs" style={at(297, 347, 83, 23)}>
              <XPButton onClick={() => setEffectsOpen(true)}>
                Effects...
              </XPButton>
            </div>
            <div className="dp__abs" style={at(297, 376, 83, 23)}>
              <XPButton disabled>Advanced</XPButton>
            </div>
          </>
        )}

        {tab === 'Settings' && (
          <>
            <div className="dp__abs" style={at(112, 72)}>
              <Monitor />
            </div>
            <div className="dp__abs dp__label" style={at(23, 262)}>
              Display:
            </div>
            <div className="dp__abs dp__label" style={at(23, 278)}>
              Plug and Play Monitor on NVIDIA GeForce4 MX 440
            </div>
            <div className="dp__abs dp__group" style={at(23, 305, 173, 64)} />
            <div className="dp__abs dp__legend" style={at(31, 299)}>
              Screen resolution
            </div>
            <div className="dp__abs dp__label" style={at(33, 323)}>
              Less
            </div>
            <div className="dp__abs dp__sliderwrap" style={at(58, 315, 104)}>
              <input
                className="dp__slider"
                type="range"
                min={0}
                max={modes.length - 1}
                value={modeIndex < 0 ? modes.length - 1 : modeIndex}
                onChange={e => {
                  const mode = modes[Number(e.target.value)];
                  setDisp(d => ({ ...d, mode }));
                }}
              />
              <div className="dp__ticks">
                {modes.map((m, i) => (
                  <span key={m ? m.join('x') : 'native'} data-i={i} />
                ))}
              </div>
            </div>
            <div className="dp__abs dp__label" style={at(160, 323)}>
              More
            </div>
            <div className="dp__abs dp__res" style={at(23, 348, 173)}>
              {modeLabel(disp)}
            </div>
            <div className="dp__abs dp__group" style={at(206, 305, 174, 64)} />
            <div className="dp__abs dp__legend" style={at(214, 299)}>
              Color quality
            </div>
            <div className="dp__abs" style={at(215, 316, 155, 21)}>
              <XPSelect
                width={155}
                options={[
                  { value: 16, label: 'Medium (16 bit)' },
                  { value: 32, label: 'Highest (32 bit)' },
                ]}
                value={disp.depth}
                onChange={depth => setDisp(d => ({ ...d, depth }))}
              />
            </div>
            <div
              className="dp__abs dp__colorbar"
              style={at(216, 346, 153, 13)}
            />
            <div className="dp__abs" style={at(201, 377, 89, 23)}>
              <XPButton disabled>Troubleshoot...</XPButton>
            </div>
            <div className="dp__abs" style={at(296, 377, 84, 23)}>
              <XPButton onClick={() => setAdvancedOpen(true)}>
                Advanced
              </XPButton>
            </div>
          </>
        )}
      </div>

      <div className="dp__abs" style={rootAt(157, 418, 75, 23)}>
        <XPButton
          onClick={() => {
            apply();
            onClose();
          }}
        >
          OK
        </XPButton>
      </div>
      <div className="dp__abs" style={rootAt(238, 418, 75, 23)}>
        <XPButton onClick={onClose}>Cancel</XPButton>
      </div>
      <div className="dp__abs" style={rootAt(319, 418, 75, 23)}>
        <XPButton
          disabled={!dirty && !saverDirty && !appearDirty && !dispDirty}
          onClick={apply}
        >
          Apply
        </XPButton>
      </div>

      {keepPrompt && (
        <MonitorSettingsDialog
          onKeep={() => setKeepPrompt(null)}
          onRevert={() => {
            applyDisplay(keepPrompt.prev);
            setDispApplied(keepPrompt.prev);
            setDisp(keepPrompt.prev);
            setKeepPrompt(null);
          }}
        />
      )}
      {effectsOpen && (
        <EffectsDialog
          value={appear.effects || DEFAULT_EFFECTS}
          onOK={effects => {
            setAppear(a => ({ ...a, effects }));
            setEffectsOpen(false);
          }}
          onCancel={() => setEffectsOpen(false)}
        />
      )}
      {advancedOpen && (
        <AdvancedDisplayDialog
          dpi={disp.dpi}
          onOK={dpi => {
            setDisp(d => ({ ...d, dpi }));
            setAdvancedOpen(false);
          }}
          onCancel={() => setAdvancedOpen(false)}
        />
      )}
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

/* The Monitor Settings and adapter dialogs render in a portal, outside Root,
   so they carry the rules they share with the property sheet. */
const DialogBody = styled.div`
  padding: 10px 12px 12px;
  font-family: Tahoma, 'Noto Sans', sans-serif;
  font-size: 11px;
  background: var(--xp-face, #ece9d8);
  color: #000;
  display: flex;
  flex-direction: column;
  .dp__dialog-text {
    line-height: 13px;
    margin-bottom: 8px;
  }
  .dp__dialog-note {
    margin: 4px 0 2px;
    color: var(--xp-gray-text, #aca899);
  }
  .dp__dialog-buttons {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    margin-top: 12px;
  }
  .dp__tabs {
    display: flex;
    padding-left: 2px;
    position: relative;
    top: 1px;
    flex-shrink: 0;
    z-index: 1;
    image-rendering: pixelated;
  }
  /* the style's tab: normal, hot, selected; the selected one stands taller
     and joins the page */
  .dp__tab {
    height: 18px;
    line-height: 18px;
    padding: 0 10px;
    margin-right: 0;
    margin-top: 2px;
    border: 0 solid transparent;
    border-image: var(--xp-p-tab-tabitem-1, none);
    background: var(--xp-tab-bg, none);
    cursor: default;
  }
  .dp__tab:hover {
    border-image: var(--xp-p-tab-tabitem-2, none);
  }
  .dp__tab--active,
  .dp__tab--active:hover {
    position: relative;
    z-index: 2;
    height: 21px;
    line-height: 20px;
    margin-top: 0;
    margin-bottom: -1px;
    padding: 0 12px;
    border-image: var(--xp-p-tab-tabitem-3, none);
  }
  .dp__label {
    margin: 6px 0 3px;
    align-self: flex-start;
  }
  .dp__select--wide {
    min-width: 170px;
  }
  .dp__select--left {
    align-self: flex-start;
  }
  .dp__group {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid #d0cdb9;
    border-radius: 3px;
    padding: 8px 10px 10px;
    margin-top: 10px;
    display: flex;
    flex-direction: column;
  }
  .dp__legend {
    position: absolute;
    top: -8px;
    left: 8px;
    background: var(--xp-face, #ece9d8);
    padding: 0 3px;
    color: #003399;
  }
  .dp__radio {
    display: flex;
    align-items: center;
    gap: 4px;
    margin: 3px 0;
  }
`;

const REVERT_SECONDS = 15;

/** "Your desktop has been reconfigured": Yes keeps it, No or the clock reverts. */
function MonitorSettingsDialog({ onKeep, onRevert }) {
  const [left, setLeft] = useState(REVERT_SECONDS);
  useEffect(() => {
    if (left <= 0) {
      onRevert();
      return undefined;
    }
    const t = setTimeout(() => setLeft(n => n - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);
  return (
    <XPDialogFrame title="Monitor Settings" width={330} onClose={onRevert}>
      <DialogBody>
        <div className="dp__dialog-text">
          Your desktop has been reconfigured. Do you want to keep these
          settings?
          <br />
          <br />
          Reverting in {left} second{left === 1 ? '' : 's'}.
        </div>
        <div className="dp__dialog-buttons">
          <XPButton autoFocus onClick={onKeep}>
            Yes
          </XPButton>
          <XPButton onClick={onRevert}>No</XPButton>
        </div>
      </DialogBody>
    </XPDialogFrame>
  );
}

const DPI_OPTIONS = [
  { value: 96, label: 'Normal size (96 DPI)' },
  { value: 120, label: 'Large size (120 DPI)' },
];

/** The adapter's Properties, General tab: the DPI setting. */
function AdvancedDisplayDialog({ dpi, onOK, onCancel }) {
  const [pending, setPending] = useState(dpi);
  return (
    <XPDialogFrame
      title="Plug and Play Monitor and NVIDIA GeForce4 MX 440 Properties"
      width={410}
      onClose={onCancel}
    >
      <DialogBody>
        <div className="dp__tabs dp__tabs--dialog">
          <div className="dp__tab dp__tab--active">General</div>
          <div className="dp__tab">Adapter</div>
          <div className="dp__tab">Monitor</div>
          <div className="dp__tab">Troubleshoot</div>
          <div className="dp__tab">Color Management</div>
        </div>
        <div className="dp__group dp__group--legend">
          <div className="dp__legend">Display</div>
          <div className="dp__dialog-text">
            If your screen resolution makes screen items too small to view
            comfortably, you can increase the DPI to compensate. To change font
            sizes only, click Cancel and go to the Appearance tab.
          </div>
          <div className="dp__label">DPI setting:</div>
          <XPSelect
            className="dp__select--wide dp__select--left"
            options={DPI_OPTIONS}
            value={pending}
            onChange={setPending}
          />
          <div className="dp__dialog-note">
            {pending === 96 ? 'Normal size (96 dpi)' : 'Large size (120 dpi)'}
          </div>
        </div>
        <div className="dp__group dp__group--legend">
          <div className="dp__legend">Compatibility</div>
          <div className="dp__dialog-text">
            Some programs might not operate properly unless you restart the
            computer after changing display settings.
          </div>
          <label className="dp__radio">
            <input type="radio" name="dp-compat" disabled />
            Restart the computer before applying the new display settings
          </label>
          <label className="dp__radio">
            <input type="radio" name="dp-compat" defaultChecked />
            Apply the new display settings without restarting
          </label>
          <label className="dp__radio">
            <input type="radio" name="dp-compat" disabled />
            Ask me before applying the new display settings
          </label>
        </div>
        <div className="dp__dialog-buttons">
          <XPButton autoFocus onClick={() => onOK(pending)}>
            OK
          </XPButton>
          <XPButton onClick={onCancel}>Cancel</XPButton>
        </div>
      </DialogBody>
    </XPDialogFrame>
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

/**
 * The sample desktop, drawn from an appearance's own tokens with the real
 * chrome at full size, the way XP paints it. The Themes tab shows one active
 * window over the background with the Recycle Bin; the Appearance tab shows
 * an inactive window, the active window and a message box. Positions are
 * XP's, measured inside the sunken frame.
 */
// the sample's window rectangles, measured off XP at 1024x768 for each style
const SAMPLE_RECTS = {
  luna: {
    inactive: { left: 8, top: 8, width: 314, height: 137 },
    active: { left: 18, top: 30, width: 321, height: 135 },
    themes: { left: 29, top: 15, width: 204, height: 146 },
    msg: { left: 98, top: 58, width: 150, height: 100 },
  },
  classic: {
    inactive: { left: 17, top: 5, width: 305, height: 139 },
    active: { left: 21, top: 28, width: 323, height: 121 },
    themes: { left: 29, top: 15, width: 204, height: 146 },
    msg: { left: 29, top: 107, width: 207, height: 57 },
  },
};

function MiniDesktop({
  appearance,
  variant = 'appearance',
  wallpaperUrl = null,
  color = null,
}) {
  const { vars, style } = themeVars(appearance);
  const ground = wallpaperUrl
    ? { backgroundImage: `url(${wallpaperUrl})`, backgroundSize: 'cover' }
    : { backgroundColor: color || DESKTOP_COLOR };
  const themes = variant === 'themes';
  const rects = SAMPLE_RECTS[style === 'classic' ? 'classic' : 'luna'];
  return (
    <Mini style={{ ...vars, ...ground }} data-xp-style={style}>
      {!themes && (
        <MiniWindow
          className="mw--inactive"
          title="Inactive Window"
          inactive
          style={rects.inactive}
        />
      )}
      <MiniWindow
        className="mw--active"
        title="Active Window"
        style={themes ? rects.themes : rects.active}
      >
        <div className="mw__menu">
          <span>Normal</span>
          <span className="mw__menu--disabled">Disabled</span>
          <span className="mw__menu--selected">Selected</span>
        </div>
        <div className="mw__client">
          <div className="mw__text">Window Text</div>
          <div className="mw__scroll">
            <i className="mw__scroll__up" />
            <i className="mw__scroll__thumb" />
            <i className="mw__scroll__down" />
          </div>
        </div>
      </MiniWindow>
      {!themes && (
        <MiniWindow
          className="mw--msg"
          title="Message Box"
          closeOnly
          style={rects.msg}
        >
          <div className="mw__body">
            <div className="mw__msgtext">Message Text</div>
            <div className="mw__btn">OK</div>
          </div>
        </MiniWindow>
      )}
      {themes && <img className="mw__bin" src={recycleBinIcon} alt="" />}
    </Mini>
  );
}

/** One sample window: the caption band, side and bottom frame parts. */
function MiniWindow({
  className,
  title,
  inactive = false,
  closeOnly = false,
  style,
  children,
}) {
  const st = inactive ? 2 : 1;
  return (
    <div className={`mw ${className}`} style={style}>
      <div className="mw__cap" data-state={st} />
      <div className="mw__fl" data-state={st} />
      <div className="mw__fr" data-state={st} />
      <div className="mw__fb" data-state={st} />
      <div className="mw__title">{title}</div>
      <MiniButtons close={closeOnly} inactive={inactive} />
      <div className="mw__inner">{children}</div>
    </div>
  );
}

/** The caption's buttons: the style's own 21x21 bitmaps. */
function MiniButtons({ close = false, inactive = false }) {
  const st = inactive ? 5 : 1;
  return (
    <span className="mw__btns">
      {!close && <i className="mw__cb mw__cb--min" data-state={st} />}
      {!close && <i className="mw__cb mw__cb--max" data-state={st} />}
      <i className="mw__cb mw__cb--close" data-state={st} />
    </span>
  );
}

const Root = styled.div`
  position: absolute;
  inset: 0;
  background: var(--xp-face, #ece9d8);
  font-family: Tahoma, 'Noto Sans', sans-serif;
  font-size: 11px;
  line-height: 13px;
  user-select: none;

  .dp__abs {
    position: absolute;
    box-sizing: border-box;
  }
  .dp__abs > .xp-button {
    width: 100%;
    height: 100%;
    min-width: 0;
    padding: 0 2px;
  }
  .dp__tabs {
    display: flex;
    align-items: flex-end;
    image-rendering: pixelated;
    z-index: 1;
  }
  .dp__tab {
    box-sizing: border-box;
    height: 18px;
    line-height: 18px;
    padding: 0 6px;
    border: 0 solid transparent;
    border-image: var(--xp-p-tab-tabitem-1, none);
    background: var(--xp-tab-bg, none);
    cursor: default;
  }
  .dp__tab:hover {
    border-image: var(--xp-p-tab-tabitem-2, none);
  }
  .dp__tab--active,
  .dp__tab--active:hover {
    position: relative;
    z-index: 2;
    height: 21px;
    line-height: 20px;
    margin-bottom: -1px;
    padding: 0 8px;
    border-image: var(--xp-p-tab-tabitem-3, none);
  }
  .dp__page {
    box-sizing: border-box;
    border: 0 solid transparent;
    border-image: var(--xp-p-tab-pane-1, none);
    background: var(--xp-tab-page, #fdfdfa);
    image-rendering: pixelated;
    overflow: visible;
  }
  /* the sunken 3D frame around a sample (SS_SUNKEN): two dark lines outside
     a light one, its content inset 3px */
  /* the sunken frame around the samples: two rings at the top and left,
     one at the bottom and right, as the VM draws it */
  .dp__frame {
    padding: 2px 1px 1px 2px;
    background: var(--xp-face, #ece9d8);
    box-shadow: inset 1px 1px #aca899, inset -1px -1px #ffffff,
      inset 2px 2px #716f64;
  }
  .dp__frame > * {
    width: 100%;
    height: 100%;
  }
  .dp__text {
    line-height: 13px;
  }

  .dp__label {
    white-space: nowrap;
  }
  .dp__list {
    overflow-y: auto;
    border: 1px solid var(--xp-select-border, #7f9db9);
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
    background: var(--xp-highlight, #316ac5);
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
    gap: 2px;
    width: 100%;
    height: 21px;
    box-sizing: border-box;
    border: 1px solid var(--xp-select-border, #7f9db9);
    background: var(--xp-window, #fff);
    padding: 1px 0 1px 3px;
    cursor: default;
  }
  .dp__swatch {
    display: inline-block;
    flex: 1;
    height: 100%;
    min-height: 13px;
    border: 1px solid #808080;
  }
  .dp__coldrop {
    width: 15px;
    height: 17px;
    flex-shrink: 0;
    position: relative;
    border: 0 solid transparent;
    border-image: var(--xp-p-combobox-dropdownbutton-1, none);
    image-rendering: pixelated;
  }
  .dp__coldrop::after {
    content: '';
    position: absolute;
    inset: 0;
    background: var(--xp-g-combobox-dropdownbutton-1, none) center no-repeat;
    image-rendering: pixelated;
  }
  .dp__palette {
    position: absolute;
    top: 22px;
    right: 0;
    z-index: 5;
    background: #fff;
    border: 1px solid var(--xp-select-border, #7f9db9);
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
      outline: 1px solid var(--xp-highlight, #316ac5);
    }
  }
  /* the style's group box frame (button.groupbox), border only; its
     caption rides the top line */
  .dp__group {
    border: 0 solid transparent;
    border-image: var(--xp-p-button-groupbox-1, none);
    image-rendering: pixelated;
  }
  .dp__legend {
    background: var(--xp-tab-page, #fdfdfa);
    padding: 0 2px;
    color: var(--xp-group-box-text, #0046d5);
    white-space: nowrap;
  }
  .dp__spinbox {
    display: flex;
    border: 1px solid var(--xp-select-border, #7f9db9);
    background: var(--xp-window, #fff);
  }
  .dp__spin {
    flex: 1;
    min-width: 0;
    border: none;
    outline: none;
    padding: 0 0 0 3px;
    background: transparent;
    font-family: Tahoma, 'Noto Sans', sans-serif;
    font-size: 11px;
    color: var(--xp-window-text, #000);
  }
  .dp__spinbtns {
    display: flex;
    flex-direction: column;
    width: 15px;
    margin: 1px 1px 1px 0;
  }
  .dp__spinbtn {
    flex: 1;
    position: relative;
    padding: 0;
    border: 0 solid transparent;
    background: transparent;
    image-rendering: pixelated;
  }
  .dp__spinbtn::after {
    content: '';
    position: absolute;
    inset: 0;
    background-repeat: no-repeat;
    background-position: center;
    image-rendering: pixelated;
  }
  .dp__spinbtn--up {
    border-image: var(--xp-p-spin-up-1, none);
  }
  .dp__spinbtn--up::after {
    background-image: var(--xp-g-spin-up-1, none);
  }
  .dp__spinbtn--up:hover {
    border-image: var(--xp-p-spin-up-2, none);
  }
  .dp__spinbtn--up:active {
    border-image: var(--xp-p-spin-up-3, none);
  }
  .dp__spinbtn--down {
    border-image: var(--xp-p-spin-down-1, none);
  }
  .dp__spinbtn--down::after {
    background-image: var(--xp-g-spin-down-1, none);
  }
  .dp__spinbtn--down:hover {
    border-image: var(--xp-p-spin-down-2, none);
  }
  .dp__spinbtn--down:active {
    border-image: var(--xp-p-spin-down-3, none);
  }
  .dp__check {
    display: flex;
    align-items: center;
    gap: 4px;
    white-space: nowrap;
  }
  .dp__res {
    text-align: center;
  }
  /* align-self overrides the page's centered column layout */
  /* XP groupbox: etched box with the caption riding the top border.
     The Settings row splits into two EQUAL boxes, like the real tab. */
  .dp__group--legend {
    position: relative;
    margin-top: 12px;
    padding-top: 12px;
  }
  /* the style's slider: its track, its 11x21 thumb (normal, hot, pressed),
     and tick marks in the style's tic colour */
  .dp__sliderwrap {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .dp__slider {
    width: 100%;
    height: 21px;
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
  }
  .dp__slider::-webkit-slider-runnable-track {
    height: 4px;
    border: 0 solid transparent;
    border-image: var(--xp-p-trackbar-track-1, none);
    border-radius: 0;
    background: var(--xp-track-fallback, none);
    image-rendering: pixelated;
  }
  .dp__slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 11px;
    height: 21px;
    margin-top: -9px;
    border: 0;
    border-radius: 0;
    background: var(--xp-i-trackbar-thumbbottom-1, url(${sliderThumb}))
      no-repeat center;
    image-rendering: pixelated;
  }
  .dp__slider:hover::-webkit-slider-thumb {
    background-image: var(--xp-i-trackbar-thumbbottom-2, url(${sliderThumb}));
  }
  .dp__slider:active::-webkit-slider-thumb {
    background-image: var(--xp-i-trackbar-thumbbottom-3, url(${sliderThumb}));
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
    width: calc(100% - 11px);
    margin-top: 1px;
  }
  .dp__ticks span {
    width: 1px;
    height: 3px;
    background: var(--xp-track-tics, #808080);
  }
  .dp__colorbar {
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
  position: relative;
  overflow: hidden;
  font-family: Tahoma, 'Noto Sans', sans-serif;
  font-size: 11px;
  image-rendering: pixelated;

  .mw {
    position: absolute;
    box-sizing: border-box;
    padding: var(--xp-caption-total, 29px) var(--xp-frame-w, 4px)
      var(--xp-frame-w, 4px);
    background: var(--xp-window, #fff);
  }
  .mw--msg {
    background: var(--xp-face, #ece9d8);
  }
  .mw__cap,
  .mw__fl,
  .mw__fr,
  .mw__fb {
    position: absolute;
    border: 0 solid transparent;
    pointer-events: none;
  }
  .mw__cap {
    left: 0;
    right: 0;
    top: 0;
    height: var(--xp-caption-total, 29px);
    border-image: var(--xp-p-window-caption-1, none);
    background: var(--xp-caption-active, none);
  }
  .mw__cap[data-state='2'] {
    border-image: var(--xp-p-window-caption-2, none);
    background: var(--xp-caption-inactive, none);
  }
  .mw__fl,
  .mw__fr {
    top: var(--xp-caption-total, 29px);
    bottom: 0;
    width: var(--xp-frame-w, 4px);
  }
  .mw__fl {
    left: 0;
    border-image: var(--xp-p-window-frameleft-1, none);
  }
  .mw__fl[data-state='2'] {
    border-image: var(--xp-p-window-frameleft-2, none);
  }
  .mw__fr {
    right: 0;
    border-image: var(--xp-p-window-frameright-1, none);
  }
  .mw__fr[data-state='2'] {
    border-image: var(--xp-p-window-frameright-2, none);
  }
  .mw__fb {
    left: 0;
    right: 0;
    bottom: 0;
    height: var(--xp-frame-w, 4px);
    border-image: var(--xp-p-window-framebottom-1, none);
  }
  .mw__fb[data-state='2'] {
    border-image: var(--xp-p-window-framebottom-2, none);
  }
  .mw__title {
    position: absolute;
    left: 8px;
    top: 4px;
    right: 80px;
    height: var(--xp-caption-h, 25px);
    line-height: var(--xp-caption-h, 25px);
    font: 700 var(--xp-font-caption, 13px)
      var(--xp-caption-font, 'Trebuchet MS', Tahoma, sans-serif);
    color: var(--xp-caption-text, #fff);
    text-shadow: 1px 1px var(--xp-caption-shadow, #0a1883);
    white-space: nowrap;
    overflow: hidden;
  }
  /* the message box has one button, so its title runs further right */
  .mw--msg .mw__title {
    right: 28px;
  }
  .mw--inactive .mw__title {
    color: var(--xp-caption-text-inactive, #d8e4f8);
    text-shadow: 1px 1px var(--xp-caption-shadow-inactive, #4a72b0);
  }
  .mw__btns {
    position: absolute;
    top: 5px;
    right: 4px;
    display: flex;
    gap: 3px;
  }
  .mw__cb {
    display: block;
    position: relative;
    width: 21px;
    height: 21px;
    border: 0;
    box-sizing: border-box;
    background-repeat: no-repeat, no-repeat;
    background-position: center, center;
    image-rendering: pixelated;
  }
  .mw__cb--min {
    background-image: var(--xp-g-window-minbutton-1, none),
      var(--xp-i-window-minbutton-1, none);
  }
  .mw__cb--max {
    background-image: var(--xp-g-window-maxbutton-1, none),
      var(--xp-i-window-maxbutton-1, none);
  }
  .mw__cb--close {
    background-image: var(--xp-g-window-closebutton-1, none),
      var(--xp-i-window-closebutton-1, none);
  }
  .mw__cb--min[data-state='5'] {
    background-image: var(--xp-g-window-minbutton-5, none),
      var(--xp-i-window-minbutton-5, none);
  }
  .mw__cb--max[data-state='5'] {
    background-image: var(--xp-g-window-maxbutton-5, none),
      var(--xp-i-window-maxbutton-5, none);
  }
  .mw__cb--close[data-state='5'] {
    background-image: var(--xp-g-window-closebutton-5, none),
      var(--xp-i-window-closebutton-5, none);
  }
  .mw__inner {
    position: relative;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  /* Luna draws no menu bar in the sample; Classic does */
  .mw__menu {
    display: none;
    gap: 12px;
    padding: 0 6px;
    height: 18px;
    line-height: 18px;
    background: var(--xp-menu, var(--xp-face));
    color: var(--xp-menu-text, #000);
  }
  .mw__menu--disabled {
    color: var(--xp-gray-text, #aca899);
  }
  .mw__menu--selected {
    background: var(--xp-highlight, #316ac5);
    color: var(--xp-highlight-text, #fff);
    padding: 0 3px;
  }
  .mw__client {
    flex: 1;
    min-height: 0;
    display: flex;
    background: var(--xp-window, #fff);
  }
  .mw__client .mw__text {
    flex: 1;
    padding: 2px 3px;
    color: var(--xp-window-text, #000);
  }
  .mw__scroll {
    width: 17px;
    display: flex;
    flex-direction: column;
    border: 0 solid transparent;
    border-image: var(--xp-p-scrollbar-lowertrackvert-1, none);
    background: var(--xp-scrollbar, transparent);
  }
  .mw__scroll i {
    display: block;
    position: relative;
    border: 0 solid transparent;
  }
  .mw__scroll__up,
  .mw__scroll__down {
    height: 17px;
    background-repeat: no-repeat, no-repeat;
    background-position: center, center;
  }
  .mw__scroll__up {
    background-image: var(--xp-g-scrollbar-arrowbtn-1, none),
      var(--xp-i-scrollbar-arrowbtn-1, none);
  }
  .mw__scroll__down {
    margin-top: auto;
    background-image: var(--xp-g-scrollbar-arrowbtn-5, none),
      var(--xp-i-scrollbar-arrowbtn-5, none);
  }
  .mw__scroll__thumb {
    height: 16px;
    margin-top: 0;
    border-image: var(--xp-pn-scrollbar-thumbbtnvert-1, none);
    background: var(--xp-i-scrollbar-grippervert-1, none) center no-repeat,
      var(--xp-i-scrollbar-thumbbtnvert-mid-1, none) center / 100% 100%
        no-repeat;
  }
  .mw__body {
    flex: 1;
    position: relative;
    color: var(--xp-window-text, #000);
  }
  /* Luna's sample box shows only its button; Classic writes Message Text */
  .mw__msgtext {
    display: none;
    position: absolute;
    left: 10px;
    top: 4px;
  }
  .mw__btn {
    position: absolute;
    left: 50%;
    top: 20px;
    width: 78px;
    height: 23px;
    margin-left: -39px;
    box-sizing: border-box;
    border: 0 solid transparent;
    border-image: var(--xp-p-button-pushbutton-1, none);
    color: var(--xp-button-text, #000);
    text-align: center;
    line-height: 23px;
  }
  .mw__bin {
    position: absolute;
    right: 14px;
    bottom: 12px;
    width: 32px;
    height: 32px;
  }

  /* Windows Classic in the sample, whatever the desktop is wearing now.
     Sizeable windows wear a 4px frame (face, light, face, face / dark,
     shadow, face, face); the message box a 3px dialog frame. */
  &[data-xp-style='classic'] {
    .mw {
      padding: 22px 4px 4px;
      background: var(--xp-face);
      box-shadow: inset 1px 1px var(--xp-face),
        inset -1px -1px var(--xp-face-dk-shadow),
        inset 2px 2px var(--xp-face-light),
        inset -2px -2px var(--xp-face-shadow);
    }
    .mw--msg {
      padding: 21px 3px 3px;
    }
    .mw__cap {
      left: 4px;
      right: 4px;
      top: 4px;
      height: 18px;
      border-image: none;
    }
    .mw--msg .mw__cap {
      left: 3px;
      right: 3px;
      top: 3px;
    }
    .mw__fl,
    .mw__fr,
    .mw__fb {
      display: none;
    }
    .mw__title {
      left: 6px;
      top: 4px;
      right: 60px;
      height: 18px;
      line-height: 18px;
      font: 700 11px Tahoma, 'Noto Sans', sans-serif;
      text-shadow: none;
    }
    .mw--msg .mw__title {
      left: 5px;
      top: 3px;
    }
    .mw__btns {
      top: 6px;
      right: 6px;
      gap: 0;
    }
    .mw--msg .mw__btns {
      top: 5px;
      right: 5px;
    }
    .mw__cb {
      width: 16px;
      height: 14px;
      border-image: none;
      background: var(--xp-face);
      box-shadow: inset 1px 1px var(--xp-face-light),
        inset -1px -1px var(--xp-face-dk-shadow),
        inset -2px -2px var(--xp-face-shadow);
    }
    .mw__cb--close {
      margin-left: 2px;
    }
    .mw--msg .mw__cb--close {
      margin-left: 0;
    }
    .mw__cb {
      background-image: none;
    }
    .mw__cb::after {
      content: '';
      position: absolute;
      inset: 0;
      background: var(--xp-button-text, #000);
      -webkit-mask: var(--glyph) var(--glyph-pos) no-repeat;
      mask: var(--glyph) var(--glyph-pos) no-repeat;
    }
    .mw__cb--min {
      --glyph: url(${classicMin});
      --glyph-pos: 4px 9px;
    }
    .mw__cb--max {
      --glyph: url(${classicMax});
      --glyph-pos: 3px 2px;
    }
    .mw__cb--close {
      --glyph: url(${classicClose});
      --glyph-pos: 4px 3px;
    }
    .mw__menu {
      display: flex;
      gap: 12px;
      padding: 0 5px;
      height: 19px;
      line-height: 19px;
      background: var(--xp-face);
    }
    .mw__menu--selected {
      padding: 0;
      background: none;
      color: var(--xp-menu-text, #000);
    }
    .mw__client {
      padding: 1px;
      border: 1px solid;
      border-color: var(--xp-face-shadow) var(--xp-face-light)
        var(--xp-face-light) var(--xp-face-shadow);
      box-shadow: inset 1px 1px var(--xp-face-dk-shadow),
        inset -1px -1px var(--xp-face);
    }
    .mw__client .mw__text {
      padding: 2px 1px;
      font-weight: 700;
    }
    .mw__scroll {
      width: 16px;
      border-image: none;
      background: var(--xp-face);
    }
    .mw__scroll__up,
    .mw__scroll__down {
      height: 16px;
      background: var(--xp-face);
      box-shadow: inset 1px 1px var(--xp-face-light),
        inset -1px -1px var(--xp-face-dk-shadow),
        inset -2px -2px var(--xp-face-shadow);
    }
    .mw__scroll__up::after,
    .mw__scroll__down::after {
      content: '';
      position: absolute;
      inset: 0;
      background: var(--xp-button-text, #000);
      -webkit-mask: var(--glyph) 4px 6px no-repeat;
      mask: var(--glyph) 4px 6px no-repeat;
    }
    .mw__scroll__up {
      --glyph: url(${classicScrollUp});
    }
    .mw__scroll__down {
      --glyph: url(${classicScrollDown});
    }
    .mw__scroll__thumb {
      display: none;
    }
    .mw__msgtext {
      display: block;
      left: 4px;
      top: 3px;
    }
    .mw__btn {
      left: 64px;
      top: 12px;
      width: 72px;
      height: 24px;
      margin-left: 0;
      border: 0;
      border-image: none;
      background: var(--xp-face);
      box-shadow: inset 1px 1px var(--xp-face-light),
        inset -1px -1px var(--xp-face-dk-shadow),
        inset -2px -2px var(--xp-face-shadow);
      line-height: 24px;
    }
  }
`;
