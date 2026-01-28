import React, { useState, useRef, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { initialTracks } from './config';
import { useVolume } from '../../../context/VolumeContext';

const getMediaType = (url, fileType) => {
  if (fileType) {
    if (fileType.startsWith('video')) return 'video';
    if (fileType.startsWith('image')) return 'image';
    return 'audio';
  }
  if (!url || typeof url !== 'string') return 'audio';
  if (url.match(/\.(mp4|webm|ogv|mkv)$/i)) return 'video';
  if (url.match(/\.(jpg|jpeg|png|gif|bmp)$/i)) return 'image';
  return 'audio';
};

export default function MediaPlayer({ onClose, onMinimize, isFocus }) {
  const [playlist, setPlaylist] = useState(() => {
    const tracks = Array.isArray(initialTracks) ? initialTracks : [];
    return tracks.map(t => ({
      ...t,
      type: getMediaType(t.url, t.fileType),
      title:
        t.metaData && t.metaData.artist && t.metaData.title
          ? `${t.metaData.artist} - ${t.metaData.title}`
          : t.metaData?.title || t.title || 'Unknown Track',
    }));
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showPlaylist, setShowPlaylist] = useState(true);
  const [isLooping, setIsLooping] = useState(false);
  const [localVolume, setLocalVolume] = useState(1);
  const [windowSize, setWindowSize] = useState({ width: 300, height: 300 });

  const mediaRef = useRef(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const animationRef = useRef(null);
  const resizeObserverRef = useRef(null);

  const { volume: globalVolume, isMuted, toggleMute } = useVolume();

  const currentItem = playlist[currentIndex] || {
    type: 'audio',
    title: 'No Media',
    url: '',
  };
  const isImage = currentItem.type === 'image';

  // --- RESIZE OBSERVER ---
  useEffect(() => {
    if (!containerRef.current) return;
    resizeObserverRef.current = new ResizeObserver(entries => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setWindowSize({ width: Math.floor(width), height: Math.floor(height) });
      }
    });
    resizeObserverRef.current.observe(containerRef.current);
    return () => resizeObserverRef.current?.disconnect();
  }, []);

  // --- VISUALIZER ENGINE ---

  // FIX: Reset sourceRef when switching media types.
  // This ensures that if the <audio> element is removed (image mode) and recreated,
  // we don't hold onto a dead MediaElementSourceNode.
  useEffect(() => {
    if (currentItem.type !== 'audio') {
      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
    }
  }, [currentItem.type]);

  const setupVisualizer = useCallback(() => {
    if (!mediaRef.current || currentItem.type !== 'audio') return;

    try {
      if (!audioContextRef.current) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContextRef.current = new AudioContext();
      }

      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      if (!analyserRef.current) {
        analyserRef.current = ctx.createAnalyser();
        analyserRef.current.fftSize = 256;
      }

      // Only create a new source if one doesn't exist for the current context
      if (!sourceRef.current) {
        sourceRef.current = ctx.createMediaElementSource(mediaRef.current);
        sourceRef.current.connect(analyserRef.current);
        analyserRef.current.connect(ctx.destination);
      }

      drawSpectrum();
    } catch (e) {
      console.warn('Visualizer setup failed:', e);
    }
  }, [currentItem.type]);

  const drawSpectrum = useCallback(() => {
    if (!canvasRef.current || !analyserRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height;

        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#004e92');
        gradient.addColorStop(1, '#50cc7f');

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };
    draw();
  }, []);

  // --- PLAYBACK LOGIC ---

  useEffect(() => {
    if (mediaRef.current && !isImage) {
      const effectiveVolume = (globalVolume / 100) * localVolume;
      mediaRef.current.volume = effectiveVolume;
      mediaRef.current.muted = isMuted;
    }
  }, [globalVolume, localVolume, isMuted, isImage, currentIndex]);

  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);

    const playMedia = async () => {
      if (mediaRef.current && !isImage && playlist.length > 0) {
        try {
          mediaRef.current.load();
          await mediaRef.current.play();
        } catch (err) {
          setIsPlaying(false);
        }
      }
    };

    playMedia();

    // Trigger visualizer setup only if we are playing audio
    if (currentItem.type === 'audio') {
      // Small timeout allows the DOM to settle if we just switched from Image -> Audio
      setTimeout(() => {
        if (isPlaying) setupVisualizer();
      }, 50);
    }
  }, [currentIndex, isImage, playlist.length]);

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  // --- CONTROLS ---

  const onPlayEvent = () => {
    setIsPlaying(true);
    setupVisualizer();
  };

  const onPauseEvent = () => {
    setIsPlaying(false);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
  };

  const togglePlay = async () => {
    if (isImage || !mediaRef.current) return;

    if (audioContextRef.current?.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    if (mediaRef.current.paused) {
      mediaRef.current.play().catch(e => console.error('Play failed', e));
    } else {
      mediaRef.current.pause();
    }
  };

  const stop = () => {
    if (isImage || !mediaRef.current) return;
    mediaRef.current.pause();
    mediaRef.current.currentTime = 0;
  };

  const nextTrack = () => {
    if (playlist.length === 0) return;
    setCurrentIndex(prev => (prev + 1) % playlist.length);
  };

  const prevTrack = () => {
    if (playlist.length === 0) return;
    setCurrentIndex(prev => (prev - 1 + playlist.length) % playlist.length);
  };

  const handleEnded = () => {
    if (isLooping && mediaRef.current) {
      mediaRef.current.currentTime = 0;
      mediaRef.current.play().catch(e => console.error(e));
    } else {
      nextTrack();
    }
  };

  const onSeek = e => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (mediaRef.current && !isImage) {
      mediaRef.current.currentTime = time;
    }
  };

  const onVolumeChange = e => {
    setLocalVolume(parseFloat(e.target.value));
  };

  const handleMuteClick = e => {
    e.stopPropagation();
    if (toggleMute) toggleMute();
  };

  const removeFromPlaylist = (indexToRemove, e) => {
    e.stopPropagation();
    setPlaylist(prev => {
      const newPlaylist = prev.filter((_, i) => i !== indexToRemove);
      if (newPlaylist.length === 0) {
        setCurrentIndex(0);
        return newPlaylist;
      }
      if (indexToRemove < currentIndex) {
        setCurrentIndex(c => c - 1);
      } else if (indexToRemove === currentIndex) {
        setCurrentIndex(c => c % newPlaylist.length);
      }
      return newPlaylist;
    });
  };

  const handleDrop = e => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files).filter(
      f =>
        f.type.startsWith('audio/') ||
        f.type.startsWith('video/') ||
        f.type.startsWith('image/'),
    );

    if (files.length > 0) {
      const newItems = files.map(file => ({
        url: URL.createObjectURL(file),
        type: getMediaType(null, file.type),
        title: file.name,
      }));
      setPlaylist(prev => [...prev, ...newItems]);
    }
  };

  // --- RENDERERS ---
  const renderMediaContent = () => {
    if (!currentItem.url) return <VisualizerContainer />;

    if (currentItem.type === 'video') {
      return (
        <VideoElement
          ref={mediaRef}
          onTimeUpdate={() => {
            if (mediaRef.current) {
              setCurrentTime(mediaRef.current.currentTime);
              setDuration(mediaRef.current.duration || 0);
            }
          }}
          onEnded={handleEnded}
          onPlay={onPlayEvent}
          onPause={onPauseEvent}
          onClick={togglePlay}
          playsInline
        >
          <source src={currentItem.url} />
        </VideoElement>
      );
    }
    if (currentItem.type === 'image') {
      return <ImageElement src={currentItem.url} alt="media content" />;
    }
    return (
      <VisualizerContainer>
        <audio
          ref={mediaRef}
          src={currentItem.url}
          onTimeUpdate={() => {
            if (mediaRef.current) {
              setCurrentTime(mediaRef.current.currentTime);
              setDuration(mediaRef.current.duration || 0);
            }
          }}
          onEnded={handleEnded}
          onPlay={onPlayEvent}
          onPause={onPauseEvent}
          crossOrigin="anonymous"
        />
        <canvas
          ref={canvasRef}
          width={windowSize.width}
          height={Math.max(100, windowSize.height - (showPlaylist ? 180 : 80))}
          style={{ width: '100%', height: '100%' }}
        />
      </VisualizerContainer>
    );
  };

  const hideTime = windowSize.width < 340;
  const hideVolumeSlider = windowSize.width < 300;
  const compactMode = windowSize.width < 350;

  return (
    <PlayerContainer
      ref={containerRef}
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
    >
      <TopTitleBar>
        <Marquee>
          {playlist.length > 0
            ? `${currentIndex + 1}. ${currentItem.title}`
            : 'Waiting for media...'}
        </Marquee>
      </TopTitleBar>

      <ScreenArea expanded={!showPlaylist}>{renderMediaContent()}</ScreenArea>

      <ControlDeck>
        <SeekBar
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={onSeek}
          disabled={isImage}
        />
        <ButtonRow compact={compactMode}>
          {!hideTime && (
            <TimeDisplay>
              {isImage
                ? 'IMG'
                : `${formatTime(currentTime)}/${formatTime(duration)}`}
            </TimeDisplay>
          )}

          <MainControls>
            <MediaBtn onClick={prevTrack} title="Previous">
              ⏮
            </MediaBtn>
            <MediaBtn onClick={stop} title="Stop" disabled={isImage}>
              ⏹
            </MediaBtn>

            <MediaBtn
              onClick={togglePlay}
              style={{ fontSize: '18px', width: '36px', height: '36px' }}
              title="Play/Pause"
              disabled={isImage}
              active={isPlaying}
            >
              {isPlaying ? '⏸' : '▶'}
            </MediaBtn>

            <MediaBtn onClick={nextTrack} title="Next">
              ⏭
            </MediaBtn>

            <MediaBtn
              onClick={() => setIsLooping(!isLooping)}
              active={isLooping}
              title={isLooping ? 'Loop On' : 'Loop Off'}
              disabled={isImage}
            >
              <LoopIcon />
            </MediaBtn>
          </MainControls>

          <SideControls>
            <VolumeContainer>
              <MuteBtn
                onClick={handleMuteClick}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                <SpeakerIcon muted={isMuted || localVolume === 0} />
              </MuteBtn>
              {!hideVolumeSlider && (
                <VolumeSlider
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={localVolume}
                  onChange={onVolumeChange}
                />
              )}
            </VolumeContainer>

            <MediaBtn
              onClick={() => setShowPlaylist(!showPlaylist)}
              active={showPlaylist}
              title="Toggle Playlist"
            >
              <PlaylistIcon />
            </MediaBtn>
          </SideControls>
        </ButtonRow>
      </ControlDeck>

      {showPlaylist && (
        <Playlist>
          {playlist.map((item, i) => (
            <PlaylistItem
              key={i}
              active={i === currentIndex}
              onDoubleClick={() => setCurrentIndex(i)}
            >
              <ItemInfo>
                <TypeIcon>{getTypeIcon(item.type)}</TypeIcon>
                <ItemTitle>
                  {i + 1}. {item.title}
                </ItemTitle>
              </ItemInfo>
              <DeleteBtn onClick={e => removeFromPlaylist(i, e)}>×</DeleteBtn>
            </PlaylistItem>
          ))}
          <DropHint>Drag Media Files Here</DropHint>
        </Playlist>
      )}
    </PlayerContainer>
  );
}

// --- ICONS & HELPERS ---
const LoopIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17 1l4 4-4 4" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <path d="M7 23l-4-4 4-4" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </svg>
);
const PlaylistIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="8" y1="6" x2="21" y2="6"></line>
    <line x1="8" y1="12" x2="21" y2="12"></line>
    <line x1="8" y1="18" x2="21" y2="18"></line>
    <line x1="3" y1="6" x2="3.01" y2="6"></line>
    <line x1="3" y1="12" x2="3.01" y2="12"></line>
    <line x1="3" y1="18" x2="3.01" y2="18"></line>
  </svg>
);
const SpeakerIcon = ({ muted }) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#ccc"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {muted ? (
      <>
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <line x1="23" y1="9" x2="17" y2="15"></line>
        <line x1="17" y1="9" x2="23" y2="15"></line>
      </>
    ) : (
      <>
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
      </>
    )}
  </svg>
);
const formatTime = time => {
  if (!time || isNaN(time)) return '0:00';
  const m = Math.floor(time / 60);
  const s = Math.floor(time % 60);
  return `${m}:${s < 10 ? '0' + s : s}`;
};
const getTypeIcon = type => {
  if (type === 'video') return '🎬';
  if (type === 'image') return '🖼️';
  return '🎵';
};

// --- STYLES ---

const PlayerContainer = styled.div`
  background: #1a1a1a;
  height: 100%;
  width: 100%;
  min-width: 280px;
  min-height: 250px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: #fff;
  font-family: 'Tahoma', sans-serif;
  border: 1px solid #666;
  box-shadow: inset 1px 1px 2px #000;
`;

const TopTitleBar = styled.div`
  background: #000;
  height: 24px;
  display: flex;
  align-items: center;
  padding: 0 8px;
  border-bottom: 1px solid #333;
  flex-shrink: 0;
`;

const Marquee = styled.div`
  font-size: 11px;
  color: #0f0;
  font-family: 'Courier New', monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
`;

const ScreenArea = styled.div`
  flex: ${props => (props.expanded ? '1' : '0 0 auto')};
  height: ${props => (props.expanded ? 'auto' : '150px')};
  min-height: 100px;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
`;

const VideoElement = styled.video`
  width: 100%;
  height: 100%;
  object-fit: contain;
`;
const ImageElement = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
`;

const VisualizerContainer = styled.div`
  width: 100%;
  height: 100%;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ControlDeck = styled.div`
  background: linear-gradient(to bottom, #3a3a3a, #1a1a1a);
  padding: 8px 10px;
  border-top: 1px solid #555;
  border-bottom: 1px solid #000;
  flex-shrink: 0;
  min-height: 70px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  justify-content: center;
`;

const SeekBar = styled.input`
  width: 100%;
  height: 4px;
  margin-bottom: 8px;
  cursor: pointer;
  accent-color: #0078d7;
  &:hover {
    height: 6px;
  }
  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;

const ButtonRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: ${props => (props.compact ? 'wrap' : 'nowrap')};
  gap: ${props => (props.compact ? '4px' : '0')};
`;

const TimeDisplay = styled.div`
  font-family: monospace;
  font-size: 11px;
  color: #ccc;
  min-width: 60px;
  flex-shrink: 0;
  margin-right: 8px;
`;

const MainControls = styled.div`
  display: flex;
  gap: 4px;
  align-items: center;
  flex-shrink: 0;
  flex-grow: 1;
  justify-content: center;
`;

const SideControls = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-shrink: 0;
  margin-left: auto;
  gap: 8px;
`;

const MediaBtn = styled.button`
  background: ${props =>
    props.active
      ? 'radial-gradient(circle, #0078d7 0%, #0044bb 100%)'
      : 'linear-gradient(to bottom, #555, #333)'};
  border: 1px solid #000;
  border-radius: 4px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 12px;
  color: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  position: relative;

  &:active {
    transform: translateY(1px);
    background: #222;
  }
  &:hover {
    filter: brightness(1.2);
    border-color: #777;
  }
  &:disabled {
    opacity: 0.5;
    cursor: default;
    filter: grayscale(1);
  }
`;

const MuteBtn = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  z-index: 10;
  position: relative;
  &:hover svg {
    stroke: #fff;
  }
`;

const VolumeContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
`;

const VolumeSlider = styled.input`
  width: 50px;
  height: 4px;
  cursor: pointer;
  accent-color: #0078d7;
`;

const Playlist = styled.div`
  flex: 1;
  background: #111;
  overflow-y: auto;
  font-size: 11px;
  border-top: 1px solid #333;
  display: flex;
  flex-direction: column;
  min-height: 60px;

  &::-webkit-scrollbar {
    width: 10px;
    background: #222;
  }
  &::-webkit-scrollbar-thumb {
    background: #444;
    border: 1px solid #222;
  }
`;

const PlaylistItem = styled.div`
  padding: 6px 10px;
  cursor: pointer;
  color: ${props => (props.active ? '#fff' : '#aaa')};
  background: ${props =>
    props.active
      ? 'linear-gradient(to right, #0054e9, #0044bb)'
      : 'transparent'};
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #222;
  flex-shrink: 0;

  &:hover {
    background: ${props =>
      props.active ? 'linear-gradient(to right, #0054e9, #0044bb)' : '#222'};
  }
`;

const ItemInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
`;
const ItemTitle = styled.div`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
const TypeIcon = styled.span`
  font-size: 12px;
  opacity: 0.7;
`;

const DeleteBtn = styled.button`
  background: none;
  border: none;
  color: #666;
  font-weight: bold;
  cursor: pointer;
  font-size: 14px;
  padding: 0 4px;
  &:hover {
    color: #ff4444;
  }
`;

const DropHint = styled.div`
  padding: 10px;
  text-align: center;
  color: #555;
  font-style: italic;
  border-top: 1px dashed #333;
  margin-top: auto;
`;
