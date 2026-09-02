// The transport deck: play/pause, stop, rewind and fast forward, the seek
// slider, previous/next, mute and the player's own volume slider.
// Coordinates come from the skin's svTransport view.
import React, { useRef } from 'react';
import XPTooltip from 'components/XPTooltip';
import { M, SkinBtn, Slider, Transport as Deck } from './chrome';
import GroupHalf from './buttons';
import { SKIN } from './skinImages';

/** Drive `apply(0..1)` from a press on a slider track and the drag after it. */
const dragScalar = (ref, event, apply) => {
  const track = ref.current;
  if (!track) return;
  const rect = track.getBoundingClientRect();
  const move = e =>
    apply(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
  move(event);
  const up = () => {
    window.removeEventListener('mousemove', move);
    window.removeEventListener('mouseup', up);
  };
  window.addEventListener('mousemove', move);
  window.addEventListener('mouseup', up);
};

export default function Transport({ playback, isMuted, toggleMute }) {
  const seekRef = useRef(null);
  const volumeRef = useRef(null);
  const {
    isPlaying,
    currentTime,
    duration,
    localVolume,
    setLocalVolume,
    mediaRef,
    setCurrentTime,
  } = playback;
  const progress = duration ? Math.min(1, currentTime / duration) : 0;
  const playArt = isPlaying ? SKIN.pause : SKIN.play;

  return (
    <Deck>
      <XPTooltip text={isPlaying ? 'Pause' : 'Play'}>
        <SkinBtn
          style={{ left: 41, top: 10, width: 41, height: 43 }}
          $up={playArt.up}
          $hover={playArt.hover}
          $down={playArt.down}
          onClick={playback.togglePlay}
        />
      </XPTooltip>
      <XPTooltip text="Stop">
        <SkinBtn
          style={{ left: 82, top: 18, width: 24, height: 35 }}
          $up={SKIN.stop.up}
          $hover={SKIN.stop.hover}
          $down={SKIN.stop.down}
          onClick={playback.stop}
        />
      </XPTooltip>
      <XPTooltip text="Rewind">
        <SkinBtn
          style={{ left: 107, top: 10, width: 21, height: 17 }}
          $up={SKIN.rewind.up}
          $hover={SKIN.rewind.hover}
          $down={SKIN.rewind.down}
          onClick={() => playback.nudge(-5)}
        />
      </XPTooltip>
      <XPTooltip text="Fast Forward">
        <SkinBtn
          style={{ left: 263, top: 10, width: 21, height: 17 }}
          $up={SKIN.fastForward.up}
          $hover={SKIN.fastForward.hover}
          $down={SKIN.fastForward.down}
          onClick={() => playback.nudge(5)}
        />
      </XPTooltip>

      <Slider
        ref={seekRef}
        style={{ left: 128, top: 8, width: 135 }}
        onMouseDown={e =>
          dragScalar(seekRef, e, t => {
            const el = mediaRef.current;
            if (el && isFinite(el.duration)) {
              el.currentTime = t * el.duration;
              setCurrentTime(el.currentTime);
            }
          })
        }
      >
        <div
          className="wmp__sl-bkg"
          style={{
            width: 135,
            backgroundImage: `url(${SKIN.seek.bkg})`,
            backgroundSize: '135px 22px',
          }}
        />
        <div className="wmp__sl-fore" style={{ width: `${progress * 100}%` }}>
          <div
            className="wmp__sl-bkg"
            style={{
              width: 135,
              backgroundImage: `url(${SKIN.seek.fore})`,
              backgroundSize: '135px 22px',
            }}
          />
        </div>
        <div
          className="wmp__sl-thumb"
          style={{
            left: `${progress * 100}%`,
            backgroundImage: `url(${SKIN.seek.thumb})`,
          }}
        />
      </Slider>

      {/* prev / next are one bitmap split by btngroup_colormap.bmp */}
      <XPTooltip text="Previous">
        <GroupHalf
          style={{ left: 106, top: 33, width: M.prevNext.prev }}
          $offset={0}
          onClick={() => playback.step(-1)}
        />
      </XPTooltip>
      <XPTooltip text="Next">
        <GroupHalf
          style={{
            left: 106 + M.prevNext.prev,
            top: 33,
            width: M.prevNext.total - M.prevNext.prev,
          }}
          $offset={-M.prevNext.prev}
          onClick={() => playback.step(1)}
        />
      </XPTooltip>

      {/* The skin marks this one sticky, bound to player.settings.mute,
          with sound_btn_down as its latched image, so muted is the pressed
          state rather than a separate icon */}
      <XPTooltip text={isMuted ? 'Sound' : 'Mute'}>
        <SkinBtn
          style={{ left: 168, top: 33, width: 30, height: 20 }}
          $up={isMuted ? SKIN.sound.down : SKIN.sound.up}
          $hover={isMuted ? SKIN.sound.down : SKIN.sound.hover}
          $down={isMuted ? SKIN.sound.up : SKIN.sound.down}
          onClick={toggleMute}
        />
      </XPTooltip>

      <Slider
        ref={volumeRef}
        style={{ left: 198, top: 31, width: 54 }}
        onMouseDown={e => dragScalar(volumeRef, e, setLocalVolume)}
      >
        <div
          className="wmp__sl-bkg"
          style={{ width: 54, backgroundImage: `url(${SKIN.volume.bkg})` }}
        />
        <div
          className="wmp__sl-fore"
          style={{ width: `${localVolume * 100}%` }}
        >
          <div
            className="wmp__sl-bkg"
            style={{ width: 54, backgroundImage: `url(${SKIN.volume.fore})` }}
          />
        </div>
        <div
          className="wmp__sl-thumb"
          style={{
            left: `${localVolume * 100}%`,
            backgroundImage: `url(${SKIN.volume.thumb})`,
          }}
        />
      </Slider>
    </Deck>
  );
}
