/*
 * sndvol32, the Volume Control mixer, drawn to refkit volume-2.png: columns
 * with a Balance slider, a vertical Volume slider and a Mute checkbox under
 * Options and Help menus, a device name in the status bar. The columns are
 * the modern mixer's: Volume Control (the master), System Sounds, then one
 * for every open program that makes sound. A program's level is kept for
 * the next time it opens. The window grows and shrinks with its columns,
 * as the real one does with the controls it shows.
 */
import React, { useEffect } from 'react';

import { WindowDropDowns } from 'components';
import { SYSTEM_CHANNEL, useMixer } from '../../../context/VolumeContext';
import speakerSmall from 'assets/windowsIcons/690(16x16).png';
import { BASE_WIDTH, COLUMN_WIDTH, Root, WINDOW_HEIGHT } from './styles';

const MENUS = {
  Options: [
    { type: 'item', text: 'Properties', disable: true },
    { type: 'item', text: 'Advanced Controls', disable: true },
    { type: 'separator' },
    { type: 'item', text: 'Exit' },
  ],
  Help: [
    { type: 'item', text: 'Help Topics', disable: true },
    { type: 'item', text: 'About Volume Control' },
  ],
};

/** One column. `level` is { volume, muted, balance }; `onLevel` takes a patch. */
function Channel({ title, level, onLevel, muteLabel = 'Mute', onCommit }) {
  return (
    <div className="vc__channel">
      <div className="vc__title" title={title}>
        {title}
      </div>
      <div className="vc__balance">
        <div className="vc__balance-label">Balance:</div>
        <div className="vc__balance-row">
          <img src={speakerSmall} alt="" width={16} height={16} />
          <input
            className="vc__hslider"
            type="range"
            min={0}
            max={100}
            value={level.balance}
            onChange={e => onLevel({ balance: Number(e.target.value) })}
          />
          <img src={speakerSmall} alt="" width={16} height={16} />
        </div>
      </div>
      <div className="vc__volume-label">Volume:</div>
      <div className="vc__vslider-box">
        <input
          className="vc__vslider"
          type="range"
          min={0}
          max={100}
          value={level.volume}
          onChange={e => onLevel({ volume: Number(e.target.value) })}
          onPointerUp={onCommit}
          onKeyUp={onCommit}
        />
      </div>
      <label className="vc__mute">
        <input
          type="checkbox"
          checked={level.muted}
          onChange={e => onLevel({ muted: e.target.checked })}
        />
        <span>{muteLabel}</span>
      </label>
    </div>
  );
}

export default function VolumeControl({ onClose, onSetHeader, onSetSize }) {
  const {
    volume,
    setVolume,
    isMuted,
    setIsMuted,
    masterBalance,
    setMasterBalance,
    levelOf,
    setAppLevel,
    openApps,
    previewVolume,
  } = useMixer();

  useEffect(() => {
    if (onSetHeader) onSetHeader({ title: 'Volume Control' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns = [
    { key: SYSTEM_CHANNEL, name: 'System Sounds' },
    ...openApps,
  ];

  // the window fits its columns, the master included
  useEffect(() => {
    if (onSetSize)
      onSetSize({
        width: BASE_WIDTH + (columns.length + 1) * COLUMN_WIDTH,
        height: WINDOW_HEIGHT,
      });
  }, [columns.length, onSetSize]);

  const onMenu = item => {
    if (item === 'Exit') onClose();
  };

  const setMaster = patch => {
    if (patch.volume !== undefined) setVolume(patch.volume);
    if (patch.muted !== undefined) setIsMuted(patch.muted);
    if (patch.balance !== undefined) setMasterBalance(patch.balance);
  };

  return (
    <Root>
      <div className="vc__menus">
        <WindowDropDowns items={MENUS} onClickItem={onMenu} />
      </div>
      <div className="vc__body">
        <Channel
          title="Volume Control"
          level={{ volume, muted: isMuted, balance: masterBalance }}
          onLevel={setMaster}
          muteLabel="Mute all"
          onCommit={previewVolume}
        />
        {columns.map(col => (
          <React.Fragment key={col.key}>
            <div className="vc__sep" />
            <Channel
              title={col.name}
              level={levelOf(col.key)}
              onLevel={patch => setAppLevel(col.key, patch)}
            />
          </React.Fragment>
        ))}
      </div>
      <div className="vc__status">Creative Sound Blaster PCI</div>
    </Root>
  );
}
