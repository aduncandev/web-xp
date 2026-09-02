// The Now Playing pane: the video or visualization screen with its title
// block and effects strip, and the playlist beside it.
import React from 'react';
import XPTooltip from 'components/XPTooltip';
import { SkinBtn } from './chrome';
import {
  NowPlayingRoot,
  PlaylistList,
  PlaylistPane,
  PlaylistRow,
  PlaylistTotal,
  Screen,
  Splitter,
  TitleBlock,
  VideoColumn,
  VizStrip,
} from './panes';
import { ALBUM_ART } from './visualizations';
import { formatTime } from './library';
import { SKIN } from './skinImages';

export default function NowPlaying({
  rootRef,
  screenRef,
  canvasRef,
  current,
  isVideo,
  isRemote,
  corsDenied,
  mediaMode,
  graphed,
  videoSize,
  showTitleBar,
  playback,
  viz,
  visualization,
  artUrl,
  onVizMenu,
  onCycleViz,
  onFullScreen,
  onCorsBlocked,
  alert,
  showPlaylist,
  playlistPane,
  queue,
  currentId,
  playTrack,
  openTrackMenu,
  currentPlaylist,
  totalTime,
}) {
  const onMediaError = () => {
    if (!current) return;
    if (isRemote && !corsDenied) {
      // may just be a host that will not share across origins; drop the
      // analyser and try again before complaining
      onCorsBlocked(current.path);
      return;
    }
    playback.setIsPlaying(false);
    playback.wantPlayRef.current = false;
    alert(
      [
        'Windows Media Player cannot find the file. It does not exist or the location specified is not correct.',
        ...(current.path.startsWith('url:')
          ? ['', 'The server may also be refusing to share it with other sites.']
          : []),
      ].join(String.fromCharCode(10)),
      'Windows Media Player',
    );
  };

  return (
    <NowPlayingRoot ref={rootRef}>
      <VideoColumn>
        {/* Titles: artist at top 5, track at top 25 (resource 137) */}
        {showTitleBar && (
          <TitleBlock>
            <div className="wmp__artist">{current ? current.artist : ''}</div>
            <div className="wmp__title">{current ? current.title : ''}</div>
          </TitleBlock>
        )}
        <Screen ref={screenRef}>
          <video
            // remounting on this boundary hands a remote track a clean
            // element, one never attached to the audio graph
            key={mediaMode}
            ref={playback.setMediaRef}
            data-ungraphed={graphed ? 'false' : 'true'}
            crossOrigin={graphed ? 'anonymous' : undefined}
            playsInline
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: videoSize === 0 ? 'contain' : 'none',
              background: '#000',
              display: isVideo ? 'block' : 'none',
            }}
            onClick={playback.togglePlay}
            onPlay={() => {
              playback.setIsPlaying(true);
              playback.wantPlayRef.current = true;
              playback.setupGraph();
            }}
            onPause={() => playback.setIsPlaying(false)}
            onEnded={playback.onEnded}
            onTimeUpdate={e => {
              playback.setCurrentTime(e.target.currentTime);
              if (isFinite(e.target.duration))
                playback.setDuration(e.target.duration);
            }}
            onError={onMediaError}
            onLoadedMetadata={e => {
              if (isFinite(e.target.duration))
                playback.setDuration(e.target.duration);
            }}
          />
          <canvas
            ref={canvasRef}
            onPointerMove={viz.trackPointer}
            onPointerDown={e => {
              viz.trackPointer(e);
              viz.pointerRef.current.down = true;
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerUp={e => {
              viz.pointerRef.current.down = false;
              e.currentTarget.releasePointerCapture(e.pointerId);
            }}
            onPointerLeave={() => {
              viz.pointerRef.current.inside = false;
            }}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              display: isVideo ? 'none' : 'block',
            }}
          />
          {!isVideo && visualization === ALBUM_ART && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 8,
                color: '#6f7699',
                fontSize: 11,
              }}
            >
              {artUrl ? (
                <img
                  src={artUrl}
                  alt=""
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                  }}
                />
              ) : (
                'No album art found for this track.'
              )}
            </div>
          )}
        </Screen>
        {/* svEffectsControls: buttons at left 3 / 33 / 52, title at 78 */}
        <VizStrip>
          <XPTooltip text="Select visualization or album art">
            <SkinBtn
              style={{ left: 3, top: 1, width: 18, height: 18 }}
              $up={SKIN.vizSwitch.up}
              $hover={SKIN.vizSwitch.hover}
              onClick={onVizMenu}
            />
          </XPTooltip>
          <XPTooltip text="Previous visualization">
            <SkinBtn
              style={{ left: 33, top: 1, width: 18, height: 18 }}
              $up={SKIN.vizPrev.up}
              $hover={SKIN.vizPrev.hover}
              $down={SKIN.vizPrev.down}
              onClick={() => onCycleViz(-1)}
            />
          </XPTooltip>
          <XPTooltip text="Next visualization">
            <SkinBtn
              style={{ left: 52, top: 1, width: 18, height: 18 }}
              $up={SKIN.vizNext.up}
              $hover={SKIN.vizNext.hover}
              $down={SKIN.vizNext.down}
              onClick={() => onCycleViz(1)}
            />
          </XPTooltip>
          <div className="wmp__vizname">{visualization}</div>
          <XPTooltip text="View full screen">
            <SkinBtn
              style={{ right: 4, top: 1, width: 18, height: 18 }}
              $up={SKIN.fullScreen.up}
              $hover={SKIN.fullScreen.hover}
              $down={SKIN.fullScreen.down}
              onClick={onFullScreen}
            />
          </XPTooltip>
        </VizStrip>
      </VideoColumn>
      {showPlaylist && (
        <>
          <Splitter onMouseDown={playlistPane.beginDrag} />
          <PlaylistPane $width={playlistPane.size}>
            <PlaylistList>
              {queue.map(track => (
                <PlaylistRow
                  key={track.id}
                  $current={track.id === currentId}
                  onDoubleClick={() => playTrack(track)}
                  onContextMenu={e =>
                    openTrackMenu(e, [track], {
                      nowPlaying: true,
                      playlist: currentPlaylist,
                    })
                  }
                >
                  <span className="wmp__pl-title">{track.title}</span>
                  <span className="wmp__pl-time">
                    {formatTime(track.duration)}
                  </span>
                </PlaylistRow>
              ))}
            </PlaylistList>
            <PlaylistTotal>Total Time: {formatTime(totalTime)}</PlaylistTotal>
          </PlaylistPane>
        </>
      )}
    </NowPlayingRoot>
  );
}
