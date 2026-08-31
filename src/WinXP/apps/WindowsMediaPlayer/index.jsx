/*
 * Windows Media Player 8 — the player that shipped in the Windows XP box
 * (wmplayer.exe, "Windows Media Player for Windows XP", 8.00.00.4477).
 *
 * The chrome is the real chrome: the bitmaps under ./skin came out of
 * WMPLOC.DLL on the XP RTM disc, and the geometry, tooltips, captions and
 * marquee formats come from that same DLL's own skin definition and string
 * table rather than from anyone's memory of the app. Behind it, playback is
 * wired to the virtual file system, the shared media-tag reader and the
 * system mixer.
 *
 * The earlier, simpler player is still installed alongside this one as
 * mplayer2.exe, which is where XP kept its own older player too.
 */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { WindowDropDowns } from 'components';
import XPTooltip from 'components/XPTooltip';
import ContextMenu from '../../../components/ContextMenu';
import FileDialog from '../../../components/FileDialog';
import OptionsDialog from './OptionsDialog';
import PropertiesDialog from '../../../components/PropertiesDialog';
import { useSplitter } from '../../../components/ListView';
import { useDialog } from '../../../context/DialogContext';
import { useVolume } from '../../../context/VolumeContext';
import { useVFS } from '../../../context/VFSContext';
import { getCurrentUserName } from '../../../context/users';
import { readMediaTags } from '../../../context/mediaTags';
import {
  readAllTagEdits,
  saveTagEdits,
  applyEditsTo,
} from '../../../context/tagOverrides';
import { SPECIAL_FOLDERS } from '../../../context/vfsConstants';
import { getBaseName } from '../../../context/vfsUtils';

import buildMenus from './menuData';
import {
  buildTrackMenuItems,
  buildTreeMenuItems,
  buildVizMenuItems,
} from './menus';
import {
  CD_DRIVE,
  FEATURES,
  MARQUEE_PERIOD,
  OPEN_FILTERS,
  PLAYLIST_W,
} from './constants';
import {
  ALBUM_ART,
  DEFAULT_VIZ,
  NO_VIZ,
  VIZ_PRESETS,
  drawViz,
  resolveViz,
} from './visualizations';
import {
  decorate,
  formatElapsed,
  formatTime,
  MEDIA_EXTENSIONS,
  mediaKind,
  searchForMedia,
  trackForPath,
} from './library';
import { resolveAlbumArt } from './albumArt';
import {
  playlistDir,
  addToPlaylist,
  readPlaylist,
  savePlaylist,
  createPlaylist,
  listPlaylists,
  playlistTracks,
  removeFromPlaylist,
  validatePlaylistName,
} from './playlists';
import {
  CopyFromCD,
  CopyToCD,
  MediaGuide,
  MediaLibrary,
  RadioTuner,
  SkinChooser,
} from './views';
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
  ScrollDown,
  ScrollUp,
  M,
  Marquee,
  SkinBtn,
  Slider,
  TaskButtons,
  TaskCaption,
  TaskGroup,
  TaskHandle,
  TaskHit,
  TaskRow,
  TopLeft,
  TopLeftHide,
  TopRight,
  Transport,
  WindowsBrand,
} from './chrome';
import {
  DropdownList,
  NowPlayingRoot,
  PlaylistDropdown,
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
import GroupHalf from './buttons';

import playUp from './skin/play_btn_up.png';
import playHover from './skin/play_btn_hover.png';
import playDown from './skin/play_btn_down.png';
import pauseUp from './skin/play_pause_btn_up.png';
import pauseHover from './skin/play_pause_btn_hover.png';
import pauseDown from './skin/play_pause_btn_down.png';
import stopUp from './skin/stop_btn_up.png';
import stopHover from './skin/stop_btn_hover.png';
import stopDown from './skin/stop_btn_down.png';
import rewUp from './skin/rewind_btn_up.png';
import rewHover from './skin/rewind_btn_hover.png';
import rewDown from './skin/rewind_btn_down.png';
import ffUp from './skin/fastforward_btn_up.png';
import ffHover from './skin/fastforward_btn_hover.png';
import ffDown from './skin/fastforward_btn_down.png';
import soundUp from './skin/sound_btn_up.png';
import soundHover from './skin/sound_btn_hover.png';
import soundDown from './skin/sound_btn_down.png';
import seekBkg from './skin/seek_sldr_bkg.png';
import seekFore from './skin/seek_sldr_fore.png';
import seekThumbUp from './skin/seek_thumb_up.png';
import volBkg from './skin/vol_sldr_bkg.png';
import volFore from './skin/vol_sldr_fore.png';
import volThumbUp from './skin/vol_thumb_up.png';
import skinUp from './skin/skinmode_btn_up.png';
import skinHover from './skin/skinmode_btn_hover.png';
import skinDown from './skin/skinmode_btn_down.png';
import loopUp from './skin/loopbtnup.png';
import loopHover from './skin/loopbtnhover.png';
import loopAllOn from './skin/loopbtndown.png';
import loopAllOnHover from './skin/loopbtndownhover.png';
import loopOneOn from './skin/looponebtndown.png';
import loopOneOnHover from './skin/looponebtndownhover.png';
import shuffleUp from './skin/appshufflebtnup.png';
import shuffleHover from './skin/appshufflebtnhover.png';
import shuffleOn from './skin/appshufflebtndown.png';
import shuffleOnHover from './skin/appshufflebtndownhover.png';
import eqUp from './skin/appeqbtnup.png';
import eqHover from './skin/appeqbtnhover.png';
import eqOn from './skin/appeqbtndown.png';
import eqOnHover from './skin/appeqbtndownhover.png';
import plUp from './skin/appplaylistbtnup.png';
import plHover from './skin/appplaylistbtnhover.png';
import plOn from './skin/appplaylistbtndown.png';
import plOnHover from './skin/appplaylistbtndownhover.png';
import autoUp from './skin/appautohidebtnup.png';
import autoHover from './skin/appautohidebtnhover.png';
import autoOn from './skin/appautohidebtndown.png';
import autoOnHover from './skin/appautohidebtndownhover.png';
import vizSwitchUp from './skin/vizpulldown_up.png';
import vizSwitchHover from './skin/vizpulldown_hover.png';
import vizPrevUp from './skin/vizprev_up.png';
import vizPrevHover from './skin/vizprev_hover.png';
import vizPrevDown from './skin/vizprev_down.png';
import vizNextUp from './skin/viznext_up.png';
import vizNextHover from './skin/viznext_hover.png';
import vizNextDown from './skin/viznext_down.png';
import fullUp from './skin/fullscreen_up.png';
import fullHover from './skin/fullscreen_hover.png';
import fullDown from './skin/fullscreen_down.png';
import statePlaying from './skin/state_playing.gif';
import statePaused from './skin/state_paused.gif';
import stateStopped from './skin/state_stopped.gif';

export default function WindowsMediaPlayer({ filePath, onClose }) {
  const vfs = useVFS();
  const { isMuted, toggleMute, effectiveVolume } = useVolume();
  const { alert, confirm, prompt } = useDialog();

  /* ---- library ---------------------------------------------------------- */

  // What the user has put in the library, as VFS paths, kept in their
  // profile. Empty to begin with: the player asks before it goes looking.
  const [libraryPaths, setLibraryPaths] = useState(null);
  const [askedToSearch, setAskedToSearch] = useState(false);
  // Entries taken out of the library. They are not gone: the Deleted Items
  // branch keeps them so they can be put back.
  const [deletedPaths, setDeletedPaths] = useState([]);
  const [options, setOptions] = useState({
    addPlayedToLibrary: false,
    startInMediaGuide: false,
    showTitleBar: true,
  });

  // Follows the hive rather than loading once: renaming a track in Explorer
  // or the tag editor repaths the stored lists, and a player that kept its
  // first copy would write the stale one straight back over the fix.
  useEffect(() => {
    if (!vfs.initialized || !vfs.getUserConfig) return;
    const same = (a, b) =>
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((p, i) => p === b[i]);
    const saved = vfs.getUserConfig('mediaLibrary', null);
    setLibraryPaths(prev => {
      const next = Array.isArray(saved) ? saved : [];
      return same(prev, next) ? prev : next;
    });
    if (libraryPaths === null) setAskedToSearch(Array.isArray(saved));
    const bin = vfs.getUserConfig('mediaLibraryDeleted', null);
    setDeletedPaths(prev => {
      const next = Array.isArray(bin) ? bin : [];
      return same(prev, next) ? prev : next;
    });
    if (libraryPaths === null) {
      const opts = vfs.getUserConfig('wmpOptions', null);
      if (opts) setOptions(prev => ({ ...prev, ...opts }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vfs.initialized, vfs.version]);

  useEffect(() => {
    if (appliedStartTask.current || !vfs.initialized) return;
    appliedStartTask.current = true;
    if (options.startInMediaGuide) setTask('MediaGuide');
  }, [vfs.initialized, options.startInMediaGuide]);

  const storeDeleted = useCallback(
    next => {
      setDeletedPaths(next);
      if (vfs.initialized && vfs.setUserConfig)
        vfs.setUserConfig('mediaLibraryDeleted', next);
    },
    [vfs],
  );

  const setOption = useCallback(
    (key, value) => {
      setOptions(prev => {
        const next = { ...prev, [key]: value };
        if (vfs.initialized && vfs.setUserConfig)
          vfs.setUserConfig('wmpOptions', next);
        return next;
      });
    },
    [vfs],
  );

  const storeLibrary = useCallback(
    next => {
      setLibraryPaths(next);
      if (vfs.initialized && vfs.setUserConfig)
        vfs.setUserConfig('mediaLibrary', next);
    },
    [vfs],
  );

  const addToLibrary = useCallback(
    paths => {
      const wanted = (Array.isArray(paths) ? paths : [paths]).filter(Boolean);
      if (!wanted.length) return 0;
      const have = new Set((libraryPaths || []).map(p => p.toLowerCase()));
      const fresh = wanted.filter(p => !have.has(p.toLowerCase()));
      if (fresh.length) storeLibrary([...(libraryPaths || []), ...fresh]);
      const back = new Set(wanted.map(p => p.toLowerCase()));
      if (deletedPaths.some(p => back.has(p.toLowerCase())))
        storeDeleted(deletedPaths.filter(p => !back.has(p.toLowerCase())));
      return fresh.length;
    },
    [libraryPaths, storeLibrary, deletedPaths, storeDeleted],
  );

  /** Take entries out of the library and drop them in Deleted Items. */
  const removeFromLibrary = useCallback(
    paths => {
      const gone = new Set(paths.map(p => p.toLowerCase()));
      storeLibrary(
        (libraryPaths || []).filter(p => !gone.has(p.toLowerCase())),
      );
      const already = new Set(deletedPaths.map(p => p.toLowerCase()));
      storeDeleted([
        ...deletedPaths,
        ...paths.filter(p => !already.has(p.toLowerCase())),
      ]);
    },
    [libraryPaths, storeLibrary, deletedPaths, storeDeleted],
  );

  const rawLibrary = useMemo(() => {
    if (!vfs.initialized || !libraryPaths) return [];
    return libraryPaths.map(p => trackForPath(vfs, p)).filter(Boolean);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [libraryPaths, vfs.initialized, vfs.version]);

  const [tags, setTags] = useState({});
  // Tags the user has typed over the file's own, keyed by lower-cased
  // path; null until the profile has been read.
  const [tagEdits, setTagEdits] = useState(null);

  useEffect(() => {
    if (!vfs.initialized) return;
    const next = readAllTagEdits(vfs);
    setTagEdits(prev =>
      prev !== null && JSON.stringify(prev) === JSON.stringify(next)
        ? prev
        : next,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vfs.initialized, vfs.version]);

  const [durations, setDurations] = useState({});
  const [urls, setUrls] = useState({});
  const [session, setSession] = useState([]);
  const createdUrls = useRef(new Set());
  const failed = useRef(new Set());

  useEffect(
    () => () => {
      for (const url of createdUrls.current) {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // best-effort cleanup
        }
      }
    },
    [],
  );

  // What the file says, with anything the user has typed laid over it.
  const effectiveTags = useMemo(() => {
    const edits = tagEdits || {};
    if (!Object.keys(edits).length) return tags;
    const out = { ...tags };
    const paths = new Set([
      ...Object.keys(tags),
      ...(libraryPaths || []),
      ...deletedPaths,
    ]);
    for (const path of paths) {
      const edit = edits[path.toLowerCase()];
      if (edit) out[path] = { ...(out[path] || {}), ...edit };
    }
    return out;
  }, [tags, tagEdits, libraryPaths, deletedPaths]);

  /** Set one tag field across a set of files, the way "Edit" did. */
  const editTags = useCallback(
    (paths, field, value) => {
      const next = applyEditsTo(tagEdits || {}, paths, { [field]: value });
      setTagEdits(next);
      saveTagEdits(vfs, next);
    },
    [tagEdits, vfs],
  );

  const library = useMemo(
    () =>
      [...rawLibrary, ...session].map(track => ({
        ...decorate(track, effectiveTags),
        duration: durations[track.path] || 0,
        url: urls[track.path] || '',
      })),
    [rawLibrary, session, effectiveTags, durations, urls],
  );

  // Everything above is what the player knows about; this is what has been
  // filed in the library. An opened file is playable without being either.
  const libraryTracks = useMemo(() => {
    const inLibrary = new Set((libraryPaths || []).map(p => p.toLowerCase()));
    return library.filter(t => inLibrary.has(t.path.toLowerCase()));
  }, [library, libraryPaths]);

  const deletedTracks = useMemo(() => {
    if (!vfs.initialized) return [];
    return deletedPaths
      .map(p => trackForPath(vfs, p))
      .filter(Boolean)
      .map(t => ({
        ...decorate(t, effectiveTags),
        duration: durations[t.path] || 0,
      }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deletedPaths, effectiveTags, durations, vfs.initialized, vfs.version]);

  // Saved playlists live in the file system, so they refresh with it.
  // A playlist opened from somewhere other than My Playlists joins the list
  // for as long as the player is open.
  const [openedPlaylist, setOpenedPlaylist] = useState(null);

  const playlists = useMemo(() => {
    if (!vfs.initialized) return [];
    const saved = listPlaylists(vfs);
    if (openedPlaylist && !saved.some(p => p.path === openedPlaylist.path))
      return [...saved, openedPlaylist];
    return saved;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vfs.initialized, vfs.version, openedPlaylist]);

  const resolveUrl = useCallback(
    async path => {
      if (urls[path] || failed.current.has(path)) return urls[path] || '';
      const url = await vfs.readFileUrl(path);
      if (!url) {
        failed.current.add(path);
        return '';
      }
      if (url.startsWith('blob:')) createdUrls.current.add(url);
      setUrls(prev => (prev[path] ? prev : { ...prev, [path]: url }));
      return url;
    },
    [urls, vfs],
  );

  // Tags first — only the header bytes are read, so a whole folder is cheap.
  useEffect(() => {
    if (!vfs.initialized) return undefined;
    const pending = library.filter(t => !(t.path in tags)).map(t => t.path);
    if (!pending.length) return undefined;
    let cancelled = false;
    (async () => {
      const found = {};
      for (const path of pending) {
        try {
          // eslint-disable-next-line no-await-in-loop
          const blob = await vfs.openBinaryFile(path);
          // eslint-disable-next-line no-await-in-loop
          found[path] = blob ? (await readMediaTags(blob, path)) || {} : {};
        } catch {
          found[path] = {};
        }
        if (cancelled) return;
      }
      setTags(prev => ({ ...prev, ...found }));
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [library, vfs.initialized]);

  // Lengths are not in the tags, so each file gets opened once in the
  // background to read its duration — what the real library did on import.
  useEffect(() => {
    if (!vfs.initialized) return undefined;
    const next = library.find(
      t => !(t.path in durations) && !failed.current.has(t.path),
    );
    if (!next) return undefined;
    let cancelled = false;
    (async () => {
      const url = await resolveUrl(next.path);
      if (cancelled) return;
      if (!url) {
        setDurations(prev => ({ ...prev, [next.path]: 0 }));
        return;
      }
      const probe = document.createElement('audio');
      probe.preload = 'metadata';
      const done = seconds => {
        if (!cancelled)
          setDurations(prev => ({ ...prev, [next.path]: seconds }));
      };
      probe.onloadedmetadata = () =>
        done(isFinite(probe.duration) ? probe.duration : 0);
      probe.onerror = () => done(0);
      probe.src = url;
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [library, durations, vfs.initialized, resolveUrl]);

  /* ---- state ------------------------------------------------------------ */

  const [task, setTask] = useState('NowPlaying');
  const appliedStartTask = useRef(false);
  const [taskbar, setTaskbar] = useState(true);
  const [menuBar, setMenuBar] = useState(true);
  const [showPlaylist, setShowPlaylist] = useState(true);
  const [showEqualizer, setShowEqualizer] = useState(false);

  const [visualization, setVisualization] = useState(DEFAULT_VIZ);
  const [videoSize, setVideoSize] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  // off -> whole playlist -> single track, like most players
  const [repeatMode, setRepeatMode] = useState('off');
  const [playlistName, setPlaylistName] = useState('All Audio');
  // A file opened by hand becomes the whole Now Playing list on its own.
  const [opened, setOpened] = useState(null);
  const [currentId, setCurrentId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [localVolume, setLocalVolume] = useState(1);
  const [marqueeField, setMarqueeField] = useState(0);
  const [comboOpen, setComboOpen] = useState(false);
  const [vizMenu, setVizMenu] = useState(null);
  const [fileDialog, setFileDialog] = useState(null);
  const [propertiesPath, setPropertiesPath] = useState(null);
  const [treeMenu, setTreeMenu] = useState(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [offline, setOffline] = useState(true);
  // The divider between the video and the playlist is draggable, as it is in
  // the real player.
  const nowPlayingRef = useRef(null);
  const playlistPane = useSplitter({
    key: 'wmp.playlist',
    initial: PLAYLIST_W,
    edge: 'end',
    boundsRef: nowPlayingRef,
  });

  const queue = useMemo(() => {
    if (opened && playlistName === opened.label) {
      const byPath = new Map(
        [...library, ...deletedTracks].map(t => [t.path, t]),
      );
      return opened.paths.map(p => byPath.get(p)).filter(Boolean);
    }
    if (playlistName === 'All Clips')
      return libraryTracks.filter(t => t.kind === 'video');
    if (playlistName === 'All Audio')
      return libraryTracks.filter(t => t.kind === 'audio');
    const saved = playlists.find(p => p.name === playlistName);
    if (saved) return playlistTracks(vfs, saved.path, library);
    return libraryTracks.filter(t => t.kind === 'audio');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    library,
    libraryTracks,
    deletedTracks,
    opened,
    playlistName,
    playlists,
    vfs.version,
  ]);

  const currentIndex = Math.max(
    0,
    queue.findIndex(t => t.id === currentId),
  );
  const current = queue[currentIndex] || null;
  // remote paths whose host turned out not to allow cross-origin reads
  const [corsBlocked, setCorsBlocked] = useState({});
  const isVideo = current ? current.kind === 'video' : false;
  // Reading a remote track's samples needs crossOrigin="anonymous", and a
  // host that does not answer with CORS headers refuses that request flat.
  // So try it that way first — hosts that do allow it get visualizations —
  // and only on failure fall back to a plain element, which plays but can
  // never be analysed. The element is keyed on that choice so the fallback
  // gets a genuinely fresh node: once one is wired into the audio graph, a
  // cross-origin file can only come out silent through it.
  const isRemote = current ? current.path.startsWith('url:') : false;
  const corsDenied = isRemote && !!corsBlocked[current.path];
  const mediaMode = !isRemote ? 'local' : corsDenied ? 'remote' : 'remote-cors';
  const graphed = !corsDenied;
  const totalTime = useMemo(
    () => queue.reduce((sum, t) => sum + (t.duration || 0), 0),
    [queue],
  );

  /* ---- playback --------------------------------------------------------- */

  const mediaRef = useRef(null);
  const canvasRef = useRef(null);
  const screenRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const rafRef = useRef(null);
  const wantPlayRef = useRef(false);

  useEffect(() => {
    if (current && !current.url) resolveUrl(current.path);
  }, [current, resolveUrl]);

  useEffect(() => {
    if (!currentId && queue.length) setCurrentId(queue[0].id);
  }, [queue, currentId]);

  const openedRef = useRef(null);
  const [openedFile, setOpenedFile] = useState(null);
  const activeFile = openedFile || filePath;
  useEffect(() => {
    if (!activeFile || !vfs.initialized || openedRef.current === activeFile)
      return;
    openedRef.current = activeFile;
    const node = vfs.findNodeCI(activeFile);
    if (!node) return;
    if (/\.m3u$/i.test(node.name)) {
      // a playlist is a list to play, not something to play
      const name = node.name.replace(/\.m3u$/i, '');
      const parent = node.path.slice(0, node.path.lastIndexOf('/'));
      if (parent.toLowerCase() !== playlistDir().toLowerCase())
        setOpenedPlaylist({ name, path: node.path });
      setPlaylistName(name);
      setCurrentId(null);
      wantPlayRef.current = true;
      vfs.addRecentDocument(node.path);
      return;
    }
    const known = rawLibrary.some(
      t => t.path.toLowerCase() === node.path.toLowerCase(),
    );
    const title = node.name.replace(/\.[^.]+$/, '');
    if (!known) {
      setSession(prev =>
        prev.some(t => t.path === node.path)
          ? prev
          : [
              ...prev,
              {
                path: node.path,
                name: node.name,
                title,
                kind: mediaKind(node.name),
              },
            ],
      );
    }
    // Opening a file plays that file — it does not join the library, and it
    // does not drag the rest of the library into Now Playing with it.
    setOpened({ label: title, paths: [node.path] });
    setPlaylistName(title);
    setCurrentId(node.path);
    wantPlayRef.current = true;
    vfs.addRecentDocument(node.path);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFile, vfs.initialized, rawLibrary]);

  const setupGraph = useCallback(() => {
    const el = mediaRef.current;
    if (!el || el.dataset.ungraphed === 'true') return;
    try {
      if (!audioCtxRef.current) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        audioCtxRef.current = new Ctx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      if (!analyserRef.current) {
        analyserRef.current = ctx.createAnalyser();
        analyserRef.current.fftSize = 2048;
      }
      if (!sourceRef.current) {
        sourceRef.current = ctx.createMediaElementSource(el);
        sourceRef.current.connect(analyserRef.current);
        analyserRef.current.connect(ctx.destination);
      }
    } catch {
      // no Web Audio available — playback still works, just no spectrum
    }
  }, []);

  // Tools > Options: file what gets played, if that is switched on
  useEffect(() => {
    if (!options.addPlayedToLibrary || !isPlaying || !current) return;
    if (current.path.startsWith('url:')) return;
    addToLibrary([current.path]);
  }, [options.addPlayedToLibrary, isPlaying, current, addToLibrary]);

  const play = useCallback(async () => {
    const el = mediaRef.current;
    if (!el || !el.src) return;
    setupGraph();
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended')
      await audioCtxRef.current.resume();
    try {
      await el.play();
    } catch {
      setIsPlaying(false);
    }
  }, [setupGraph]);

  const togglePlay = useCallback(() => {
    const el = mediaRef.current;
    if (!el) return;
    if (el.paused) play();
    else el.pause();
  }, [play]);

  const stop = useCallback(() => {
    const el = mediaRef.current;
    if (!el) return;
    el.pause();
    el.currentTime = 0;
    setCurrentTime(0);
    wantPlayRef.current = false;
  }, []);

  const step = useCallback(
    delta => {
      if (!queue.length) return;
      if (shuffle && queue.length > 1) {
        let next = currentIndex;
        while (next === currentIndex)
          next = Math.floor(Math.random() * queue.length);
        setCurrentId(queue[next].id);
        return;
      }
      setCurrentId(
        queue[(currentIndex + delta + queue.length) % queue.length].id,
      );
    },
    [queue, currentIndex, shuffle],
  );

  const nudge = useCallback(seconds => {
    const el = mediaRef.current;
    if (!el || !isFinite(el.duration)) return;
    el.currentTime = Math.min(
      el.duration,
      Math.max(0, el.currentTime + seconds),
    );
  }, []);

  const onEnded = () => {
    if (repeatMode === 'one') {
      const el = mediaRef.current;
      if (el) {
        el.currentTime = 0;
        play();
      }
      return;
    }
    if (!shuffle && currentIndex >= queue.length - 1) {
      if (repeatMode === 'all' && queue.length) {
        setCurrentId(queue[0].id);
        return;
      }
      setIsPlaying(false);
      wantPlayRef.current = false;
      return;
    }
    step(1);
  };

  // Load the current track, and carry playback across a track change.
  const applySource = useCallback(
    el => {
      if (!el || !current || !current.url) return;
      if (el.getAttribute('src') === current.url) return;
      el.src = current.url;
      el.load();
      setCurrentTime(0);
      setDuration(current.duration || 0);
      if (wantPlayRef.current) play();
    },
    [current, play],
  );
  useEffect(() => applySource(mediaRef.current), [applySource]);
  const setMediaRef = useCallback(
    el => {
      // React clears a changing ref callback with null before every
      // re-attach. Tearing the audio graph down on that would sever it on
      // each track change, and a second createMediaElementSource on the same
      // element throws — which is silence from the second track onwards.
      if (!el) return;
      if (mediaRef.current && mediaRef.current !== el && sourceRef.current) {
        // a genuinely different element: the old node belonged to the old one
        try {
          sourceRef.current.disconnect();
        } catch {
          // already detached
        }
        sourceRef.current = null;
      }
      mediaRef.current = el;
      applySource(el);
    },
    [applySource],
  );

  // One loop drives the visualization while the Now Playing pane is up.
  // It also tells the visualization whether the player is actually playing
  // — a scene that opens and closes with the music must not mistake a quiet
  // passage for the end of the track.
  const playingRef = useRef(false);
  playingRef.current = isPlaying;
  // ...and how many of ROOM_MAN's eggs this user has: one visualization
  // has a use for that, and the hive is the only place it is written
  const eggsRef = useRef(0);
  // ...and where the pointer is on the canvas, in canvas pixels, for a
  // visualization that lets you push its things around
  const pointerRef = useRef({ x: 0, y: 0, down: false, inside: false });
  const trackPointer = e => {
    const c = canvasRef.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    pointerRef.current.x = ((e.clientX - r.left) / r.width) * c.width;
    pointerRef.current.y = ((e.clientY - r.top) / r.height) * c.height;
    pointerRef.current.inside = true;
  };
  try {
    const eggs = vfs.getUserConfigFor(getCurrentUserName(), 'eggData', null);
    eggsRef.current = Array.isArray(eggs) ? eggs.length : 0;
  } catch {
    eggsRef.current = 0;
  }
  useEffect(() => {
    if (task !== 'NowPlaying') return undefined;
    const viz = resolveViz(visualization);
    if (viz.kind === 'none' || viz.kind === 'albumart') {
      // No Visualization and Album Art draw nothing, so wipe whatever the
      // last one left behind instead of freezing its final frame.
      const canvas = canvasRef.current;
      if (canvas) {
        const c2d = canvas.getContext('2d');
        c2d.setTransform(1, 0, 0, 1, 0, 0);
        c2d.clearRect(0, 0, canvas.width, canvas.height);
        c2d.fillStyle = '#000';
        c2d.fillRect(0, 0, canvas.width, canvas.height);
      }
      return undefined;
    }
    let freq = null;
    let wave = null;
    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!w || !h) return;
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;
      const analyser = analyserRef.current;
      if (analyser) {
        if (!freq || freq.length !== analyser.frequencyBinCount) {
          freq = new Uint8Array(analyser.frequencyBinCount);
          wave = new Uint8Array(analyser.fftSize);
        }
        analyser.getByteFrequencyData(freq);
        analyser.getByteTimeDomainData(wave);
      }
      drawViz(canvas.getContext('2d'), viz, freq, wave, {
        playing: playingRef.current,
        eggs: eggsRef.current,
        pointer: pointerRef.current,
      });
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [task, visualization]);

  // The mixer owns the master level; the deck slider is the player's own.
  useEffect(() => {
    const el = mediaRef.current;
    if (!el) return;
    el.volume = effectiveVolume * localVolume;
    el.muted = effectiveVolume === 0;
  }, [effectiveVolume, localVolume, current]);

  // The skin rotates the marquee's metadata line every four seconds.
  useEffect(() => {
    const timer = setInterval(
      () => setMarqueeField(f => f + 1),
      MARQUEE_PERIOD,
    );
    return () => clearInterval(timer);
  }, []);

  /* ---- album art -------------------------------------------------------- */

  const [artUrls, setArtUrls] = useState({});
  const artUrl = current ? artUrls[current.path] : undefined;

  useEffect(() => {
    if (!current || !vfs.initialized) return undefined;
    if (current.path in artUrls) return undefined;
    // wait for the tags, so an embedded picture wins over a folder cover
    if (!(current.path in tags)) return undefined;
    let cancelled = false;
    (async () => {
      const url = await resolveAlbumArt(vfs, current, tags, created =>
        createdUrls.current.add(created),
      );
      if (!cancelled) setArtUrls(prev => ({ ...prev, [current.path]: url }));
    })();
    return () => {
      cancelled = true;
    };
  }, [current, tags, artUrls, vfs]);

  /* ---- sliders ---------------------------------------------------------- */

  const seekRef = useRef(null);
  const volumeRef = useRef(null);

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

  const progress = duration ? Math.min(1, currentTime / duration) : 0;

  /* ---- playlists -------------------------------------------------------- */

  const [menu, setMenu] = useState(null);

  /** File > New Playlist... — loops until the name is usable or cancelled. */
  const newPlaylist = useCallback(
    async (seedTracks = []) => {
      let suggestion = 'New Playlist';
      for (;;) {
        // eslint-disable-next-line no-await-in-loop
        const name = await prompt(
          'Enter the new playlist name:',
          suggestion,
          'New Playlist',
        );
        if (name === null) return null;
        const problem = validatePlaylistName(vfs, name);
        if (problem) {
          suggestion = name;
          // eslint-disable-next-line no-await-in-loop
          await alert(problem, 'Windows Media Player');
          continue;
        }
        const created = createPlaylist(vfs, name);
        if (seedTracks.length)
          addToPlaylist(
            vfs,
            created.path,
            seedTracks.map(t => t.path),
            library,
          );
        return created;
      }
    },
    [alert, prompt, vfs, library],
  );

  const deletePlaylist = useCallback(
    async playlist => {
      const ok = await confirm(
        `Are you sure you want to delete "${playlist.name}" from your library?`,
        'Windows Media Player',
      );
      if (!ok) return false;
      vfs.deleteNode(playlist.path);
      setPlaylistName(prev => (prev === playlist.name ? 'All Audio' : prev));
      return true;
    },
    [confirm, vfs],
  );

  const renamePlaylist = useCallback(
    async playlist => {
      let suggestion = playlist.name;
      for (;;) {
        // eslint-disable-next-line no-await-in-loop
        const name = await prompt(
          'Enter the new playlist name:',
          suggestion,
          'Rename Playlist',
        );
        if (name === null) return;
        const trimmed = String(name).trim();
        if (trimmed === playlist.name) return;
        const problem = validatePlaylistName(vfs, trimmed);
        if (problem) {
          suggestion = name;
          // eslint-disable-next-line no-await-in-loop
          await alert(problem, 'Windows Media Player');
          continue;
        }
        vfs.rename(playlist.path, `${trimmed}.m3u`);
        setPlaylistName(prev => (prev === playlist.name ? trimmed : prev));
        return;
      }
    },
    [alert, prompt, vfs],
  );

  const emptyDeleted = useCallback(async () => {
    const ok = await confirm(
      'Are you sure you want to remove all deleted media from the library?',
      'Windows Media Player',
    );
    if (ok) storeDeleted([]);
  }, [confirm, storeDeleted]);

  /** The menu behind a right-click on a track, wherever it is listed. */
  const openTrackMenu = useCallback(
    (event, tracksOrTrack, context = {}) => {
      event.preventDefault();
      const tracks = Array.isArray(tracksOrTrack)
        ? tracksOrTrack
        : [tracksOrTrack];
      const items = buildTrackMenuItems(tracks, context, playlists);
      setMenu({ x: event.clientX, y: event.clientY, items, tracks, context });
    },
    [playlists],
  );

  /** The menu behind a right-click on a branch of the library tree. */
  const openTreeMenu = useCallback((event, item, context = {}) => {
    event.preventDefault();
    const items = buildTreeMenuItems(item, context);
    if (!items.length) return;
    setTreeMenu({ x: event.clientX, y: event.clientY, items, item, context });
  }, []);

  const onTreeMenuAction = useCallback(
    async action => {
      const { item, context } = treeMenu || {};
      setTreeMenu(null);
      if (!item) return;
      const rows = (context && context.rows) || [];
      const picked = (context && context.selected) || [];
      if (action === 'play') {
        if (!rows.length) return;
        setOpened({ label: item.label, paths: rows.map(t => t.path) });
        setPlaylistName(item.label);
        setCurrentId(rows[0].id);
        wantPlayRef.current = true;
      } else if (action === 'rename' && item.playlist) {
        await renamePlaylist(item.playlist);
      } else if (action === 'delete' && item.playlist) {
        const gone = await deletePlaylist(item.playlist);
        if (gone && context && context.setNode) context.setNode('all-audio');
      } else if (action === 'restore-all') {
        addToLibrary(rows.map(t => t.path));
      } else if (action === 'restore-picked') {
        addToLibrary(picked.map(t => t.path));
      } else if (action === 'empty') {
        await emptyDeleted();
      } else if (action === 'new') {
        await newPlaylist();
      }
    },
    [
      treeMenu,
      renamePlaylist,
      deletePlaylist,
      addToLibrary,
      emptyDeleted,
      newPlaylist,
    ],
  );

  /**
   * The library telling us how it is currently ordered. Only the list Now
   * Playing is already showing follows along — a sort in one branch must not
   * rearrange a queue that came from somewhere else.
   */
  const onLibraryOrderChange = useCallback((label, paths) => {
    setOpened(prev => {
      if (!prev || prev.label !== label) return prev;
      const same =
        prev.paths.length === paths.length &&
        prev.paths.every((p, i) => p === paths[i]);
      return same ? prev : { label, paths };
    });
  }, []);

  const deleteFromLibrary = useCallback(
    async tracks => {
      if (!tracks || !tracks.length) return;
      const ok = await confirm(
        [
          'Are you sure you want to remove the items from the Media Library?',
          '',
          'They stay on your computer, and in Deleted Items, until you remove them there.',
        ].join(String.fromCharCode(10)),
        'Windows Media Player',
      );
      if (ok) removeFromLibrary(tracks.map(t => t.path));
    },
    [confirm, removeFromLibrary],
  );

  const onTrackMenuAction = useCallback(
    async action => {
      const { tracks, context } = menu || {};
      setMenu(null);
      if (!tracks || !tracks.length) return;
      if (action === 'play') {
        setCurrentId(tracks[0].id);
        wantPlayRef.current = true;
      } else if (action === 'remove' && context.playlist) {
        for (const t of tracks)
          removeFromPlaylist(vfs, context.playlist.path, t.path, library);
      } else if (action === 'delete') {
        await deleteFromLibrary(tracks);
      } else if (action === 'edit') {
        if (context.beginEdit) context.beginEdit(context.column, tracks);
      } else if (action === 'up' || action === 'down') {
        if (context.moveBy) context.moveBy(tracks, action === 'up' ? -1 : 1);
      } else if (action === 'restore') {
        addToLibrary(tracks.map(t => t.path));
      } else if (action === 'purge') {
        const gone = new Set(tracks.map(t => t.path.toLowerCase()));
        storeDeleted(deletedPaths.filter(p => !gone.has(p.toLowerCase())));
      } else if (action === 'library') {
        addToLibrary(
          tracks.filter(t => !t.path.startsWith('url:')).map(t => t.path),
        );
      } else if (action === 'properties') {
        if (!tracks[0].path.startsWith('url:'))
          setPropertiesPath(tracks[0].path);
      } else if (action === 'add:new') {
        await newPlaylist(tracks);
      } else if (action.startsWith('add:')) {
        addToPlaylist(
          vfs,
          action.slice(4),
          tracks.map(t => t.path),
          library,
        );
      }
    },
    [
      menu,
      vfs,
      library,
      newPlaylist,
      deleteFromLibrary,
      addToLibrary,
      deletedPaths,
      storeDeleted,
    ],
  );

  /** Play a path from the file system, exactly as opening it from Explorer. */
  const openPath = useCallback(path => {
    if (!path) return;
    openedRef.current = null; // let the open effect run again for this path
    setOpenedFile(path);
  }, []);

  const chooseFile = useCallback(() => {
    setFileDialog({
      mode: 'open',
      onPick: path => openPath(path),
    });
  }, [openPath]);

  /** File > Open URL — anything the browser can fetch will play. */
  const openUrl = useCallback(async () => {
    const url = await prompt(
      'Enter the URL of the media file you want to play:',
      'http://',
      'Open URL',
    );
    if (!url || !/^https?:\/\//i.test(url.trim())) return;
    const clean = url.trim();
    const name = clean.split('/').pop() || clean;
    const path = `url:/${clean}`;
    setUrls(prev => ({ ...prev, [path]: clean }));
    setTags(prev => ({ ...prev, [path]: {} }));
    setDurations(prev => ({ ...prev, [path]: 0 }));
    setSession(prev =>
      prev.some(t => t.path === path)
        ? prev
        : [
            ...prev,
            {
              path,
              name,
              title: name.replace(/\.[^.]+$/, ''),
              kind: mediaKind(name),
            },
          ],
    );
    const title = name.replace(/\.[^.]+$/, '');
    setOpened({ label: title, paths: [path] });
    setPlaylistName(title);
    setCurrentId(path);
    wantPlayRef.current = true;
  }, [prompt]);

  /* ---- filling the library ---------------------------------------------- */

  /** Tools > Search for Media Files. Reports what it filed, as the real one did. */
  const runSearch = useCallback(async () => {
    const found = searchForMedia(vfs).map(t => t.path);
    const added = addToLibrary(found);
    await alert(
      added
        ? [
            'Search is complete.',
            '',
            added + ' file(s) were added to your Media Library.',
          ].join(String.fromCharCode(10))
        : ['Search is complete.', '', 'No new files were found.'].join(
            String.fromCharCode(10),
          ),
      'Search for Media Files',
      { icon: 'info' },
    );
  }, [vfs, addToLibrary, alert]);

  // RT_STRING #1706 — the player asked before it went rummaging, and this is
  // the moment it asked: the first time the Media Library is opened.
  useEffect(() => {
    if (task !== 'MediaLibrary' || askedToSearch || libraryPaths === null)
      return;
    setAskedToSearch(true);
    (async () => {
      const yes = await confirm(
        [
          'This appears to be the first time you have been to the Media Library.',
          'Would you like to search your computer for media?',
          '',
          'If you choose no, you can go to the Tools menu and search for media later.',
        ].join(String.fromCharCode(10)),
        'Media Library',
      );
      if (yes) runSearch();
    })();
  }, [task, askedToSearch, libraryPaths, confirm, runSearch]);

  /** Drag one row onto another to move it there, in the library or a
   *  playlist. Both keep an order the user chose, so both can be moved. */
  const reorder = useCallback(
    (playlist, fromPath, toPath) => {
      const move = list => {
        // paths are matched the way the file system compares them
        const at = target =>
          list.findIndex(p => p.toLowerCase() === target.toLowerCase());
        const from = at(fromPath);
        const to = at(toPath);
        if (from < 0 || to < 0 || from === to) return null;
        const next = [...list];
        next.splice(to, 0, next.splice(from, 1)[0]);
        return next;
      };
      if (playlist) {
        const next = move(readPlaylist(vfs, playlist.path));
        if (next)
          savePlaylist(
            vfs,
            playlist.path,
            next.map(
              p => library.find(t => t.path === p) || { path: p, title: p },
            ),
          );
        return;
      }
      const next = move(libraryPaths || []);
      if (next) storeLibrary(next);
    },
    [vfs, library, libraryPaths, storeLibrary],
  );

  /* ---- menus ------------------------------------------------------------ */

  /* The pulldown under the video picks a visualization or album art — the
     real button opens this list rather than stepping through it. */
  const openVizMenu = event => {
    setVizMenu({
      x: event.clientX,
      y: event.clientY,
      items: buildVizMenuItems(visualization),
    });
  };

  /** Full screen shows whatever the pane is showing — video or visualization. */
  const goFullScreen = () => {
    const el = screenRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else if (el.requestFullscreen) el.requestFullscreen();
  };

  const cycleViz = delta => {
    const at = VIZ_PRESETS.indexOf(visualization);
    const next =
      (at < 0 ? 0 : at + delta + VIZ_PRESETS.length) % VIZ_PRESETS.length;
    setVisualization(VIZ_PRESETS[next]);
  };

  const onMenuItem = text => {
    if (VIZ_PRESETS.includes(text) || text === NO_VIZ || text === ALBUM_ART) {
      setVisualization(text);
      setTask('NowPlaying');
      return;
    }
    switch (text) {
      case 'Exit':
      case 'Close':
        onClose();
        break;
      case 'Play':
      case 'Pause':
        togglePlay();
        break;
      case 'Stop':
        stop();
        break;
      case 'Previous':
        step(-1);
        break;
      case 'Next':
        step(1);
        break;
      case 'Rewind':
        nudge(-5);
        break;
      case 'Fast Forward':
        nudge(5);
        break;
      case 'Repeat Off':
        setRepeatMode('off');
        break;
      case 'Repeat Playlist':
        setRepeatMode('all');
        break;
      case 'Repeat Track':
        setRepeatMode('one');
        break;
      case 'Shuffle':
        setShuffle(v => !v);
        break;
      case 'Open...':
        chooseFile();
        break;
      case 'Add File or Playlist...':
        setFileDialog({
          mode: 'open',
          onPick: path => {
            addToLibrary([path]);
            setTask('MediaLibrary');
          },
        });
        break;
      case 'Open URL...':
        openUrl();
        break;
      case 'Properties':
        if (current && !current.path.startsWith('url:'))
          setPropertiesPath(current.path);
        break;
      case 'Save Media As...':
        if (current && !current.path.startsWith('url:'))
          setFileDialog({
            mode: 'save',
            fileName: getBaseName(current.path),
            onPick: async dest => {
              const blob = await vfs.readBinaryFile(current.path);
              if (blob) vfs.createFile(dest, blob, blob.type);
            },
          });
        break;
      case 'Options...':
        setOptionsOpen(true);
        break;
      case 'Work Offline':
        setOffline(v => !v);
        break;
      case 'Refresh':
        setLibraryPaths(prev => (prev ? [...prev] : prev));
        break;
      case 'About Windows Media Player':
        alert(
          [
            'Windows Media Player',
            '',
            'Version 8.00.00.4477',
            '',
            'Copyright (C) 1992-2001 Microsoft Corporation',
          ].join('\n'),
          'About Windows Media Player',
          { icon: 'info' },
        );
        break;
      case 'Statistics...':
        alert(
          current
            ? [
                current.title,
                '',
                'Length: ' + formatTime(current.duration),
                'Type: ' + (current.kind === 'video' ? 'Video' : 'Audio'),
                'File: ' + current.path,
              ].join('\n')
            : 'No media is currently playing.',
          'Statistics',
          { icon: 'info' },
        );
        break;
      case 'Taskbar':
        setTaskbar(v => !v);
        break;
      case 'Show Title':
        setOption('showTitleBar', !options.showTitleBar);
        break;
      case 'Show Playlist':
        setShowPlaylist(v => !v);
        break;
      case 'Show Equalizer & Settings':
        setShowEqualizer(v => !v);
        break;
      case 'Full Mode':
        setTask('NowPlaying');
        break;
      case 'Full Screen':
        goFullScreen();
        break;
      case '50%':
        setVideoSize(50);
        break;
      case '100%':
        setVideoSize(100);
        break;
      case '200%':
        setVideoSize(200);
        break;
      case 'Fit to Window':
        setVideoSize(0);
        break;
      case 'New Playlist...': {
        newPlaylist().then(created => {
          if (!created) return;
          setTask('MediaLibrary');
          setPlaylistName(created.name);
        });
        break;
      }
      case 'Search for Media Files...':
        runSearch();
        break;
      case 'Add Currently Playing Track':
        if (current && !current.path.startsWith('url:')) {
          const n = addToLibrary([current.path]);
          setTask('MediaLibrary');
          if (!n)
            alert(
              'That item is already in your Media Library.',
              'Media Library',
              {
                icon: 'info',
              },
            );
        }
        break;
      case 'Add Current Playlist to Media Library':
        addToLibrary(
          queue.filter(t => !t.path.startsWith('url:')).map(t => t.path),
        );
        setTask('MediaLibrary');
        break;
      case 'Windows Media Home Page':
      case 'Product News':
        setTask('MediaGuide');
        break;
      default:
        break;
    }
  };

  /* ---- dropped files ---------------------------------------------------- */

  const onDrop = async e => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f =>
      MEDIA_EXTENSIONS.test(f.name),
    );
    if (!files.length) return;
    const added = [];
    for (const file of files) {
      const url = URL.createObjectURL(file);
      createdUrls.current.add(url);
      const path = `dropped:/${file.name}`;
      added.push({
        path,
        name: file.name,
        title: file.name.replace(/\.[^.]+$/, ''),
        kind: mediaKind(file.name),
      });
      setUrls(prev => ({ ...prev, [path]: url }));
      try {
        // eslint-disable-next-line no-await-in-loop
        const found = await readMediaTags(file, file.name);
        setTags(prev => ({ ...prev, [path]: found || {} }));
      } catch {
        setTags(prev => ({ ...prev, [path]: {} }));
      }
    }
    setSession(prev => [...prev, ...added]);
    setCurrentId(added[0].path);
    wantPlayRef.current = true;
  };

  /* ---- marquee ---------------------------------------------------------- */

  // RT_STRING #2070-#2075: the marquee cycles Song/Clip, Artist and Album.
  const marquee = useMemo(() => {
    if (!current) return 'No media loaded';
    const fields = [
      `${current.kind === 'video' ? 'Clip' : 'Song'}: ${current.title}`,
    ];
    if (current.artist) fields.push(`Artist: ${current.artist}`);
    if (current.album) fields.push(`Album: ${current.album}`);
    return fields[marqueeField % fields.length];
  }, [current, marqueeField]);

  const stateIcon = !current
    ? stateStopped
    : isPlaying
    ? statePlaying
    : currentTime > 0
    ? statePaused
    : stateStopped;

  /* ---- render ----------------------------------------------------------- */

  const renderOtherTask = () => {
    switch (task) {
      case 'MediaGuide':
        return <MediaGuide />;
      case 'CDAudio':
        return <CopyFromCD drive={CD_DRIVE} />;
      case 'MediaLibrary':
        return (
          <MediaLibrary
            tracks={libraryTracks}
            onSearch={runSearch}
            onReorder={reorder}
            onEditTags={editTags}
            onDeleteFromLibrary={deleteFromLibrary}
            deletedTracks={deletedTracks}
            onEmptyDeleted={emptyDeleted}
            onTreeMenu={openTreeMenu}
            currentId={currentId}
            playlists={playlists}
            playlistTracksFor={p => playlistTracks(vfs, p.path, library)}
            onNewPlaylist={() => newPlaylist()}
            onDeletePlaylist={deletePlaylist}
            onTrackMenu={openTrackMenu}
            onRemoveFromPlaylist={(playlist, track) =>
              removeFromPlaylist(vfs, playlist.path, track.path, library)
            }
            onOrderChange={onLibraryOrderChange}
            onPlay={(track, order, label) => {
              const name =
                label || (track.kind === 'video' ? 'All Clips' : 'All Audio');
              // Now Playing takes the list exactly as the library shows it,
              // so a column sort decides what plays next
              setOpened(
                order && order.length
                  ? { label: name, paths: order.map(t => t.path) }
                  : null,
              );
              setPlaylistName(name);
              setCurrentId(track.id);
              wantPlayRef.current = true;
            }}
          />
        );
      case 'RadioTuner':
        return <RadioTuner />;
      case 'PortableDevice':
        return <CopyToCD tracks={queue} drive={CD_DRIVE} />;
      case 'SkinViewer':
        return <SkinChooser />;
      default:
        return null;
    }
  };

  const renderNowPlaying = () => (
    <NowPlayingRoot ref={nowPlayingRef}>
      <VideoColumn>
        {/* Titles: artist at top 5, track at top 25 — resource 137 */}
        {options.showTitleBar && (
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
            ref={setMediaRef}
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
            onClick={togglePlay}
            onPlay={() => {
              setIsPlaying(true);
              wantPlayRef.current = true;
              setupGraph();
            }}
            onPause={() => setIsPlaying(false)}
            onEnded={onEnded}
            onTimeUpdate={e => {
              setCurrentTime(e.target.currentTime);
              if (isFinite(e.target.duration)) setDuration(e.target.duration);
            }}
            onError={() => {
              if (!current) return;
              if (isRemote && !corsDenied) {
                // may just be a host that will not share across origins;
                // drop the analyser and try again before complaining
                setCorsBlocked(prev => ({ ...prev, [current.path]: true }));
                return;
              }
              setIsPlaying(false);
              wantPlayRef.current = false;
              alert(
                [
                  'Windows Media Player cannot find the file. It does not exist or the location specified is not correct.',
                  ...(current.path.startsWith('url:')
                    ? [
                        '',
                        'The server may also be refusing to share it with other sites.',
                      ]
                    : []),
                ].join(String.fromCharCode(10)),
                'Windows Media Player',
              );
            }}
            onLoadedMetadata={e => {
              if (isFinite(e.target.duration)) setDuration(e.target.duration);
            }}
          />
          <canvas
            ref={canvasRef}
            onPointerMove={trackPointer}
            onPointerDown={e => {
              trackPointer(e);
              pointerRef.current.down = true;
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerUp={e => {
              pointerRef.current.down = false;
              e.currentTarget.releasePointerCapture(e.pointerId);
            }}
            onPointerLeave={() => {
              pointerRef.current.inside = false;
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
              $up={vizSwitchUp}
              $hover={vizSwitchHover}
              onClick={openVizMenu}
            />
          </XPTooltip>
          <XPTooltip text="Previous visualization">
            <SkinBtn
              style={{ left: 33, top: 1, width: 18, height: 18 }}
              $up={vizPrevUp}
              $hover={vizPrevHover}
              $down={vizPrevDown}
              onClick={() => cycleViz(-1)}
            />
          </XPTooltip>
          <XPTooltip text="Next visualization">
            <SkinBtn
              style={{ left: 52, top: 1, width: 18, height: 18 }}
              $up={vizNextUp}
              $hover={vizNextHover}
              $down={vizNextDown}
              onClick={() => cycleViz(1)}
            />
          </XPTooltip>
          <div className="wmp__vizname">{visualization}</div>
          <XPTooltip text="View full screen">
            <SkinBtn
              style={{ right: 4, top: 1, width: 18, height: 18 }}
              $up={fullUp}
              $hover={fullHover}
              $down={fullDown}
              onClick={goFullScreen}
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
                  onDoubleClick={() => {
                    setCurrentId(track.id);
                    wantPlayRef.current = true;
                  }}
                  onContextMenu={e =>
                    openTrackMenu(e, [track], {
                      nowPlaying: true,
                      playlist: playlists.find(p => p.name === playlistName),
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

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
      onDrop={onDrop}
      onDragOver={e => e.preventDefault()}
    >
      {menuBar && (
        <section style={{ flex: 'none', background: '#ece9d8', height: 19 }}>
          <WindowDropDowns
            items={buildMenus({
              playing: isPlaying,
              shuffle,
              repeat: repeatMode,
              offline,
              muted: isMuted,
              taskbar,
              showPlaylist,
              showEqualizer,
              showTitle: options.showTitleBar,
              visualization,
              videoSize,
            })}
            onClickItem={onMenuItem}
          />
        </section>
      )}

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
                $up={menuBar ? autoOn : autoUp}
                $hover={menuBar ? autoOnHover : autoHover}
                onClick={() => setMenuBar(v => !v)}
              />
            </XPTooltip>
          </FillTop>
          <TopRight>
            <XPTooltip text={shuffle ? 'Turn shuffle off' : 'Turn shuffle on'}>
              <SkinBtn
                style={{ left: 0, top: 15, width: 21, height: 22 }}
                $up={shuffle ? shuffleOn : shuffleUp}
                $hover={shuffle ? shuffleOnHover : shuffleHover}
                onClick={() => setShuffle(v => !v)}
              />
            </XPTooltip>
            {/* Not in the stock skin — WMP8 kept repeat in the Play menu — but
                its strings are (RT_STRING #1816/#1817), and the artwork is
                the real button body with a repeat glyph on it. */}
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
                $up={
                  repeatMode === 'one'
                    ? loopOneOn
                    : repeatMode === 'all'
                    ? loopAllOn
                    : loopUp
                }
                $hover={
                  repeatMode === 'one'
                    ? loopOneOnHover
                    : repeatMode === 'all'
                    ? loopAllOnHover
                    : loopHover
                }
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
                $up={showEqualizer ? eqOn : eqUp}
                $hover={showEqualizer ? eqOnHover : eqHover}
                onClick={() => setShowEqualizer(v => !v)}
              />
            </XPTooltip>
            <XPTooltip text="Show playlist in Now Playing">
              <SkinBtn
                style={{ left: 42, top: 15, width: 21, height: 22 }}
                $up={showPlaylist ? plOn : plUp}
                $hover={showPlaylist ? plOnHover : plHover}
                onClick={() => setShowPlaylist(v => !v)}
              />
            </XPTooltip>
          </TopRight>

          <PlaylistDropdown onClick={() => setComboOpen(v => !v)}>
            <span className="wmp__combo-label">{playlistName}</span>
            <span className="wmp__combo-arrow">▼</span>
            {comboOpen && (
              <DropdownList>
                {(opened ? [opened.label] : [])
                  .concat(['All Audio', 'All Clips'])
                  .concat(playlists.map(p => p.name))
                  .map(option => (
                    <div
                      key={option}
                      data-selected={option === playlistName}
                      onClick={e => {
                        e.stopPropagation();
                        setPlaylistName(option);
                        setCurrentId(null);
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

          {/* ---- content ---- */}
          {/* Now Playing stays mounted behind the other tasks: the player
              keeps playing when you switch to the Media Library, so the
              media element must not be torn down. */}
          <Content>
            <div
              style={{
                display: task === 'NowPlaying' ? 'flex' : 'none',
                flex: 1,
                minWidth: 0,
              }}
            >
              {renderNowPlaying()}
            </div>
            {renderOtherTask()}
          </Content>

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

          {/* ---- transport: coordinates from svTransport ---- */}
          <Transport>
            <XPTooltip text={isPlaying ? 'Pause' : 'Play'}>
              <SkinBtn
                style={{ left: 41, top: 10, width: 41, height: 43 }}
                $up={isPlaying ? pauseUp : playUp}
                $hover={isPlaying ? pauseHover : playHover}
                $down={isPlaying ? pauseDown : playDown}
                onClick={togglePlay}
              />
            </XPTooltip>
            <XPTooltip text="Stop">
              <SkinBtn
                style={{ left: 82, top: 18, width: 24, height: 35 }}
                $up={stopUp}
                $hover={stopHover}
                $down={stopDown}
                onClick={stop}
              />
            </XPTooltip>
            <XPTooltip text="Rewind">
              <SkinBtn
                style={{ left: 107, top: 10, width: 21, height: 17 }}
                $up={rewUp}
                $hover={rewHover}
                $down={rewDown}
                onClick={() => nudge(-5)}
              />
            </XPTooltip>
            <XPTooltip text="Fast Forward">
              <SkinBtn
                style={{ left: 263, top: 10, width: 21, height: 17 }}
                $up={ffUp}
                $hover={ffHover}
                $down={ffDown}
                onClick={() => nudge(5)}
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
                  backgroundImage: `url(${seekBkg})`,
                  backgroundSize: '135px 22px',
                }}
              />
              <div
                className="wmp__sl-fore"
                style={{ width: `${progress * 100}%` }}
              >
                <div
                  className="wmp__sl-bkg"
                  style={{
                    width: 135,
                    backgroundImage: `url(${seekFore})`,
                    backgroundSize: '135px 22px',
                  }}
                />
              </div>
              <div
                className="wmp__sl-thumb"
                style={{
                  left: `${progress * 100}%`,
                  backgroundImage: `url(${seekThumbUp})`,
                }}
              />
            </Slider>

            {/* prev / next are one bitmap split by btngroup_colormap.bmp */}
            <XPTooltip text="Previous">
              <GroupHalf
                style={{ left: 106, top: 33, width: M.prevNext.prev }}
                $offset={0}
                onClick={() => step(-1)}
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
                onClick={() => step(1)}
              />
            </XPTooltip>

            {/* The skin marks this one sticky, bound to player.settings.mute,
                with sound_btn_down as its latched image — so muted is the
                pressed state rather than a separate icon. */}
            <XPTooltip text={isMuted ? 'Sound' : 'Mute'}>
              <SkinBtn
                style={{ left: 168, top: 33, width: 30, height: 20 }}
                $up={isMuted ? soundDown : soundUp}
                $hover={isMuted ? soundDown : soundHover}
                $down={isMuted ? soundUp : soundDown}
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
                style={{ width: 54, backgroundImage: `url(${volBkg})` }}
              />
              <div
                className="wmp__sl-fore"
                style={{ width: `${localVolume * 100}%` }}
              >
                <div
                  className="wmp__sl-bkg"
                  style={{ width: 54, backgroundImage: `url(${volFore})` }}
                />
              </div>
              <div
                className="wmp__sl-thumb"
                style={{
                  left: `${localVolume * 100}%`,
                  backgroundImage: `url(${volThumbUp})`,
                }}
              />
            </Slider>
          </Transport>

          <GotoSkin>
            <XPTooltip text="Switch to skin mode">
              <SkinBtn
                style={{ left: 0, top: 0, width: 24, height: 25 }}
                $up={skinUp}
                $hover={skinHover}
                $down={skinDown}
                disabled
              />
            </XPTooltip>
          </GotoSkin>
        </AppShift>
      </Body>
      {fileDialog && (
        <FileDialog
          mode={fileDialog.mode}
          initialPath={SPECIAL_FOLDERS.MY_MUSIC}
          initialFileName={fileDialog.fileName || ''}
          filters={OPEN_FILTERS}
          onSelect={path => {
            const pick = fileDialog.onPick;
            setFileDialog(null);
            if (pick) pick(path);
          }}
          onCancel={() => setFileDialog(null)}
        />
      )}
      {optionsOpen && (
        <OptionsDialog
          options={options}
          onChange={setOption}
          onClose={() => setOptionsOpen(false)}
        />
      )}
      {propertiesPath && (
        <PropertiesDialog
          path={propertiesPath}
          onClose={() => {
            setPropertiesPath(null);
            // Its Summary page edits the same tags the list shows
            setTagEdits(readAllTagEdits(vfs));
          }}
        />
      )}
      {vizMenu && (
        <ContextMenu
          x={vizMenu.x}
          y={vizMenu.y}
          items={vizMenu.items}
          onAction={name => {
            setVisualization(name);
            setVizMenu(null);
          }}
          onClose={() => setVizMenu(null)}
        />
      )}
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={menu.items}
          onAction={onTrackMenuAction}
          onClose={() => setMenu(null)}
        />
      )}
      {treeMenu && (
        <ContextMenu
          x={treeMenu.x}
          y={treeMenu.y}
          items={treeMenu.items}
          onAction={onTreeMenuAction}
          onClose={() => setTreeMenu(null)}
        />
      )}
    </div>
  );
}

