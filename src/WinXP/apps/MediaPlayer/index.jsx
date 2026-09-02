import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  useLayoutEffect,
} from 'react';
import styled, { keyframes } from 'styled-components';
import XPTooltip from 'components/XPTooltip';
import { useVolume } from '../../../context/VolumeContext';
import { useVFS } from '../../../context/VFSContext';
import { SPECIAL_FOLDERS } from '../../../context/vfsConstants';
import { readMediaTags } from '../../../context/mediaTags';

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

// --- Library scanning: the library IS the filesystem ---

const MEDIA_EXTENSIONS = /\.(mp3|wav|ogg|mp4|webm|avi)$/i;

const SHARED_MUSIC = SPECIAL_FOLDERS.SHARED_MUSIC;

/*
 * Resolved per scan. SPECIAL_FOLDERS.MY_MUSIC is a getter over the current
 * account name, so a module-level array freezes whoever was logged on when
 * this module first loaded and every later session scans their folder.
 */
const scanRoots = () => [
  { label: 'My Music', path: SPECIAL_FOLDERS.MY_MUSIC },
  { label: 'My Videos', path: SPECIAL_FOLDERS.MY_VIDEOS },
  { label: 'Shared Music', path: SHARED_MUSIC },
];

const stripExtension = name => name.replace(/\.[^.]+$/, '');

const toTrack = node => ({
  path: node.path,
  title: stripExtension(node.name),
  type: getMediaType(node.name, node.mimeType),
});

/** Recursively collect media files under a folder (alphabetical per level). */
function collectMedia(vfs, dirPath, out) {
  for (const child of vfs.listDir(dirPath)) {
    if (child.type === 'folder') collectMedia(vfs, child.path, out);
    else if (child.type === 'file' && MEDIA_EXTENSIONS.test(child.name)) {
      out.push(toTrack(child));
    }
  }
  return out;
}

/**
 * Build the library from the VFS: one tab per scan root that exists
 * (files directly inside it), plus a tab per direct subfolder that
 * contains media (recursively) — so every file appears exactly once
 * and "All Media" stays duplicate-free.
 */
function buildVfsLibrary(vfs) {
  const folders = [];
  for (const root of scanRoots()) {
    const rootNode = vfs.findNodeCI(root.path);
    if (!rootNode) continue;
    const children = vfs.listDir(rootNode.path);
    const direct = children
      .filter(c => c.type === 'file' && MEDIA_EXTENSIONS.test(c.name))
      .map(toTrack);
    if (direct.length || root.label === 'My Music') {
      folders.push({ label: root.label, tracks: direct });
    }
    for (const child of children) {
      if (child.type !== 'folder') continue;
      const sub = collectMedia(vfs, child.path, []);
      if (sub.length) folders.push({ label: child.name, tracks: sub });
    }
  }
  return folders;
}

const scroll = keyframes`
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
`;

const TickerContainer = styled.div`
  font-size: 11px;
  color: #0f0;
  font-family: 'Courier New', monospace;
  white-space: nowrap;
  overflow: hidden;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  position: relative;
`;

const TickerWrapper = styled.div`
  display: inline-flex;
  animation: ${scroll} ${props => props.duration}s linear infinite;
`;

const TickerItem = styled.span`
  padding-right: 40px;
  white-space: nowrap;
`;

const TrackTicker = ({ text }) => {
  const [isOverflowing, setIsOverflowing] = useState(false);
  const containerRef = useRef(null);
  const measurerRef = useRef(null);

  useLayoutEffect(() => {
    if (containerRef.current && measurerRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      const contentWidth = measurerRef.current.offsetWidth;

      const shouldScroll = contentWidth > containerWidth;
      setIsOverflowing(prev => (prev !== shouldScroll ? shouldScroll : prev));
    }
  });

  const duration = Math.max(5, text.length * 0.25);

  return (
    <TickerContainer ref={containerRef}>
      <span
        ref={measurerRef}
        style={{
          position: 'absolute',
          visibility: 'hidden',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        {text}
      </span>

      {isOverflowing ? (
        <TickerWrapper duration={duration}>
          <TickerItem>{text}</TickerItem>
          <TickerItem>{text}</TickerItem>
        </TickerWrapper>
      ) : (
        <span>{text}</span>
      )}
    </TickerContainer>
  );
};
export default function MediaPlayer({ filePath }) {
  const vfs = useVFS();

  // Library derived from the filesystem. The reference is kept stable
  // across unrelated VFS changes so playback isn't interrupted when e.g.
  // a text file is saved elsewhere.
  const vfsLibraryRef = useRef({ signature: null, folders: [] });
  const vfsLibrary = useMemo(() => {
    if (!vfs.initialized) return vfsLibraryRef.current.folders;
    const folders = buildVfsLibrary(vfs);
    const signature = folders
      .map(f => `${f.label}:${f.tracks.map(t => t.path).join('|')}`)
      .join('\n');
    if (signature !== vfsLibraryRef.current.signature) {
      vfsLibraryRef.current = { signature, folders };
    }
    return vfsLibraryRef.current.folders;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vfs.initialized, vfs.version]);

  const flatVfsLen = useMemo(
    () => vfsLibrary.reduce((n, f) => n + f.tracks.length, 0),
    [vfsLibrary],
  );

  // Media dropped in from the host browser, or opened from outside the
  // library folders — session-only "Now Playing" entries.
  const [sessionItems, setSessionItems] = useState([]);
  const sessionItemsRef = useRef(sessionItems);
  sessionItemsRef.current = sessionItems;

  const [currentFolder, setCurrentFolder] = useState('My Music');
  const [currentIndex, setCurrentIndex] = useState(0);

  // Playable URLs resolved lazily per track, keyed by VFS path. Object
  // URLs we created are revoked on unmount.
  const [resolvedUrls, setResolvedUrls] = useState({});
  // Tags read out of each file, keyed by path
  const [trackTags, setTrackTags] = useState({});
  const createdUrlsRef = useRef(new Set());
  const failedPathsRef = useRef(new Set());

  useEffect(
    () => () => {
      for (const url of createdUrlsRef.current) {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // best-effort cleanup
        }
      }
    },
    [],
  );

  // If the current tab's folder disappeared (deleted/renamed), fall back.
  useEffect(() => {
    if (!vfs.initialized || currentFolder === 'All Media') return;
    if (!vfsLibrary.some(f => f.label === currentFolder)) {
      setCurrentFolder(vfsLibrary.length ? vfsLibrary[0].label : 'All Media');
      setCurrentIndex(0);
    }
  }, [vfsLibrary, currentFolder, vfs.initialized]);

  // Open a media file from the virtual file system (double-clicked in
  // Explorer, or re-launched with a new filePath while already open)
  const loadedVfsPath = useRef(null);
  useEffect(() => {
    if (!filePath || !vfs.initialized) return;
    if (loadedVfsPath.current === filePath) return;
    loadedVfsPath.current = filePath;
    let cancelled = false;
    (async () => {
      const node = vfs.findNodeCI(filePath);
      if (!node) return;
      const flat = vfsLibraryRef.current.folders.reduce(
        (acc, f) => acc.concat(f.tracks),
        [],
      );
      const inLib = flat.findIndex(
        t => t.path.toLowerCase() === node.path.toLowerCase(),
      );
      if (inLib >= 0) {
        setCurrentFolder('All Media');
        setCurrentIndex(inLib);
      } else {
        const id = `vfs-${node.path}`;
        const existingIdx = sessionItemsRef.current.findIndex(t => t.id === id);
        if (existingIdx >= 0) {
          setCurrentFolder('All Media');
          setCurrentIndex(flat.length + existingIdx);
        } else {
          const url = await vfs.readFileUrl(node.path);
          if (cancelled) return;
          if (!url) {
            console.warn(`Media Player: cannot read ${node.path} — skipping`);
            return;
          }
          if (url.startsWith('blob:')) createdUrlsRef.current.add(url);
          const item = {
            url,
            type: getMediaType(node.name, node.mimeType),
            title: node.name,
            artist: '',
            id,
            session: true,
          };
          const offset = sessionItemsRef.current.length;
          setSessionItems(prev => [...prev, item]);
          setCurrentFolder('All Media');
          setCurrentIndex(flat.length + offset);
        }
      }
      vfs.addRecentDocument(node.path);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePath, vfs.initialized]);

  const playlist = useMemo(() => {
    const toItem = t => {
      // A file's own tags win over its name, like the real player's library
      const tags = trackTags[t.path];
      return {
        url: resolvedUrls[t.path] || '',
        type: t.type,
        title: (tags && tags.title) || t.title,
        artist: (tags && tags.artist) || '',
        album: (tags && tags.album) || '',
        id: t.path,
        vfsPath: t.path,
      };
    };
    if (currentFolder === 'All Media') {
      const allTracks = vfsLibrary.reduce(
        (acc, f) => acc.concat(f.tracks.map(toItem)),
        [],
      );
      return [...allTracks, ...sessionItems];
    }
    const folder = vfsLibrary.find(f => f.label === currentFolder);
    return folder ? folder.tracks.map(toItem) : [];
  }, [vfsLibrary, sessionItems, resolvedUrls, currentFolder, trackTags]);

  // Read each listed track's tags once. Only the header bytes are touched,
  // so scanning a folder is cheap even for large files.
  useEffect(() => {
    if (!vfs.initialized) return undefined;
    const pending = playlist
      .map(it => it.vfsPath)
      .filter(p => p && !(p in trackTags));
    if (pending.length === 0) return undefined;
    let cancelled = false;
    (async () => {
      const found = {};
      for (const p of pending) {
        try {
          const blob = await vfs.readBinaryFile(p);
          // eslint-disable-next-line no-await-in-loop
          found[p] = blob ? (await readMediaTags(blob, p)) || {} : {};
        } catch {
          found[p] = {};
        }
        if (cancelled) return;
      }
      if (!cancelled) setTrackTags(prev => ({ ...prev, ...found }));
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlist, vfs.initialized]);

  // Resolve the current track's URL on demand (blob URLs are expensive,
  // so we never resolve the whole library upfront).
  useEffect(() => {
    const target = playlist[currentIndex];
    if (!target || !target.vfsPath || target.url) return;
    if (failedPathsRef.current.has(target.vfsPath)) return;
    let cancelled = false;
    (async () => {
      const url = await vfs.readFileUrl(target.vfsPath);
      if (cancelled) return;
      if (!url) {
        console.warn(`Media Player: cannot read ${target.vfsPath} — skipping`);
        failedPathsRef.current.add(target.vfsPath);
        const next = playlist.findIndex(
          (it, i) =>
            i !== currentIndex &&
            (it.url || (it.vfsPath && !failedPathsRef.current.has(it.vfsPath))),
        );
        if (next >= 0) setCurrentIndex(next);
        return;
      }
      if (url.startsWith('blob:')) createdUrlsRef.current.add(url);
      setResolvedUrls(prev => ({ ...prev, [target.vfsPath]: url }));
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlist, currentIndex, vfs.initialized]);

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
  const connectedElementRef = useRef(null);

  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  const { isMuted, toggleMute, effectiveVolume } = useVolume();

  const currentItem = playlist[currentIndex] || {
    type: 'audio',
    title: 'No Media',
    url: '',
    id: 'empty-state',
  };
  const isImage = currentItem.type === 'image';

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

  const changeFolder = folderName => {
    if (folderName === currentFolder) return;
    setIsPlaying(false);
    setCurrentIndex(0);
    setCurrentTime(0);
    setCurrentFolder(folderName);
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
      const newItems = files.map(file => {
        const url = URL.createObjectURL(file);
        createdUrlsRef.current.add(url);
        return {
          url,
          type: getMediaType(null, file.type),
          title: file.name,
          artist: '',
          id: `drop-${Math.random()
            .toString(36)
            .substr(2, 9)}`,
          session: true,
        };
      });
      // A dropped File is a Blob, so its tags are readable right here —
      // session items never reach the library's path-keyed tag pass.
      newItems.forEach((item, i) => {
        readMediaTags(files[i], files[i].name)
          .then(tags => {
            if (!tags) return;
            setSessionItems(prev =>
              prev.map(it =>
                it.id === item.id
                  ? {
                      ...it,
                      title: tags.title || it.title,
                      artist: tags.artist || it.artist,
                      album: tags.album || '',
                    }
                  : it,
              ),
            );
          })
          .catch(() => {});
      });
      // Session items only show under "All Media" (library tabs mirror
      // the filesystem)
      setSessionItems(prev => [...prev, ...newItems]);
      setCurrentFolder('All Media');
    }
  };

  const handleSortStart = (e, position) => {
    dragItem.current = position;
    e.dataTransfer.effectAllowed = 'move';
    e.stopPropagation();
  };

  const handleSortEnter = (e, position) => {
    dragOverItem.current = position;
  };

  const handleSortEnd = () => {
    const from = dragItem.current;
    const to = dragOverItem.current;
    dragItem.current = null;
    dragOverItem.current = null;
    if (from == null || to == null || from === to) return;
    // Only session items (the tail of "All Media") are reorderable —
    // library tabs mirror the filesystem and keep its order.
    if (currentFolder !== 'All Media') return;
    const sFrom = from - flatVfsLen;
    const sTo = to - flatVfsLen;
    if (sFrom < 0 || sTo < 0) return;

    const items = [...sessionItemsRef.current];
    const [moved] = items.splice(sFrom, 1);
    items.splice(sTo, 0, moved);

    if (from === currentIndex) {
      setCurrentIndex(to);
    } else if (from < currentIndex && to >= currentIndex) {
      setCurrentIndex(currentIndex - 1);
    } else if (from > currentIndex && to <= currentIndex) {
      setCurrentIndex(currentIndex + 1);
    }

    setSessionItems(items);
  };

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
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const sampleRate = audioContextRef.current
      ? audioContextRef.current.sampleRate
      : 44100;
    const nyquist = sampleRate / 2;
    const maxFreq = 20000;
    const meaningfulBins = Math.floor((maxFreq / nyquist) * bufferLength);
    const binsToDraw = Math.max(1, Math.min(bufferLength, meaningfulBins));

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = canvas.width / binsToDraw;
      const gap = barWidth > 3 ? 1 : 0;

      let x = 0;

      for (let i = 0; i < binsToDraw; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#004e92');
        gradient.addColorStop(1, '#50cc7f');
        ctx.fillStyle = gradient;

        const drawWidth = Math.max(0.1, barWidth - gap);

        ctx.fillRect(x, canvas.height - barHeight, drawWidth, barHeight);
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
        analyserRef.current.fftSize = 2048;
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
    } catch (e) {}
  }, [currentItem.type, drawSpectrum]);

  // Refs keep the latest gains reachable from the mount callback below
  const effectiveVolumeRef = useRef(effectiveVolume);
  effectiveVolumeRef.current = effectiveVolume;
  const localVolumeRef = useRef(localVolume);
  localVolumeRef.current = localVolume;

  const setMediaRef = useCallback(el => {
    mediaRef.current = el;
    if (el) {
      el.volume = effectiveVolumeRef.current * localVolumeRef.current;
      el.muted = effectiveVolumeRef.current === 0;
    }
  }, []);

  useEffect(() => {
    if (mediaRef.current && !isImage) {
      // effectiveVolume already folds in master, Wave and both mutes
      mediaRef.current.volume = effectiveVolume * localVolume;
      mediaRef.current.muted = effectiveVolume === 0;
    }
  }, [effectiveVolume, localVolume, isImage, currentItem.id]);

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

  const renderMedia = () => {
    if (!currentItem.url) return <VisualizerContainer />;

    const commonProps = {
      key: currentItem.id || currentItem.url,
      // Track changes REMOUNT the element (fresh volume 1.0!) — the ref
      // callback stamps the mixer volume before anything can play loud
      ref: setMediaRef,
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

  const titleText = playlist.length
    ? `${currentIndex + 1}. ${
        currentItem.artist ? `${currentItem.artist} - ` : ''
      }${currentItem.title}`
    : 'Waiting for media...';

  return (
    <PlayerContainer
      ref={containerRef}
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
    >
      <TopTitleBar>
        <TrackTicker text={titleText} />
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
            <XPTooltip text="Previous">
              <MediaBtn onClick={prevTrack}>⏮</MediaBtn>
            </XPTooltip>
            <XPTooltip text="Stop">
              <MediaBtn onClick={stop} disabled={isImage}>
                ⏹
              </MediaBtn>
            </XPTooltip>

            <XPTooltip text={isPlaying ? 'Pause' : 'Play'}>
              <MediaBtn
                onClick={togglePlay}
                active={isPlaying}
                disabled={isImage}
                style={{ fontSize: '18px', width: '36px', height: '36px' }}
              >
                {isPlaying ? '⏸' : '▶'}
              </MediaBtn>
            </XPTooltip>

            <XPTooltip text="Next">
              <MediaBtn onClick={nextTrack}>⏭</MediaBtn>
            </XPTooltip>

            <XPTooltip text="Loop">
              <MediaBtn
                onClick={() => setIsLooping(!isLooping)}
                active={isLooping}
                disabled={isImage}
              >
                <LoopIcon />
              </MediaBtn>
            </XPTooltip>
          </MainControls>

          <SideControls>
            <VolumeContainer>
              <XPTooltip text="Mute">
                <MuteBtn onClick={toggleMute}>
                  <SpeakerIcon muted={isMuted || localVolume === 0} />
                </MuteBtn>
              </XPTooltip>
              <XPTooltip text="Volume">
                <VolumeSlider
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={localVolume}
                  onChange={e => setLocalVolume(parseFloat(e.target.value))}
                />
              </XPTooltip>
            </VolumeContainer>
            <XPTooltip text="Playlist">
              <MediaBtn
                onClick={() => setShowPlaylist(!showPlaylist)}
                active={showPlaylist}
              >
                <PlaylistIcon />
              </MediaBtn>
            </XPTooltip>
          </SideControls>
        </ButtonRow>
      </ControlDeck>

      {showPlaylist && (
        <PlaylistContainer>
          <FolderBar>
            {vfsLibrary.map((folder, idx) => (
              <FolderTab
                key={`${folder.label}-${idx}`}
                active={folder.label === currentFolder}
                onClick={() => changeFolder(folder.label)}
              >
                {folder.label}
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
                draggable={!!item.session}
                onDragStart={e => handleSortStart(e, i)}
                onDragEnter={e => handleSortEnter(e, i)}
                onDragEnd={handleSortEnd}
                onDragOver={e => e.preventDefault()}
                style={{
                  cursor: item.session ? 'grab' : 'pointer',
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
                  {item.session && (
                    <span style={{ opacity: 0.5, fontSize: '10px' }}>☰</span>
                  )}
                  <ItemTitle>
                    {i + 1}. {item.artist ? `${item.artist} - ` : ''}
                    {item.title}
                  </ItemTitle>
                </div>
                {item.session && (
                  <DeleteBtn
                    onClick={e => {
                      e.stopPropagation();
                      setSessionItems(prev =>
                        prev.filter(t => t.id !== item.id),
                      );
                      if (i < currentIndex) setCurrentIndex(c => c - 1);
                    }}
                  >
                    ×
                  </DeleteBtn>
                )}
              </PlaylistItem>
            ))}

            <PermanentDropHint>
              <span>+</span> Drag & Drop Media Here
            </PermanentDropHint>
          </PlaylistItems>
        </PlaylistContainer>
      )}
    </PlayerContainer>
  );
}

const formatTime = t => {
  if (!t) return '0:00';
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s < 10 ? '0' + s : s}`;
};

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
  overflow: hidden;
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
