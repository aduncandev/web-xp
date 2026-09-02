// The skin's window: the frame bitmaps, the toggle buttons along the top,
// the playlist combo, the feature taskbar down the left, the marquee, the
// transport deck and the skin-mode button. The content goes in the middle.
import React, { useState } from 'react';
import XPTooltip from 'components/XPTooltip';
import {
  AppShift,
  Body,
  BottomLeft,
  BottomLeftBorder,
  BottomRight,
  BrandLogo,
  Content,
  FillBottom,
  FillLeft,
  FillLeftHide,
  FillRight,
  FillTop,
  GotoSkin,
  M,
  Marquee,
  ScrollDown,
  ScrollUp,
  SkinBtn,
  TaskButtons,
  TaskCaption,
  TaskGroup,
  TaskHandle,
  TaskHit,
  TaskRow,
  TopLeft,
  TopLeftHide,
  TopRight,
  WindowsBrand,
} from './chrome';
import { DropdownList, PlaylistDropdown } from './panes';
import { FEATURES } from './constants';
import { formatElapsed } from './library';
import { SKIN } from './skinImages';
import Transport from './Transport';

const toggleArt = (art, on) => ({
  $up: on ? art.on : art.up,
  $hover: on ? art.onHover : art.hover,
});

export default function PlayerFrame({
  taskbar,
  setTaskbar,
  menuBar,
  setMenuBar,
  shuffle,
  setShuffle,
  repeatMode,
  setRepeatMode,
  showEqualizer,
  setShowEqualizer,
  showPlaylist,
  setShowPlaylist,
  playlistName,
  playlistChoices,
  onPickPlaylist,
  task,
  setTask,
  marquee,
  stateIcon,
  currentTime,
  playback,
  isMuted,
  toggleMute,
  children,
}) {
  const [comboOpen, setComboOpen] = useState(false);
  const repeatArt =
    repeatMode === 'one'
      ? { $up: SKIN.loop.oneOn, $hover: SKIN.loop.oneOnHover }
      : repeatMode === 'all'
      ? { $up: SKIN.loop.allOn, $hover: SKIN.loop.allOnHover }
      : { $up: SKIN.loop.up, $hover: SKIN.loop.hover };

  return (
    <Body>
      <AppShift $taskbar={taskbar}>
        {/* ---- window frame ---- */}
        <TopLeft />
        {taskbar && <ScrollUp />}
        {!taskbar && <TopLeftHide />}
        <FillTop>
          <XPTooltip text="Show menu bar">
            <SkinBtn
              style={{ left: 2, top: 15, width: 21, height: 22 }}
              {...toggleArt(SKIN.menuBar, menuBar)}
              onClick={() => setMenuBar(v => !v)}
            />
          </XPTooltip>
        </FillTop>
        <TopRight>
          <XPTooltip text={shuffle ? 'Turn shuffle off' : 'Turn shuffle on'}>
            <SkinBtn
              style={{ left: 0, top: 15, width: 21, height: 22 }}
              {...toggleArt(SKIN.shuffle, shuffle)}
              onClick={() => setShuffle(v => !v)}
            />
          </XPTooltip>
          {/* Not in the stock skin (WMP8 kept repeat in the Play menu) but
              its strings are (RT_STRING #1816/#1817), and the artwork is the
              real button body with a repeat glyph on it */}
          <XPTooltip
            text={
              repeatMode === 'off'
                ? 'Turn repeat on'
                : repeatMode === 'all'
                ? 'Repeat playlist'
                : 'Repeat track'
            }
          >
            <SkinBtn
              style={{ left: 63, top: 15, width: 21, height: 22 }}
              {...repeatArt}
              onClick={() =>
                setRepeatMode(m =>
                  m === 'off' ? 'all' : m === 'all' ? 'one' : 'off',
                )
              }
            />
          </XPTooltip>
          <XPTooltip text="Show equalizer and settings in Now Playing">
            <SkinBtn
              style={{ left: 21, top: 15, width: 21, height: 22 }}
              {...toggleArt(SKIN.equalizer, showEqualizer)}
              onClick={() => setShowEqualizer(v => !v)}
            />
          </XPTooltip>
          <XPTooltip text="Show playlist in Now Playing">
            <SkinBtn
              style={{ left: 42, top: 15, width: 21, height: 22 }}
              {...toggleArt(SKIN.playlist, showPlaylist)}
              onClick={() => setShowPlaylist(v => !v)}
            />
          </XPTooltip>
        </TopRight>

        <PlaylistDropdown onClick={() => setComboOpen(v => !v)}>
          <span className="wmp__combo-label">{playlistName}</span>
          <span className="wmp__combo-arrow">▼</span>
          {comboOpen && (
            <DropdownList>
              {playlistChoices.map(option => (
                <div
                  key={option}
                  data-selected={option === playlistName}
                  onClick={e => {
                    e.stopPropagation();
                    onPickPlaylist(option);
                    setComboOpen(false);
                  }}
                >
                  {option}
                </div>
              ))}
            </DropdownList>
          )}
        </PlaylistDropdown>

        {taskbar ? <FillLeft /> : <FillLeftHide />}
        <FillRight />
        <BottomLeft />
        <BottomLeftBorder />
        {taskbar && <ScrollDown />}
        {taskbar ? <BrandLogo /> : <WindowsBrand />}
        <FillBottom />
        <BottomRight />

        <Content>{children}</Content>

        {/* ---- feature taskbar ---- */}
        {taskbar && (
          <TaskButtons>
            <TaskGroup />
            {FEATURES.map(([id, caption, tip], i) => {
              const selected = task === id;
              return (
                <React.Fragment key={id}>
                  {selected && (
                    <TaskRow
                      $state="down"
                      style={{
                        top: M.taskRows[i],
                        height: M.taskRowH[i],
                        backgroundPosition: `0 ${-M.taskRows[i]}px`,
                      }}
                    />
                  )}
                  <TaskCaption style={{ top: M.captionTops[i] }}>
                    {caption}
                  </TaskCaption>
                  <XPTooltip text={tip}>
                    <TaskHit
                      style={{ top: M.taskRows[i], height: M.taskRowH[i] }}
                      onClick={() => setTask(id)}
                    />
                  </XPTooltip>
                </React.Fragment>
              );
            })}
          </TaskButtons>
        )}
        <TaskHandle
          $open={!taskbar}
          onClick={() => setTaskbar(v => !v)}
          title={taskbar ? 'Hide taskbar' : 'Show taskbar'}
        />

        {/* ---- marquee ---- */}
        <Marquee>
          <img className="wmp__state" src={stateIcon} alt="" />
          <div className="wmp__meta">{marquee}</div>
          <div className="wmp__time">{formatElapsed(currentTime)}</div>
        </Marquee>

        <Transport
          playback={playback}
          isMuted={isMuted}
          toggleMute={toggleMute}
        />

        <GotoSkin>
          <XPTooltip text="Switch to skin mode">
            <SkinBtn
              style={{ left: 0, top: 0, width: 24, height: 25 }}
              $up={SKIN.skinMode.up}
              $hover={SKIN.skinMode.hover}
              $down={SKIN.skinMode.down}
              disabled
            />
          </XPTooltip>
        </GotoSkin>
      </AppShift>
    </Body>
  );
}
