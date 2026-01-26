import React from 'react';
import styled from 'styled-components';

// Styled container to look like the XP window in your image
const SliderWrapper = styled.div`
  position: absolute;
  bottom: 32px; /* Positioned just above the 30px footer */
  right: 60px; /* Adjust as needed to align near the sound icon */
  background: #f0f0f0;
  border: 1px solid #808080;
  border-top-color: #fff;
  border-left-color: #fff;
  box-shadow: 1px 1px 1px #000;
  padding: 10px;
  padding-bottom: 5px;
  z-index: 10000;
  font-family: 'Tahoma', sans-serif;
  font-size: 11px;
  color: #000;
`;

const Title = styled.div`
  margin-bottom: 8px;
  padding-left: 2px;
`;

// Styles for the vertical slider
const Slider = styled.input`
  -webkit-appearance: slider-vertical; /* Required for vertical slider */
  width: 20px;
  height: 100px;
  margin: 0 auto;
  display: block;
`;

// Styles for the "Mute" checkbox container
const MuteContainer = styled.label`
  display: flex;
  align-items: center;
  margin-top: 8px;
  cursor: pointer;

  input {
    margin-right: 5px;
    /* Basic XP-style checkbox */
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    width: 13px;
    height: 13px;
    background: #fff;
    border: 1px solid #808080;
    box-shadow: inset 1px 1px #000;
    position: relative;
    cursor: pointer;

    &:checked::after {
      content: '✓'; /* Checkmark */
      font-size: 12px;
      font-weight: bold;
      color: #000;
      position: absolute;
      top: -2px;
      left: 1px;
    }
  }
`;

function VolumeSlider({ volume, onVolumeChange, isMuted, onMuteChange }) {
  const handleSliderChange = e => {
    onVolumeChange(Number(e.target.value));
    // If the user drags the slider, automatically unmute
    if (isMuted) {
      onMuteChange(false);
    }
  };

  const handleCheckboxChange = e => {
    onMuteChange(e.target.checked);
  };

  return (
    <SliderWrapper>
      <Title>Volume</Title>
      <Slider
        type="range"
        min="0"
        max="100"
        value={isMuted ? 0 : volume} // Show 0 if muted
        onChange={handleSliderChange}
      />
      <MuteContainer>
        <input
          type="checkbox"
          checked={isMuted}
          onChange={handleCheckboxChange}
        />
        Mute
      </MuteContainer>
    </SliderWrapper>
  );
}

export default VolumeSlider;
