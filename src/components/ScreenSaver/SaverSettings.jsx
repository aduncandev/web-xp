import React, { useState } from 'react';
import styled from 'styled-components';

import XPDialogFrame from 'components/XPDialogFrame';
import XPButton from 'components/XPButton';
import XPSelect from 'components/XPSelect';
import FileDialog from 'components/FileDialog';
import { SPECIAL_FOLDERS } from '../../context/vfsConstants';
import { getBaseName } from '../../context/vfsUtils';
import { WALLPAPER_EXTENSIONS } from '../../WinXP/shell/fileTypes';

import { SAVERS } from './savers';
import { VGA_PALETTE } from './savers2d';
import sliderThumb from 'assets/xp/SliderThumb.png';

/**
 * Setup sheets rebuilt from the DIALOG resources inside the real .scr
 * binaries — group boxes, labels, control types, ranges and titles all match
 * what ssmyst/ssbezier/ssstars/ssmarque/sspipes/sstext3d/ss3dfo/ssflwbox/
 * ssmypics actually declare.
 */

const FONTS = [
  'Tahoma',
  'Arial',
  'Times New Roman',
  'Courier New',
  'Verdana',
  'Comic Sans MS',
  'Impact',
];

// Titles as the binaries declare them
const TITLES = {
  Mystify: 'Mystify Setup',
  Beziers: 'Bezier Screen Saver Setup',
  Starfield: 'Starfield Simulation Setup',
  Marquee: 'Marquee Setup',
  '3D Pipes': '3D Pipes Settings',
  '3D Text': '3D Text Settings',
  '3D Flying Objects': '3D Flying Objects Settings',
  '3D FlowerBox': '3D FlowerBox Settings',
  'My Pictures Slideshow': 'My Pictures Screen Saver Options',
};

const WIDTHS = {
  Mystify: 400,
  Beziers: 350,
  Starfield: 340,
  Marquee: 460,
  '3D Pipes': 500,
  '3D Text': 560,
  '3D Flying Objects': 420,
  '3D FlowerBox': 340,
  'My Pictures Slideshow': 400,
};

export default function SaverSettings({ name, settings, onSave, onClose }) {
  const base = { ...(SAVERS[name] ? SAVERS[name].defaults : {}), ...settings };
  const [s, setS] = useState(base);
  // Mystify edits one polygon at a time through its Shape combo
  const [shape, setShape] = useState(1);
  const set = (k, v) => setS(prev => ({ ...prev, [k]: v }));

  /** Slow ─ Fast style track, as the originals label them. */
  const track = (key, min, max, lo, hi, step = 1) => (
    <div className="sv__track">
      <div className="sv__ends">
        <span>{lo}</span>
        <span>{hi}</span>
      </div>
      <input
        className="sv__slider"
        type="range"
        min={min}
        max={max}
        step={step}
        value={s[key]}
        onChange={e => set(key, Number(e.target.value))}
      />
    </div>
  );

  /** Edit box with an up-down spinner beside it. */
  const spin = (key, min, max) => (
    <input
      className="sv__spin"
      type="number"
      min={min}
      max={max}
      value={s[key]}
      onChange={e =>
        set(key, Math.min(max, Math.max(min, Number(e.target.value) || min)))
      }
    />
  );

  const paletteSelect = (key, disabled) => (
    <XPSelect
      className="sv__select sv__select--color"
      value={s[key]}
      disabled={disabled}
      options={VGA_PALETTE.map(([label, hex], i) => ({
        value: i,
        label,
        style: { color: hex },
      }))}
      onChange={v => set(key, Number(v))}
    />
  );

  const check = (key, label) => (
    <label className="sv__check">
      <input
        type="checkbox"
        checked={!!s[key]}
        onChange={() => set(key, !s[key])}
      />
      <span>{label}</span>
    </label>
  );

  const radio = (key, value, label, group) => (
    <label className="sv__check">
      <input
        type="radio"
        name={group}
        checked={s[key] === value}
        onChange={() => set(key, value)}
      />
      <span>{label}</span>
    </label>
  );

  // Choose Texture... / Choose Reflection... / Texture...: the originals
  // open the common Open dialog filtered to bitmaps; `browsing` names the
  // settings key the chosen file goes into.
  const [browsing, setBrowsing] = useState(null);
  const BITMAP_FILTERS = [
    { label: 'Bitmaps (*.bmp)', extensions: ['.bmp'] },
    {
      label: `All Picture Files (${WALLPAPER_EXTENSIONS.map(e => `*${e}`).join(
        ';',
      )})`,
      extensions: WALLPAPER_EXTENSIONS,
    },
    { label: 'All Files', extensions: null },
  ];
  const chooser = (key, label, onOpen) => (
    <span className="sv__chooser">
      <XPButton
        className="sv__btn"
        onClick={() => {
          if (onOpen) onOpen();
          setBrowsing(key);
        }}
      >
        {label}
      </XPButton>
      {s[key] ? (
        <span className="sv__file" title={s[key]}>
          {getBaseName(s[key])}
        </span>
      ) : null}
    </span>
  );
  const browser = browsing ? (
    <FileDialog
      mode="open"
      title={
        browsing === 'reflectionPath'
          ? 'Choose Custom Environment Map'
          : 'Choose Custom Texture'
      }
      initialPath={SPECIAL_FOLDERS.MY_PICTURES}
      filters={BITMAP_FILTERS}
      onSelect={path => {
        set(browsing, path);
        setBrowsing(null);
      }}
      onCancel={() => setBrowsing(null)}
    />
  ) : null;

  let body = null;

  // --- Mystify Setup -------------------------------------------------
  if (name === 'Mystify') {
    const k = `poly${shape}`;
    body = (
      <>
        <fieldset className="sv__group">
          <legend>Object</legend>
          <div className="sv__row">
            <span className="sv__label">Shape:</span>
            <XPSelect
              className="sv__select sv__select--narrow"
              value={shape}
              options={[1, 2].map(n => ({
                value: n,
                label: `Polygon ${n}`,
              }))}
              onChange={v => setShape(Number(v))}
            />
            <label className="sv__check">
              <input
                type="checkbox"
                checked={!!s[`${k}Active`]}
                onChange={() => set(`${k}Active`, !s[`${k}Active`])}
              />
              <span>Active</span>
            </label>
            <span className="sv__label sv__label--tight">Lines:</span>
            {spin(`${k}Lines`, 1, 15)}
          </div>
          <fieldset className="sv__group sv__group--inner">
            <legend>Colors To Use</legend>
            <div className="sv__row">
              <label className="sv__check">
                <input
                  type="radio"
                  name="mys-col"
                  checked={!!s[`${k}TwoColors`]}
                  onChange={() => set(`${k}TwoColors`, true)}
                />
                <span>Two Colors</span>
              </label>
              {paletteSelect(`${k}ColorA`, !s[`${k}TwoColors`])}
              {paletteSelect(`${k}ColorB`, !s[`${k}TwoColors`])}
            </div>
            <label className="sv__check">
              <input
                type="radio"
                name="mys-col"
                checked={!s[`${k}TwoColors`]}
                onChange={() => set(`${k}TwoColors`, false)}
              />
              <span>Multiple Random Colors</span>
            </label>
          </fieldset>
        </fieldset>
        {check('clearScreen', 'Clear Screen')}
      </>
    );
  }

  // --- Bezier Screen Saver Setup -------------------------------------
  else if (name === 'Beziers') {
    body = (
      <>
        <fieldset className="sv__group">
          <legend>Length</legend>
          <div className="sv__row">
            <span className="sv__grow">Beziers in each loop (1-10)</span>
            {spin('length', 1, 10)}
          </div>
        </fieldset>
        <fieldset className="sv__group">
          <legend>Width</legend>
          <div className="sv__row">
            <span className="sv__grow">Repeat each loop (1-100)</span>
            {spin('width', 1, 100)}
          </div>
        </fieldset>
        <fieldset className="sv__group">
          <legend>Speed</legend>
          {track('speed', 20, 260, 'Slow', 'Fast', 10)}
        </fieldset>
      </>
    );
  }

  // --- Starfield Simulation Setup ------------------------------------
  else if (name === 'Starfield') {
    body = (
      <>
        <fieldset className="sv__group">
          <legend>Warp Speed</legend>
          {track('warp', 1, 20, 'Slow', 'Fast')}
        </fieldset>
        <fieldset className="sv__group">
          <legend>Starfield Density</legend>
          <div className="sv__row">
            <span className="sv__grow">Number of stars (10-200)</span>
            {spin('density', 10, 200)}
          </div>
        </fieldset>
      </>
    );
  }

  // --- Marquee Setup -------------------------------------------------
  else if (name === 'Marquee') {
    body = (
      <>
        <div className="sv__cols">
          <fieldset className="sv__group sv__grow">
            <legend>Position</legend>
            <div className="sv__row">
              {radio('position', 'centered', 'Centered', 'mq-pos')}
              {radio('position', 'random', 'Random', 'mq-pos')}
            </div>
          </fieldset>
          <fieldset className="sv__group sv__grow">
            <legend>Speed</legend>
            {track('speed', 1, 20, 'Slow', 'Fast')}
          </fieldset>
        </div>
        <div className="sv__row">
          <span className="sv__label">Background Color:</span>
          {paletteSelect('backgroundColor', false)}
        </div>
        <div className="sv__row">
          <span className="sv__label sv__label--tight">Text:</span>
          <input
            className="sv__field"
            value={s.text}
            onChange={e => set('text', e.target.value)}
            spellCheck={false}
          />
        </div>
        <fieldset className="sv__group">
          <legend>Text Example</legend>
          <div
            className="sv__example"
            style={{
              background: VGA_PALETTE[s.backgroundColor][1],
              color: s.color,
              fontFamily: s.fontFamily,
              fontWeight: s.bold ? 700 : 400,
              fontStyle: s.italic ? 'italic' : 'normal',
            }}
          >
            {s.text}
          </div>
        </fieldset>
        {/* Format Text... is the font chooser; inline here */}
        <fieldset className="sv__group">
          <legend>Format Text</legend>
          <div className="sv__row">
            <span className="sv__label sv__label--tight">Font:</span>
            <XPSelect
              className="sv__select"
              value={s.fontFamily}
              options={FONTS.map(f => ({
                value: f,
                label: f,
                style: { fontFamily: f },
              }))}
              onChange={v => set('fontFamily', v)}
            />
            <span className="sv__label sv__label--tight">Size:</span>
            {spin('fontSize', 8, 200)}
          </div>
          <div className="sv__row">
            {check('bold', 'Bold')}
            {check('italic', 'Italic')}
            <span className="sv__label sv__label--tight">Color:</span>
            <input
              className="sv__color"
              type="color"
              value={s.color}
              onChange={e => set('color', e.target.value)}
            />
          </div>
        </fieldset>
      </>
    );
  }

  // --- 3D Pipes Settings ---------------------------------------------
  else if (name === '3D Pipes') {
    body = (
      <>
        <div className="sv__cols">
          <fieldset className="sv__group sv__grow">
            <legend>Pipes</legend>
            <label className="sv__check">
              <input
                type="radio"
                name="pipes-count"
                checked={!s.multiple}
                onChange={() => set('multiple', false)}
              />
              <span>Single</span>
            </label>
            <label className="sv__check">
              <input
                type="radio"
                name="pipes-count"
                checked={!!s.multiple}
                onChange={() => set('multiple', true)}
              />
              <span>Multiple</span>
            </label>
          </fieldset>
          <fieldset className="sv__group sv__grow">
            <legend>Pipe Style</legend>
            <span className="sv__label sv__label--block">Joint Type:</span>
            <XPSelect
              className="sv__select"
              value={s.joint}
              options={[
                { value: 'elbow', label: 'Elbow' },
                { value: 'ball', label: 'Ball' },
                { value: 'mixed', label: 'Mixed' },
                { value: 'cycle', label: 'Cycle' },
              ]}
              onChange={v => set('joint', v)}
            />
          </fieldset>
        </div>
        <div className="sv__cols">
          <fieldset className="sv__group sv__grow">
            <legend>Surface Style</legend>
            {radio('surface', 'solid', 'Solid', 'pipe-surf')}
            <div className="sv__row">
              {radio('surface', 'textured', 'Textured', 'pipe-surf')}
              {chooser('texturePath', 'Choose Texture...', () =>
                set('surface', 'textured'),
              )}
            </div>
          </fieldset>
          <fieldset className="sv__group sv__grow">
            <legend>Speed</legend>
            {track('speed', 1, 20, 'Slow', 'Fast')}
          </fieldset>
        </div>
      </>
    );
  }

  // --- 3D Text Settings ----------------------------------------------
  else if (name === '3D Text') {
    body = (
      <>
        <div className="sv__cols">
          <fieldset className="sv__group sv__grow">
            <legend>Text</legend>
            <label className="sv__check">
              <input
                type="radio"
                name="t3-src"
                checked={!!s.useTime}
                onChange={() => set('useTime', true)}
              />
              <span>Time</span>
            </label>
            <div className="sv__row">
              <label className="sv__check">
                <input
                  type="radio"
                  name="t3-src"
                  checked={!s.useTime}
                  onChange={() => set('useTime', false)}
                />
                <span>Custom Text:</span>
              </label>
              <input
                className="sv__field"
                value={s.text}
                onChange={e => {
                  set('text', e.target.value);
                  set('useTime', false);
                }}
                spellCheck={false}
              />
            </div>
            {/* Choose Font... is the font chooser; inline here */}
            <div className="sv__row">
              <span className="sv__label sv__label--tight">Font:</span>
              <XPSelect
                className="sv__select"
                value={s.fontFamily}
                options={FONTS.map(f => ({
                  value: f,
                  label: f,
                  style: { fontFamily: f },
                }))}
                onChange={v => set('fontFamily', v)}
              />
            </div>
            <div className="sv__row">
              {check('bold', 'Bold')}
              {check('italic', 'Italic')}
            </div>
          </fieldset>
          <div className="sv__stack">
            <fieldset className="sv__group">
              <legend>Resolution</legend>
              {track('resolution', 1, 20, 'Low', 'High')}
            </fieldset>
            <fieldset className="sv__group">
              <legend>Size</legend>
              {track('size', 1, 20, 'Small', 'Large')}
            </fieldset>
          </div>
        </div>
        <div className="sv__cols">
          <fieldset className="sv__group sv__grow">
            <legend>Motion</legend>
            <div className="sv__row">
              <span className="sv__label">Rotation Type:</span>
              <XPSelect
                className="sv__select"
                value={s.rotation}
                options={[
                  { value: 'none', label: 'None' },
                  { value: 'spin', label: 'Spin' },
                  { value: 'seesaw', label: 'See-saw' },
                  { value: 'wobble', label: 'Wobble' },
                  { value: 'tumble', label: 'Tumble' },
                ]}
                onChange={v => set('rotation', v)}
              />
            </div>
          </fieldset>
          <fieldset className="sv__group sv__grow">
            <legend>Rotation Speed</legend>
            {track('speed', 1, 20, 'Slow', 'Fast')}
          </fieldset>
        </div>
        <fieldset className="sv__group">
          <legend>Surface Style</legend>
          <div className="sv__row sv__row--surface">
            {radio('surface', 'solid', 'Solid Color', 't3-surf')}
            {check('customColor', 'Custom Color:')}
            <label className="sv__colorbtn">
              <XPButton
                className="sv__btn"
                onClick={() => {
                  set('customColor', true);
                  set('surface', 'solid');
                }}
              >
                Choose Color...
              </XPButton>
              <input
                className="sv__colorpick"
                type="color"
                value={s.color}
                onChange={e => {
                  set('color', e.target.value);
                  set('customColor', true);
                  set('surface', 'solid');
                }}
              />
            </label>
          </div>
          <div className="sv__row sv__row--surface">
            {radio('surface', 'texture', 'Texture', 't3-surf')}
            {check('customTexture', 'Custom Texture:')}
            {chooser('texturePath', 'Choose Texture...', () => {
              set('customTexture', true);
              set('surface', 'texture');
            })}
          </div>
          <div className="sv__row sv__row--surface">
            {radio('surface', 'reflection', 'Reflection', 't3-surf')}
            {check('customReflection', 'Custom Reflection:')}
            {chooser('reflectionPath', 'Choose Reflection...', () => {
              set('customReflection', true);
              set('surface', 'reflection');
            })}
          </div>
          {check('specular', 'Show Specular Highlights')}
        </fieldset>
      </>
    );
  }

  // --- 3D Flying Objects Settings ------------------------------------
  else if (name === '3D Flying Objects') {
    body = (
      <>
        <fieldset className="sv__group">
          <legend>Object</legend>
          <div className="sv__row">
            <span className="sv__label sv__label--tight">Style:</span>
            <XPSelect
              className="sv__select"
              value={s.style}
              options={[
                { value: 'logo', label: 'Windows Logo' },
                { value: 'explode', label: 'Explode' },
                { value: 'ribbon', label: 'Ribbon' },
                { value: 'tworibbons', label: 'Two Ribbons' },
                { value: 'splash', label: 'Splash' },
                { value: 'twist', label: 'Twist' },
                { value: 'flag', label: 'Textured Flag' },
              ]}
              onChange={v => set('style', v)}
            />
            {/* Texture...: the bitmap the Textured Flag waves */}
            {chooser('texturePath', 'Texture...', () => set('style', 'flag'))}
          </div>
        </fieldset>
        <fieldset className="sv__group">
          <legend>Color Usage</legend>
          <div className="sv__row">
            {check('colorCycling', 'Color-cycling')}
            {check('smoothShading', 'Smooth shading')}
          </div>
        </fieldset>
        <div className="sv__cols">
          <fieldset className="sv__group sv__grow">
            <legend>Resolution</legend>
            {track('resolution', 1, 20, 'Min', 'Max')}
          </fieldset>
          <fieldset className="sv__group sv__grow">
            <legend>Size</legend>
            {track('size', 1, 20, 'Min', 'Max')}
          </fieldset>
        </div>
      </>
    );
  }

  // --- 3D FlowerBox Settings -----------------------------------------
  else if (name === '3D FlowerBox') {
    body = (
      <>
        <div className="sv__cols">
          <fieldset className="sv__group sv__grow">
            <legend>Coloring</legend>
            {radio('coloring', 'checkerboard', 'Checkerboard', 'fb-col')}
            {radio('coloring', 'perside', 'Per Side', 'fb-col')}
            {radio('coloring', 'onecolor', 'One Color', 'fb-col')}
            {check('smooth', 'Smooth')}
            {check('slanted', 'Slanted')}
            {check('cycle', 'Cycle')}
          </fieldset>
          <div className="sv__stack sv__grow">
            {check('spin', 'Spin')}
            {check('bloom', 'Bloom')}
            {check('twoSided', 'Two-sided')}
            <fieldset className="sv__group">
              <legend>Shape</legend>
              <XPSelect
                className="sv__select"
                value={s.shape}
                options={[
                  { value: 'cube', label: 'Cube' },
                  { value: 'tetrahedron', label: 'Tetrahedron' },
                  { value: 'pyramids', label: 'Pyramids' },
                  { value: 'cylinder', label: 'Cylinder' },
                  { value: 'spring', label: 'Spring' },
                ]}
                onChange={v => set('shape', v)}
              />
            </fieldset>
          </div>
        </div>
        <fieldset className="sv__group">
          <legend>Complexity</legend>
          {track('complexity', 1, 20, 'Min', 'Max')}
        </fieldset>
        <fieldset className="sv__group">
          <legend>Size</legend>
          {track('size', 1, 20, 'Smaller', 'Larger')}
        </fieldset>
      </>
    );
  }

  // --- My Pictures Screen Saver Options -------------------------------
  else if (name === 'My Pictures Slideshow') {
    body = (
      <>
        <div className="sv__header">My Pictures screen saver</div>
        <div className="sv__rule" />
        <div className="sv__label--block">
          How often should pictures change?
        </div>
        {track('seconds', 2, 60, 'More', 'Less')}
        <div className="sv__label--block">How big should pictures be?</div>
        {track('sizePercent', 20, 100, 'Smaller', 'Larger', 5)}
        {check('stretchSmall', 'Stretch small pictures')}
        {check('showFileNames', 'Show file names')}
        {check('transition', 'Use transition effects between pictures')}
        {check(
          'keyboardScroll',
          'Allow scrolling through pictures with the keyboard',
        )}
      </>
    );
  }

  return (
    <XPDialogFrame
      title={TITLES[name] || `${name} Settings`}
      width={WIDTHS[name] || 340}
      onClose={onClose}
      zIndex={99990}
      onKeyDown={e => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <Body>
        <div className="sv__page">{body}</div>
        {browser}
        <div className="sv__buttons">
          <XPButton
            onClick={() => {
              onSave(s);
              onClose();
            }}
          >
            OK
          </XPButton>
          <XPButton onClick={onClose}>Cancel</XPButton>
        </div>
      </Body>
    </XPDialogFrame>
  );
}

const Body = styled.div`
  padding: 10px 12px 12px;
  font-size: 11px;
  font-family: Tahoma, 'Noto Sans', sans-serif;

  .sv__page {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 66vh;
    overflow-y: auto;
  }
  .sv__cols {
    display: flex;
    gap: 8px;
    align-items: flex-start;
  }
  .sv__stack {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
    min-width: 0;
  }
  .sv__grow {
    flex: 1;
    min-width: 0;
  }
  .sv__row--surface {
    flex-wrap: wrap;
  }
  .sv__row--surface > .sv__check:first-child {
    min-width: 88px;
  }
  .sv__chooser {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }
  .sv__btn {
    font-size: 11px;
    padding: 1px 8px;
    white-space: nowrap;
  }
  .sv__file {
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #444;
  }
  .sv__colorbtn {
    position: relative;
    display: inline-flex;
  }
  .sv__colorpick {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
  }
  .sv__row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 3px 0;
    flex-wrap: wrap;
  }
  .sv__label {
    flex-shrink: 0;
  }
  .sv__label--tight {
    flex-shrink: 0;
  }
  .sv__label--block {
    display: block;
    margin: 4px 0 2px;
  }
  .sv__field {
    flex: 1;
    min-width: 60px;
    font-size: 11px;
    font-family: Tahoma, 'Noto Sans', sans-serif;
    border: 1px solid var(--xp-select-border, #7f9db9);
    padding: 2px 3px;
    outline: none;
  }
  .sv__spin {
    width: 52px;
    font-size: 11px;
    font-family: Tahoma, 'Noto Sans', sans-serif;
    border: 1px solid var(--xp-select-border, #7f9db9);
    padding: 1px 2px;
    outline: none;
    flex-shrink: 0;
  }
  .sv__color {
    width: 40px;
    height: 18px;
    padding: 0;
    border: 1px solid var(--xp-select-border, #7f9db9);
    background: #fff;
    flex-shrink: 0;
  }
  .sv__select {
    flex: 1;
    min-width: 70px;
  }
  .sv__select--narrow {
    flex: 0 0 82px;
  }
  .sv__select--color {
    flex: 0 0 84px;
  }
  .sv__group {
    border: 1px solid #d0d0bf;
    border-radius: 3px;
    margin: 0;
    padding: 6px 10px 8px;
    legend {
      color: #0046d5;
      padding: 0 2px;
    }
  }
  .sv__group--inner {
    margin-top: 6px;
  }
  .sv__check {
    display: flex;
    align-items: center;
    gap: 5px;
    margin: 3px 0;
    cursor: default;
    white-space: nowrap;
    input {
      margin: 0;
      flex-shrink: 0;
    }
  }
  .sv__track {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .sv__ends {
    display: flex;
    justify-content: space-between;
    color: #333;
  }
  .sv__slider {
    width: 100%;
    height: 21px;
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
  }
  .sv__slider::-webkit-slider-runnable-track {
    height: 2px;
    border: none;
    border-radius: 1px;
    background: #9a9a91;
    box-shadow: 0 1px 0 #ffffff;
  }
  .sv__slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 11px;
    height: 21px;
    margin-top: -10px;
    border: none;
    border-radius: 0;
    background: url(${sliderThumb}) no-repeat center;
  }
  .sv__slider::-moz-range-track {
    height: 2px;
    border: none;
    border-radius: 1px;
    background: #9a9a91;
    box-shadow: 0 1px 0 #ffffff;
  }
  .sv__slider::-moz-range-thumb {
    width: 11px;
    height: 21px;
    border: none;
    border-radius: 0;
    background: url(${sliderThumb}) no-repeat center;
  }
  .sv__example {
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    overflow: hidden;
  }
  .sv__header {
    font-weight: bold;
  }
  .sv__rule {
    height: 1px;
    background: #d0d0bf;
    margin: 4px 0;
  }
  .sv__buttons {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    margin-top: 14px;
  }
`;
