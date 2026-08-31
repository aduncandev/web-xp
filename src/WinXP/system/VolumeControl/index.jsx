import React, { useEffect } from 'react';
import styled from 'styled-components';

import { WindowDropDowns } from 'components';
import { useVolume } from '../../../context/VolumeContext';
import volumeThumb from 'assets/xp/VolumeThumb.png';
import speakerSmall from 'assets/windowsIcons/690(16x16).png';

// sndvol32 — the Volume Control mixer, per refkit volume-2.png: five
// columns (Volume Control / Wave / SW Synth / Line In / CD Audio), each
// with a Balance slider, a vertical Volume slider (the green-capped Luna
// thumb) and a Mute checkbox; Options/Help menus; device status bar.
// Volume Control and Wave really gate the audio; the rest persist only.

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

function Channel({
  title,
  volume,
  onVolume,
  balance,
  onBalance,
  muted,
  onMuted,
  muteLabel = 'Mute',
}) {
  return (
    <div className="vc__channel">
      <div className="vc__title">{title}</div>
      <div className="vc__balance">
        <div className="vc__balance-label">Balance:</div>
        <div className="vc__balance-row">
          <img src={speakerSmall} alt="" width={16} height={16} />
          <input
            className="vc__hslider"
            type="range"
            min={0}
            max={100}
            value={balance}
            onChange={e => onBalance(Number(e.target.value))}
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
          value={volume}
          onChange={e => onVolume(Number(e.target.value))}
        />
      </div>
      <label className="vc__mute">
        <input
          type="checkbox"
          checked={muted}
          onChange={e => onMuted(e.target.checked)}
        />
        <span>{muteLabel}</span>
      </label>
    </div>
  );
}

export default function VolumeControl({ onClose, onSetHeader }) {
  const {
    volume,
    setVolume,
    isMuted,
    setIsMuted,
    mixer,
    setMixerChannel,
    setMasterBalance,
  } = useVolume();

  useEffect(() => {
    if (onSetHeader) onSetHeader({ title: 'Volume Control' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onMenu = item => {
    if (item === 'Exit') onClose();
    // About handled by the shell's About Windows elsewhere; keep quiet here
  };

  const channel = key => ({
    volume: mixer[key].volume,
    onVolume: v => setMixerChannel(key, { volume: v }),
    balance: mixer[key].balance,
    onBalance: b => setMixerChannel(key, { balance: b }),
    muted: mixer[key].muted,
    onMuted: m => setMixerChannel(key, { muted: m }),
  });

  return (
    <Root>
      <div className="vc__menus">
        <WindowDropDowns items={MENUS} onClickItem={onMenu} />
      </div>
      <div className="vc__body">
        <Channel
          title="Volume Control"
          volume={volume}
          onVolume={setVolume}
          balance={mixer.masterBalance}
          onBalance={setMasterBalance}
          muted={isMuted}
          onMuted={setIsMuted}
          muteLabel="Mute all"
        />
        <div className="vc__sep" />
        <Channel title="Wave" {...channel('wave')} />
        <div className="vc__sep" />
        <Channel title="SW Synth" {...channel('synth')} />
        <div className="vc__sep" />
        <Channel title="Line In" {...channel('linein')} />
        <div className="vc__sep" />
        <Channel title="CD Audio" {...channel('cd')} />
      </div>
      <div className="vc__status">Creative Sound Blaster PCI</div>
    </Root>
  );
}

const Root = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: #ece9d8;
  font-family: Tahoma, 'Noto Sans', sans-serif;
  font-size: 11px;
  user-select: none;

  .vc__menus {
    height: 20px;
    background: #ece9d8;
    border-bottom: 1px solid #d8d2bd;
    padding-left: 2px;
    flex-shrink: 0;
  }
  .vc__body {
    flex: 1;
    display: flex;
    padding: 6px 4px 4px 8px;
    min-height: 0;
  }
  .vc__channel {
    width: 100px;
    display: flex;
    flex-direction: column;
    padding: 2px 6px 4px;
  }
  .vc__sep {
    width: 2px;
    align-self: stretch;
    margin: 2px 2px;
    border-left: 1px solid #aca899;
    border-right: 1px solid #ffffff;
  }
  .vc__title {
    margin-bottom: 8px;
  }
  .vc__balance-label,
  .vc__volume-label {
    margin-bottom: 3px;
  }
  .vc__balance {
    margin-bottom: 8px;
  }
  .vc__balance-row {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  /* Small horizontal balance slider */
  .vc__hslider {
    width: 52px;
    height: 18px;
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
  }
  .vc__hslider::-webkit-slider-runnable-track {
    height: 2px;
    border-radius: 1px;
    background: #9a9a91;
    box-shadow: 0 1px 0 #ffffff;
  }
  .vc__hslider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 11px;
    height: 18px;
    margin-top: -8px;
    border: none;
    background: url(${volumeThumb}) no-repeat center / 11px 22px;
  }
  .vc__hslider::-moz-range-track {
    height: 2px;
    background: #9a9a91;
    box-shadow: 0 1px 0 #ffffff;
  }
  .vc__hslider::-moz-range-thumb {
    width: 11px;
    height: 18px;
    border: none;
    border-radius: 0;
    background: url(${volumeThumb}) no-repeat center / 11px 22px;
  }

  /* Vertical volume slider: rotated horizontal range, max at the top */
  .vc__vslider-box {
    width: 30px;
    height: 96px;
    position: relative;
    align-self: center;
    flex-shrink: 0;
  }
  .vc__vslider {
    width: 96px;
    height: 30px;
    margin: 0;
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%) rotate(-90deg);
  }
  .vc__vslider::-webkit-slider-runnable-track {
    height: 2px;
    border-radius: 1px;
    background: #9a9a91;
    box-shadow: 0 1px 0 #ffffff;
  }
  .vc__vslider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 11px;
    height: 22px;
    margin-top: -10px;
    border: none;
    background: url(${volumeThumb}) no-repeat center;
  }
  .vc__vslider::-moz-range-track {
    height: 2px;
    background: #9a9a91;
    box-shadow: 0 1px 0 #ffffff;
  }
  .vc__vslider::-moz-range-thumb {
    width: 11px;
    height: 22px;
    border: none;
    border-radius: 0;
    background: url(${volumeThumb}) no-repeat center;
  }

  .vc__mute {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 8px;

    input {
      margin: 0;
    }
  }
  .vc__status {
    flex-shrink: 0;
    border-top: 1px solid #ffffff;
    box-shadow: 0 -1px 0 #aca899;
    padding: 2px 6px;
    background: #ece9d8;
  }
`;

