import React from 'react';
import styled from 'styled-components';

import volumeThumb from 'assets/xp/VolumeThumb.png';

// The taskbar tray volume popup, matched to refkit volume-1.png (81x136):
// var(--xp-face, #ece9d8) raised panel, "Volume" label, a vertical Luna slider (2px groove,
// the plain green-capped thumb — cropped from the reference shot, stored
// pre-rotated for the rotated-input trick below), and the Mute checkbox.
const SliderWrapper = styled.div`
  position: absolute;
  bottom: 32px;
  right: 60px;
  width: 81px;
  height: 136px;
  box-sizing: border-box;
  background: var(--xp-face, #ece9d8);
  border: 1px solid;
  border-color: #ffffff #716f64 #716f64 #ffffff;
  box-shadow: 1px 1px 2px rgba(0, 0, 0, 0.35);
  z-index: 10000;
  font-family: 'Tahoma', sans-serif;
  font-size: 11px;
  color: #000;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 0 6px;
`;

const Title = styled.div`
  margin-bottom: 10px;
`;

/* A horizontal range rotated -90° renders as a vertical slider whose max is
   at the TOP (like the real popup) while keeping full track/thumb styling.
   The thumb bitmap is stored pre-rotated so it reads horizontally on
   screen, green caps left and right. */
const SliderBox = styled.div`
  width: 24px;
  height: 76px;
  position: relative;
  flex-shrink: 0;
`;

const Slider = styled.input`
  -webkit-appearance: none;
  appearance: none;
  width: 76px;
  height: 24px;
  margin: 0;
  background: transparent;
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%) rotate(-90deg);

  &::-webkit-slider-runnable-track {
    height: 2px;
    border-radius: 1px;
    background: #9a9a91;
    box-shadow: 0 1px 0 #ffffff;
  }
  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 11px;
    height: 22px;
    margin-top: -10px;
    border: none;
    border-radius: 0;
    background: url(${volumeThumb}) no-repeat center;
  }
  &::-moz-range-track {
    height: 2px;
    border-radius: 1px;
    background: #9a9a91;
    box-shadow: 0 1px 0 #ffffff;
  }
  &::-moz-range-thumb {
    width: 11px;
    height: 22px;
    border: none;
    border-radius: 0;
    background: url(${volumeThumb}) no-repeat center;
  }
`;

const MuteContainer = styled.label`
  display: flex;
  align-items: center;
  align-self: flex-start;
  margin: auto 0 0 8px;
  cursor: default;

  input {
    margin: 0 4px 0 0;
    appearance: none;
    width: 13px;
    height: 13px;
    background: #fff;
    border: 1px solid var(--xp-select-border, #7f9db9);
    position: relative;

    &:checked::after {
      content: '✓';
      font-size: 11px;
      font-weight: bold;
      color: #21a121;
      position: absolute;
      top: -2px;
      left: 1px;
    }
  }
`;

function VolumeSlider({
  volume,
  onVolumeChange,
  isMuted,
  onMuteChange,
  onCommit,
}) {
  const handleSliderChange = e => {
    onVolumeChange(Number(e.target.value));
    // Dragging the slider unmutes, like the real thing
    if (isMuted) {
      onMuteChange(false);
    }
  };

  return (
    <SliderWrapper>
      <Title>Volume</Title>
      <SliderBox>
        <Slider
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={handleSliderChange}
          // letting go of the thumb (or clicking where it sits) sounds the
          // new level, like the real tray
          onPointerUp={onCommit}
          onKeyUp={onCommit}
        />
      </SliderBox>
      <MuteContainer>
        <input
          type="checkbox"
          checked={isMuted}
          onChange={e => onMuteChange(e.target.checked)}
        />
        Mute
      </MuteContainer>
    </SliderWrapper>
  );
}

export default VolumeSlider;
