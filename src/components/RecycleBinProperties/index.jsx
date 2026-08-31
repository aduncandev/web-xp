import React, { useState } from 'react';
import styled from 'styled-components';

import XPDialogFrame from 'components/XPDialogFrame';
import XPButton from 'components/XPButton';
import { useVFS } from '../../context/VFSContext';

import sliderThumb from 'assets/xp/SliderThumb.png';

export const RECYCLE_DEFAULTS = {
  perDrive: false,
  nukeOnDelete: false,
  maxPercent: 10,
  confirmDelete: true,
};

/** The bin's settings for the active user, with XP's defaults filled in. */
export function readRecycleSettings(vfs) {
  try {
    return {
      ...RECYCLE_DEFAULTS,
      ...(vfs.getUserConfig('recycleBin', null) || {}),
    };
  } catch {
    return { ...RECYCLE_DEFAULTS };
  }
}

/**
 * Recycle Bin Properties — the shell object's own sheet, not the generic
 * file Properties. Global tab plus a tab per fixed drive, exactly as XP
 * lays it out.
 */
export default function RecycleBinProperties({ onClose }) {
  const vfs = useVFS();
  const stored = readRecycleSettings(vfs);

  const [tab, setTab] = useState('global');
  const [perDrive, setPerDrive] = useState(stored.perDrive);
  const [nukeOnDelete, setNukeOnDelete] = useState(stored.nukeOnDelete);
  const [maxPercent, setMaxPercent] = useState(stored.maxPercent);
  const [confirmDelete, setConfirmDelete] = useState(stored.confirmDelete);
  const [dirty, setDirty] = useState(false);

  const touch = () => setDirty(true);

  const apply = () => {
    try {
      vfs.setUserConfig('recycleBin', {
        perDrive,
        nukeOnDelete,
        maxPercent,
        confirmDelete,
      });
    } catch {
      // hive unavailable — session only
    }
    setDirty(false);
  };

  // The per-drive tab edits the same values; it's simply disabled while
  // one setting covers every drive.
  const driveTab = tab !== 'global';
  const controlsDisabled = driveTab && !perDrive;

  const settingsPanel = (
    <fieldset className="rb__group">
      <legend>
        {tab === 'global' ? (
          <label className="rb__legend-radio">
            <input
              type="radio"
              name="rb-scope"
              checked={!perDrive}
              onChange={() => {
                setPerDrive(false);
                touch();
              }}
            />
            <span>Use one setting for all drives:</span>
          </label>
        ) : (
          <span>Local Disk (C:)</span>
        )}
      </legend>
      <label className="rb__row">
        <input
          type="checkbox"
          checked={nukeOnDelete}
          disabled={controlsDisabled}
          onChange={() => {
            setNukeOnDelete(v => !v);
            touch();
          }}
        />
        <span>
          Do not move files to the Recycle Bin.
          <br />
          Remove files immediately when deleted
        </span>
      </label>
      <div className="rb__sliderwrap">
        <input
          className="rb__slider"
          type="range"
          min={0}
          max={100}
          value={maxPercent}
          disabled={controlsDisabled || nukeOnDelete}
          onChange={e => {
            setMaxPercent(Number(e.target.value));
            touch();
          }}
        />
        <div className="rb__ticks">
          {Array.from({ length: 11 }).map((_, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <span key={i} />
          ))}
        </div>
      </div>
      <div className="rb__percent">{maxPercent}%</div>
      <div className="rb__caption">
        Maximum size of Recycle Bin (percent of each drive)
      </div>
    </fieldset>
  );

  return (
    <XPDialogFrame
      title="Recycle Bin Properties"
      width={340}
      onClose={onClose}
      zIndex={99985}
      onKeyDown={e => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <Body>
        <div className="rb__tabs">
          {[
            { key: 'global', label: 'Global' },
            { key: 'c', label: 'Local Disk (C:)' },
          ].map(t => (
            <div
              key={t.key}
              className={`rb__tab${tab === t.key ? ' rb__tab--active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </div>
          ))}
        </div>
        <div className="rb__page">
          {tab === 'global' && (
            <label className="rb__row rb__row--scope">
              <input
                type="radio"
                name="rb-scope"
                checked={perDrive}
                onChange={() => {
                  setPerDrive(true);
                  touch();
                }}
              />
              <span>Configure drives independently</span>
            </label>
          )}
          {settingsPanel}
          {tab === 'global' && (
            <label className="rb__row rb__row--confirm">
              <input
                type="checkbox"
                checked={confirmDelete}
                onChange={() => {
                  setConfirmDelete(v => !v);
                  touch();
                }}
              />
              <span>Display delete confirmation dialog</span>
            </label>
          )}
        </div>
        <div className="rb__buttons">
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
    </XPDialogFrame>
  );
}

const Body = styled.div`
  padding: 8px 8px 10px;
  font-size: 11px;
  font-family: Tahoma, 'Noto Sans', sans-serif;

  .rb__tabs {
    display: flex;
    margin-left: 2px;
  }
  .rb__tab {
    padding: 3px 10px 4px;
    border: 1px solid #919b9c;
    border-bottom: none;
    border-radius: 3px 3px 0 0;
    background: linear-gradient(to bottom, #fff, #f0efe4);
    margin-right: 2px;
    cursor: default;
    position: relative;
    top: 1px;
  }
  .rb__tab--active {
    background: #fcfcfe;
    padding-top: 4px;
    top: 0;
    border-top: 2px solid #e68b2c;
    z-index: 1;
  }
  .rb__page {
    border: 1px solid #919b9c;
    background: #fcfcfe;
    padding: 10px 12px;
    min-height: 300px;
  }
  .rb__row {
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
  .rb__row--scope {
    margin-bottom: 8px;
  }
  .rb__row--confirm {
    margin-top: 12px;
  }
  .rb__group {
    border: 1px solid #d0d0bf;
    border-radius: 3px;
    margin: 0;
    padding: 8px 12px 10px;
    legend {
      padding: 0 2px;
    }
  }
  /* XP hangs the "use one setting" radio in the group's own legend */
  .rb__legend-radio {
    display: flex;
    align-items: center;
    gap: 5px;
    cursor: default;
    input {
      margin: 0;
    }
  }
  .rb__sliderwrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-top: 14px;
  }
  .rb__slider {
    width: 220px;
    height: 21px;
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
  }
  .rb__slider::-webkit-slider-runnable-track {
    height: 2px;
    border: none;
    border-radius: 1px;
    background: #9a9a91;
    box-shadow: 0 1px 0 #ffffff;
  }
  .rb__slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 11px;
    height: 21px;
    margin-top: -10px;
    border: none;
    border-radius: 0;
    background: url(${sliderThumb}) no-repeat center;
  }
  .rb__slider::-moz-range-track {
    height: 2px;
    border: none;
    border-radius: 1px;
    background: #9a9a91;
    box-shadow: 0 1px 0 #ffffff;
  }
  .rb__slider::-moz-range-thumb {
    width: 11px;
    height: 21px;
    border: none;
    border-radius: 0;
    background: url(${sliderThumb}) no-repeat center;
  }
  .rb__slider:disabled {
    opacity: 0.5;
  }
  .rb__ticks {
    display: flex;
    justify-content: space-between;
    width: 210px;
    margin-top: 1px;
  }
  .rb__ticks span {
    width: 1px;
    height: 3px;
    background: #808080;
  }
  .rb__percent {
    text-align: center;
    margin-top: 8px;
  }
  .rb__caption {
    text-align: center;
    margin-top: 4px;
  }
  .rb__buttons {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    margin-top: 10px;
  }
`;
