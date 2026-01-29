import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import styled from 'styled-components';
import { mediaLibrary } from './config';
import { useVolume } from '../../../context/VolumeContext';

// Helper to determine media type
const getMediaType = (url, type) => {
  if (type) {
    if (type.startsWith('video')) return 'video';
    if (type.startsWith('image')) return 'image';
    return 'audio';
  }
  if (!url || typeof url !== 'string') return 'audio';
  if (url.match(/\.(mp4|webm|ogv|mkv)$/i)) return 'video';
  if (url.match(/\.(jpg|jpeg|png|gif|bmp)$/i)) return 'image';
  return 'audio';
};

export default function MediaPlayer() {
  // --- STATE ---

  // 1. Library State
  const [library, setLibrary] = useState(() => {
    const lib = { ...mediaLibrary };
    delete lib['All Tracks'];
    return lib;
  });

  const [uncategorized, setUncategorized] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(
    Object.keys(mediaLibrary)[0],
  );
  const [currentIndex, setCurrentIndex] = useState(0);

  // 3. Dynamic Playlist
  const playlist = useMemo(() => {
    if (currentFolder === 'All Media') {
      const allFolderItems = Object.values(library).flat();
      return [...allFolderItems, ...uncategorized];
    }
    return library[currentFolder] || [];
  }, [library, uncategorized, currentFolder]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showPlaylist, setShowPlaylist] = useState(true);
  const [isLooping, setIsLooping] = useState(false);
  const [localVolume, setLocalVolume] = useState(1);
  const [windowSize, setWindowSize] = useState({ width: 300, height: 300 });

  // Refs
  const mediaRef = useRef(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const animationRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const connectedElementRef = useRef(null);

  // Drag Sorting Refs
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  const { volume: globalVolume, isMuted, toggleMute } = useVolume();

  const currentItem = playlist[currentIndex] || {
    type: 'audio',
    title: 'No Media',
    url: '',
    id: 'empty-state',
  };
  const isImage = currentItem.type === 'image';

  // --- RESIZE OBSERVER ---
  useEffect(() => {
    if (!containerRef.current) return;
    resizeObserverRef.current = new ResizeObserver(entries => {
      for (let entry of entries) {
        setWindowSize({
          width: Math.floor(entry.contentRect.width),
          height: Math.floor(entry.contentRect.height),
        });
      }
    });
    resizeObserverRef.current.observe(containerRef.current);
    return () => resizeObserverRef.current?.disconnect();
  }, []);

  // --- FOLDER SWITCHING ---
  const changeFolder = folderName => {
    if (folderName === currentFolder) return;
    setIsPlaying(false);
    setCurrentIndex(0);
    setCurrentTime(0);
    setCurrentFolder(folderName);
  };

  // --- DRAG AND DROP (UPLOAD) ---
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
        artist: '',
        id: Math.random()
          .toString(36)
          .substr(2, 9),
      }));

      if (currentFolder === 'All Media') {
        setUncategorized(prev => [...prev, ...newItems]);
      } else {
        setLibrary(prev => ({
          ...prev,
          [currentFolder]: [...(prev[currentFolder] || []), ...newItems],
        }));
      }
    }
  };

  // --- DRAG SORTING ---
  const handleSortStart = (e, position) => {
    dragItem.current = position;
    e.dataTransfer.effectAllowed = 'move';
    e.stopPropagation();
  };

  const handleSortEnter = (e, position) => {
    dragOverItem.current = position;
  };

  const handleSortEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    if (currentFolder === 'All Media') return;

    const newPlaylist = [...library[currentFolder]];
    const draggedItemContent = newPlaylist.splice(dragItem.current, 1)[0];
    newPlaylist.splice(dragOverItem.current, 0, draggedItemContent);

    if (dragItem.current === currentIndex) {
      setCurrentIndex(dragOverItem.current);
    } else if (
      dragItem.current < currentIndex &&
      dragOverItem.current >= currentIndex
    ) {
      setCurrentIndex(currentIndex - 1);
    } else if (
      dragItem.current > currentIndex &&
      dragOverItem.current <= currentIndex
    ) {
      setCurrentIndex(currentIndex + 1);
    }

    dragItem.current = null;
    dragOverItem.current = null;

    setLibrary(prev => ({ ...prev, [currentFolder]: newPlaylist }));
  };

  // --- VISUALIZER ENGINE ---
  useEffect(() => {
    if (currentItem.type !== 'audio') {
      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
        connectedElementRef.current = null;
      }
    }
  }, [currentItem.type]);

  const drawSpectrum = useCallback(() => {
    if (!canvasRef.current || !analyserRef.current) return;

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const analyser = analyserRef.current;

    // We get the sample rate to determine the frequency cap
    const sampleRate = audioContextRef.current
      ? audioContextRef.current.sampleRate
      : 48000;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // --- FIX: VISUAL DENSITY PRESERVATION ---
      // 1. We cap the visualization at 22kHz (human hearing limit).
      // 2. We calculate how many bins fit into that 22kHz range.
      // 3. We only iterate over those "useful" bins.
      const nyquist = sampleRate / 2;
      const maxFreq = 22000; // 22kHz cap

      // Calculate which bin corresponds to 22kHz
      // If sample rate is high (96k), nyquist is 48k. 22k is roughly half the buffer.
      // If sample rate is std (44.1k), nyquist is 22.05k. 22k is basically the whole buffer.
      const usefulBins = Math.min(
        bufferLength,
        Math.floor(bufferLength * (maxFreq / nyquist)),
      );

      // Calculate bar width based on useful bins only
      const barWidth = canvas.width / usefulBins;

      let x = 0;

      for (let i = 0; i < usefulBins; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#004e92');
        gradient.addColorStop(1, '#50cc7f');
        ctx.fillStyle = gradient;

        // Use (barWidth - 1) to create a small gap, ensuring total width fits
        // Math.max(1, ...) ensures bars don't disappear if they get too thin
        ctx.fillRect(
          x,
          canvas.height - barHeight,
          Math.max(1, barWidth - 1),
          barHeight,
        );

        x += barWidth;
      }
    };
    draw();
  }, []);

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

        // --- FIX: DYNAMIC FFT RESOLUTION ---
        // If sample rate is high (e.g. 192kHz), we increase the FFT size.
        // This gives us MORE bars to work with, counteracting the "zoomed in" effect.
        // Standard (48k) -> fftSize 256.
        // High (192k) -> fftSize 1024.
        const baseSize = 256;
        const scale = Math.max(1, Math.ceil(ctx.sampleRate / 48000));

        // Find next power of 2 to satisfy FFT requirements
        let newSize = baseSize;
        while (newSize < baseSize * scale) newSize *= 2;

        analyserRef.current.fftSize = newSize;
      }

      if (connectedElementRef.current !== mediaRef.current) {
        if (sourceRef.current) {
          try {
            sourceRef.current.disconnect();
          } catch (e) {}
          sourceRef.current = null;
        }

        sourceRef.current = ctx.createMediaElementSource(mediaRef.current);
        sourceRef.current.connect(analyserRef.current);
        analyserRef.current.connect(ctx.destination);
        connectedElementRef.current = mediaRef.current;
      }

      drawSpectrum();
    } catch (e) {
      console.warn('Visualizer setup warning:', e);
    }
  }, [currentItem.type, drawSpectrum]);

  // --- PLAYBACK LOGIC ---

  useEffect(() => {
    if (mediaRef.current && !isImage) {
      mediaRef.current.volume = (globalVolume / 100) * localVolume;
      mediaRef.current.muted = isMuted;
    }
  }, [globalVolume, localVolume, isMuted, isImage, currentItem.id]);

  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);

    const playMedia = async () => {
      if (mediaRef.current && !isImage && playlist.length > 0) {
        try {
          mediaRef.current.load();
          const playPromise = mediaRef.current.play();
          if (playPromise !== undefined) {
            await playPromise;
            setIsPlaying(true);
          }
        } catch (err) {
          setIsPlaying(false);
        }
      }
    };

    playMedia();

    if (currentItem.type === 'audio') {
      setupVisualizer();
    }
  }, [currentIndex, isImage, playlist, currentItem.id, setupVisualizer]);

  // --- CONTROLS ---

  const togglePlay = async () => {
    if (isImage || !mediaRef.current) return;

    if (audioContextRef.current?.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    if (mediaRef.current.paused) {
      mediaRef.current.play();
      setIsPlaying(true);
      setupVisualizer();
    } else {
      mediaRef.current.pause();
      setIsPlaying(false);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    }
  };

  const stop = () => {
    if (isImage || !mediaRef.current) return;
    mediaRef.current.pause();
    mediaRef.current.currentTime = 0;
    setIsPlaying(false);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
  };

  const nextTrack = () =>
    playlist.length && setCurrentIndex(p => (p + 1) % playlist.length);
  const prevTrack = () =>
    playlist.length &&
    setCurrentIndex(p => (p - 1 + playlist.length) % playlist.length);

  const handleEnded = () => {
    if (isLooping && mediaRef.current) {
      mediaRef.current.currentTime = 0;
      mediaRef.current.play();
    } else {
      nextTrack();
    }
  };

  // --- RENDER ---
  const renderMedia = () => {
    if (!currentItem.url) return <VisualizerContainer />;

    const commonProps = {
      key: currentItem.id || currentItem.url,
      ref: mediaRef,
      onTimeUpdate: () =>
        mediaRef.current &&
        (setCurrentTime(mediaRef.current.currentTime),
        setDuration(mediaRef.current.duration || 0)),
      onEnded: handleEnded,
      onPlay: () => {
        setIsPlaying(true);
        setupVisualizer();
      },
      onPause: () => setIsPlaying(false),
      src: currentItem.url,
      crossOrigin: 'anonymous',
    };

    if (currentItem.type === 'video')
      return <VideoElement {...commonProps} onClick={togglePlay} />;
    if (currentItem.type === 'image')
      return <ImageElement src={currentItem.url} />;

    return (
      <VisualizerContainer>
        <audio {...commonProps} />
        <canvas
          ref={canvasRef}
          width={windowSize.width}
          height={Math.max(100, windowSize.height - (showPlaylist ? 180 : 80))}
          style={{ width: '100%', height: '100%' }}
        />
      </VisualizerContainer>
    );
  };

  const compactMode = windowSize.width < 350;

  return (
    <PlayerContainer
      ref={containerRef}
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
    >
      <TopTitleBar>
        <Marquee>
          {playlist.length
            ? `${currentIndex + 1}. ${
                currentItem.artist ? `${currentItem.artist} - ` : ''
              }${currentItem.title}`
            : 'Waiting for media...'}
        </Marquee>
      </TopTitleBar>

      <ScreenArea expanded={!showPlaylist}>{renderMedia()}</ScreenArea>

      <ControlDeck>
        <SeekBar
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={e => {
            setCurrentTime(e.target.value);
            if (mediaRef.current) mediaRef.current.currentTime = e.target.value;
          }}
          disabled={isImage}
        />
        <ButtonRow compact={compactMode}>
          <TimeDisplay>
            {isImage
              ? 'IMG'
              : `${formatTime(currentTime)}/${formatTime(duration)}`}
          </TimeDisplay>

          <MainControls>
            <MediaBtn onClick={prevTrack} title="Previous">
              ⏮
            </MediaBtn>
            <MediaBtn onClick={stop} disabled={isImage} title="Stop">
              ⏹
            </MediaBtn>

            <MediaBtn
              onClick={togglePlay}
              active={isPlaying}
              disabled={isImage}
              style={{ fontSize: '18px', width: '36px', height: '36px' }}
            >
              {isPlaying ? '⏸' : '▶'}
            </MediaBtn>

            <MediaBtn onClick={nextTrack} title="Next">
              ⏭
            </MediaBtn>

            <MediaBtn
              onClick={() => setIsLooping(!isLooping)}
              active={isLooping}
              title="Loop"
              disabled={isImage}
            >
              <LoopIcon />
            </MediaBtn>
          </MainControls>

          <SideControls>
            <VolumeContainer>
              <MuteBtn onClick={toggleMute}>
                <SpeakerIcon muted={isMuted || localVolume === 0} />
              </MuteBtn>
              <VolumeSlider
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={localVolume}
                onChange={e => setLocalVolume(parseFloat(e.target.value))}
              />
            </VolumeContainer>
            <MediaBtn
              onClick={() => setShowPlaylist(!showPlaylist)}
              active={showPlaylist}
            >
              <PlaylistIcon />
            </MediaBtn>
          </SideControls>
        </ButtonRow>
      </ControlDeck>

      {showPlaylist && (
        <PlaylistContainer>
          <FolderBar>
            {Object.keys(library).map(folder => (
              <FolderTab
                key={folder}
                active={folder === currentFolder}
                onClick={() => changeFolder(folder)}
              >
                {folder}
              </FolderTab>
            ))}
            <FolderTab
              active={currentFolder === 'All Media'}
              onClick={() => changeFolder('All Media')}
              style={{
                fontWeight: 'bold',
                color: currentFolder === 'All Media' ? '#fff' : '#888',
              }}
            >
              All Media
            </FolderTab>
          </FolderBar>

          <PlaylistItems>
            {playlist.map((item, i) => (
              <PlaylistItem
                key={item.id || i}
                active={i === currentIndex}
                onClick={() => setCurrentIndex(i)}
                draggable={currentFolder !== 'All Media'}
                onDragStart={e => handleSortStart(e, i)}
                onDragEnter={e => handleSortEnter(e, i)}
                onDragEnd={handleSortEnd}
                onDragOver={e => e.preventDefault()}
                style={{
                  cursor: currentFolder === 'All Media' ? 'pointer' : 'grab',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    overflow: 'hidden',
                    alignItems: 'center',
                  }}
                >
                  {currentFolder !== 'All Media' && (
                    <span style={{ opacity: 0.5, fontSize: '10px' }}>☰</span>
                  )}
                  <ItemTitle>
                    {i + 1}. {item.artist ? `${item.artist} - ` : ''}
                    {item.title}
                  </ItemTitle>
                </div>
                <DeleteBtn
                  onClick={e => {
                    e.stopPropagation();
                    if (currentFolder === 'All Media') return;
                    setLibrary(prev => ({
                      ...prev,
                      [currentFolder]: prev[currentFolder].filter(
                        (_, idx) => idx !== i,
                      ),
                    }));
                    if (i < currentIndex) setCurrentIndex(c => c - 1);
                  }}
                >
                  ×
                </DeleteBtn>
              </PlaylistItem>
            ))}

            <PermanentDropHint>
              <span>➕</span> Drag & Drop Media Here
            </PermanentDropHint>
          </PlaylistItems>
        </PlaylistContainer>
      )}
    </PlayerContainer>
  );
}

// --- HELPERS ---
const formatTime = t => {
  if (!t) return '0:00';
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s < 10 ? '0' + s : s}`;
};

// Icons
const PlaylistIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="3"
    fill="none"
  >
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);
const LoopIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
  >
    <path d="M17 1l4 4-4 4" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <path d="M7 23l-4-4 4-4" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
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

// --- STYLES ---
const PlayerContainer = styled.div`
  background: #1a1a1a;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: #fff;
  font-family: 'Tahoma', sans-serif;
  border: 1px solid #666;
  box-shadow: inset 1px 1px 2px #000;
  position: relative;
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
  position: relative;
  overflow: hidden;
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
`;
const ButtonRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${props => (props.compact ? '4px' : '0')};
`;
const TimeDisplay = styled.div`
  font-family: monospace;
  font-size: 11px;
  color: #ccc;
  min-width: 60px;
  margin-right: 8px;
`;
const MainControls = styled.div`
  display: flex;
  gap: 4px;
  align-items: center;
  flex-grow: 1;
  justify-content: center;
`;
const SideControls = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
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
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
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

const PlaylistContainer = styled.div`
  flex: 1;
  background: #111;
  display: flex;
  flex-direction: column;
  min-height: 60px;
  border-top: 1px solid #333;
  overflow: hidden;
`;
const FolderBar = styled.div`
  display: flex;
  overflow-x: auto;
  background: #222;
  border-bottom: 1px solid #444;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
`;
const FolderTab = styled.button`
  background: ${props => (props.active ? '#333' : 'transparent')};
  color: ${props => (props.active ? '#fff' : '#888')};
  border: none;
  padding: 6px 12px;
  font-size: 11px;
  cursor: pointer;
  border-right: 1px solid #444;
  white-space: nowrap;
  &:hover {
    background: #333;
    color: #ddd;
  }
`;

const PlaylistItems = styled.div`
  flex: 1;
  overflow-y: auto;
  &::-webkit-scrollbar {
    width: 10px;
    background: #222;
  }
  &::-webkit-scrollbar-thumb {
    background: #444;
    border: 1px solid #222;
  }
  display: flex;
  flex-direction: column;
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
const ItemTitle = styled.div`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 11px;
`;
const DeleteBtn = styled.button`
  background: none;
  border: none;
  color: #666;
  font-weight: bold;
  cursor: pointer;
  font-size: 14px;
  &:hover {
    color: #f44;
  }
`;

// NEW: Permanent Drop Hint style
const PermanentDropHint = styled.div`
  padding: 15px;
  text-align: center;
  color: #666;
  font-style: italic;
  border: 2px dashed #333;
  margin: 10px;
  border-radius: 6px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 11px;
  user-select: none;
  &:hover {
    border-color: #555;
    color: #888;
    background: #1a1a1a;
  }
`;
