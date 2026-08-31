// Image menu dialogs (Attributes, Flip/Rotate, Stretch/Skew)

import React, { useState } from 'react';

import XPDialogFrame from '../../../components/XPDialogFrame';
import XPButton from '../../../components/XPButton';

import { DEFAULT_SIZE } from './constants';
import { DialogBody } from './styles';

export function AttributesDialog({ width, height, onOK, onCancel }) {
  const [w, setW] = useState(String(width));
  const [h, setH] = useState(String(height));
  const submit = () => {
    const nw = parseInt(w, 10);
    const nh = parseInt(h, 10);
    if (!nw || !nh || nw < 1 || nh < 1) {
      onCancel();
      return;
    }
    onOK(nw, nh);
  };
  return (
    <XPDialogFrame
      title="Attributes"
      width={300}
      onClose={onCancel}
      onKeyDown={e => {
        if (e.key === 'Escape') onCancel();
        if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') submit();
      }}
    >
      <DialogBody>
        <div className="dlg-main">
          <div className="dlg-fields">
            <div className="dlg-static">File last saved: Not Available</div>
            <div className="dlg-static">Size on disk: Not Available</div>
            <div className="dlg-static">Resolution: 96 x 96 dots per inch</div>
            <div className="dlg-row">
              <label>
                Width:{' '}
                <input
                  autoFocus
                  value={w}
                  onChange={e => setW(e.target.value.replace(/\D/g, ''))}
                />
              </label>
              <label>
                Height:{' '}
                <input
                  value={h}
                  onChange={e => setH(e.target.value.replace(/\D/g, ''))}
                />
              </label>
            </div>
            <fieldset>
              <legend>Units</legend>
              <label className="dlg-disabled">
                <input type="radio" name="attr-units" disabled /> Inches
              </label>
              <label className="dlg-disabled">
                <input type="radio" name="attr-units" disabled /> Cm
              </label>
              <label>
                <input type="radio" name="attr-units" defaultChecked readOnly />{' '}
                Pixels
              </label>
            </fieldset>
            <fieldset>
              <legend>Colors</legend>
              <label className="dlg-disabled">
                <input type="radio" name="attr-colors" disabled /> Black and
                white
              </label>
              <label>
                <input
                  type="radio"
                  name="attr-colors"
                  defaultChecked
                  readOnly
                />{' '}
                Colors
              </label>
            </fieldset>
          </div>
          <div className="dlg-buttons">
            <XPButton onClick={submit}>OK</XPButton>
            <XPButton onClick={onCancel}>Cancel</XPButton>
            <XPButton
              onClick={() => {
                setW(String(DEFAULT_SIZE.w));
                setH(String(DEFAULT_SIZE.h));
              }}
            >
              Default
            </XPButton>
          </div>
        </div>
      </DialogBody>
    </XPDialogFrame>
  );
}

export function FlipRotateDialog({ onOK, onCancel }) {
  const [mode, setMode] = useState('fliph');
  const [angle, setAngle] = useState('90');
  const submit = () => {
    if (mode === 'rotate') onOK(`rot${angle}`);
    else onOK(mode);
  };
  return (
    <XPDialogFrame
      title="Flip and Rotate"
      width={260}
      onClose={onCancel}
      onKeyDown={e => {
        if (e.key === 'Escape') onCancel();
        if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') submit();
      }}
    >
      <DialogBody>
        <div className="dlg-main">
          <div className="dlg-fields">
            <fieldset>
              <legend>Flip or rotate</legend>
              <label>
                <input
                  type="radio"
                  name="fr-mode"
                  checked={mode === 'fliph'}
                  onChange={() => setMode('fliph')}
                />{' '}
                Flip horizontal
              </label>
              <label>
                <input
                  type="radio"
                  name="fr-mode"
                  checked={mode === 'flipv'}
                  onChange={() => setMode('flipv')}
                />{' '}
                Flip vertical
              </label>
              <label>
                <input
                  type="radio"
                  name="fr-mode"
                  checked={mode === 'rotate'}
                  onChange={() => setMode('rotate')}
                />{' '}
                Rotate by angle
              </label>
              <div className="dlg-indent">
                {['90', '180', '270'].map(a => (
                  <label
                    key={a}
                    className={mode !== 'rotate' ? 'dlg-disabled' : ''}
                  >
                    <input
                      type="radio"
                      name="fr-angle"
                      disabled={mode !== 'rotate'}
                      checked={angle === a}
                      onChange={() => setAngle(a)}
                    />{' '}
                    {a}&deg;
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
          <div className="dlg-buttons">
            <XPButton autoFocus onClick={submit}>
              OK
            </XPButton>
            <XPButton onClick={onCancel}>Cancel</XPButton>
          </div>
        </div>
      </DialogBody>
    </XPDialogFrame>
  );
}

export function StretchSkewDialog({ onOK, onCancel }) {
  const [h, setH] = useState('100');
  const [v, setV] = useState('100');
  const submit = () => {
    const hp = parseInt(h, 10);
    const vp = parseInt(v, 10);
    if (!hp || !vp || hp < 1 || vp < 1 || hp > 500 || vp > 500) {
      onCancel();
      return;
    }
    onOK(hp, vp);
  };
  return (
    <XPDialogFrame
      title="Stretch and Skew"
      width={280}
      onClose={onCancel}
      onKeyDown={e => {
        if (e.key === 'Escape') onCancel();
        if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') submit();
      }}
    >
      <DialogBody>
        <div className="dlg-main">
          <div className="dlg-fields">
            <fieldset>
              <legend>Stretch</legend>
              <label>
                Horizontal:{' '}
                <input
                  autoFocus
                  value={h}
                  onChange={e => setH(e.target.value.replace(/\D/g, ''))}
                />{' '}
                %
              </label>
              <label>
                Vertical:{' '}
                <input
                  value={v}
                  onChange={e => setV(e.target.value.replace(/\D/g, ''))}
                />{' '}
                %
              </label>
            </fieldset>
            <fieldset>
              <legend>Skew</legend>
              <label className="dlg-disabled">
                Horizontal: <input disabled defaultValue="0" /> Degrees
              </label>
              <label className="dlg-disabled">
                Vertical: <input disabled defaultValue="0" /> Degrees
              </label>
            </fieldset>
          </div>
          <div className="dlg-buttons">
            <XPButton onClick={submit}>OK</XPButton>
            <XPButton onClick={onCancel}>Cancel</XPButton>
          </div>
        </div>
      </DialogBody>
    </XPDialogFrame>
  );
}

