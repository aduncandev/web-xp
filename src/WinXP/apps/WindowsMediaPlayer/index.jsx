/*
 * Windows Media Player 8, the player that shipped in the Windows XP box
 * (wmplayer.exe, "Windows Media Player for Windows XP", 8.00.00.4477).
 *
 * The chrome is the real chrome: the bitmaps under ./skin came out of
 * WMPLOC.DLL on the XP RTM disc, and the geometry, tooltips, captions and
 * marquee formats come from that same DLL's own skin definition and string
 * table rather than from anyone's memory of the app. Behind it, playback is
 * wired to the virtual file system, the shared media-tag reader and the
 * system mixer.
 *
 * This file is the coordinator: what is in Now Playing, which task is up,
 * and the dialogs. The library lives in useLibrary and useTrackInfo, saved
 * playlists in usePlaylists, the media element in usePlayback, the canvas
 * in useVisualization, the menus in useTrackMenus and menuActions, and the
 * skin in PlayerFrame, Transport and NowPlaying.
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
import ContextMenu from '../../../components/ContextMenu';
import FileDialog from '../../../components/FileDialog';
import OptionsDialog from './OptionsDialog';
import PropertiesDialog from '../../../components/PropertiesDialog';
import { useSplitter } from '../../../components/ListView';
import { useDialog } from '../../../context/DialogContext';
import { useVolume } from '../../../context/VolumeContext';
import { useVFS } from '../../../context/VFSContext';
import { readAllTagEdits } from '../../../context/tagOverrides';
import { SPECIAL_FOLDERS } from '../../../context/vfsConstants';

import buildMenus from './menuData';
import { buildVizMenuItems } from './menus';
import { runMenuItem } from './menuActions';
import { CD_DRIVE, MARQUEE_PERIOD, OPEN_FILTERS, PLAYLIST_W } from './constants';
import { DEFAULT_VIZ, VIZ_PRESETS } from './visualizations';
import { MEDIA_EXTENSIONS, mediaKind, searchForMedia } from './library';
import { playlistDir, playlistTracks, removeFromPlaylist } from './playlists';
import {
  CopyFromCD,
  CopyToCD,
  MediaGuide,
  MediaLibrary,
  RadioTuner,
  SkinChooser,
} from './views';
import { useLibrary } from './useLibrary';
import { useTrackInfo } from './useTrackInfo';
import { usePlaylists } from './usePlaylists';
import { usePlayback } from './usePlayback';
import { useVisualization } from './useVisualization';
import { useAlbumArt } from './useAlbumArt';
import { useTrackMenus } from './useTrackMenus';
import NowPlaying from './NowPlaying';
import PlayerFrame from './PlayerFrame';
import { SKIN } from './skinImages';

export default function WindowsMediaPlayer({ filePath, onClose }) {
  const vfs = useVFS();
  const { isMuted, toggleMute, effectiveVolume } = useVolume();
  const dlg = useDialog();
  const { alert, confirm, prompt } = dlg;

  /* ---- what the player knows about ------------------------------------- */

  const lib = useLibrary(vfs);
  const info = useTrackInfo({
    vfs,
    rawLibrary: lib.rawLibrary,
    libraryPaths: lib.libraryPaths,
    deletedPaths: lib.deletedPaths,
  });
  const { library, libraryTracks, deletedTracks } = info;

  /* ---- the player's own state ------------------------------------------ */

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
  // A file opened by hand becomes the whole Now Playing list on its own
  const [opened, setOpened] = useState(null);
  const [currentId, setCurrentId] = useState(null);
  const [marqueeField, setMarqueeField] = useState(0);
  const [fileDialog, setFileDialog] = useState(null);
  const [propertiesPath, setPropertiesPath] = useState(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [offline, setOffline] = useState(true);
  const [vizMenu, setVizMenu] = useState(null);
  // remote paths whose host turned out not to allow cross-origin reads
  const [corsBlocked, setCorsBlocked] = useState({});

  useEffect(() => {
    if (appliedStartTask.current || !vfs.initialized) return;
    appliedStartTask.current = true;
    if (lib.options.startInMediaGuide) setTask('MediaGuide');
  }, [vfs.initialized, lib.options.startInMediaGuide]);

  const pl = usePlaylists({
    vfs,
    dlg,
    library,
    libraryPaths: lib.libraryPaths,
    storeLibrary: lib.storeLibrary,
    setPlaylistName,
  });
  const { playlists } = pl;

  /* ---- Now Playing ----------------------------------------------------- */

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
  const isVideo = current ? current.kind === 'video' : false;
  // Reading a remote track's samples needs crossOrigin="anonymous", and a
  // host that does not answer with CORS headers refuses that request flat.
  // So try it that way first (hosts that allow it get visualizations) and
  // only on failure fall back to a plain element, which plays but can
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

  const playback = usePlayback({
    queue,
    currentIndex,
    current,
    setCurrentId,
    shuffle,
    repeatMode,
    effectiveVolume,
    resolveUrl: info.resolveUrl,
  });
  const { wantPlayRef } = playback;

  useEffect(() => {
    if (!currentId && queue.length) setCurrentId(queue[0].id);
  }, [queue, currentId]);

  // The two ways anything starts playback: one track, or a whole list that
  // becomes Now Playing
  const playTrack = useCallback(
    track => {
      setCurrentId(track.id);
      wantPlayRef.current = true;
    },
    [wantPlayRef],
  );
  const playList = useCallback(
    (label, rows) => {
      setOpened(
        rows && rows.length
          ? { label, paths: rows.map(t => t.path) }
          : null,
      );
      setPlaylistName(label);
      if (rows && rows.length) setCurrentId(rows[0].id);
      wantPlayRef.current = true;
    },
    [wantPlayRef],
  );

  // Tools > Options: file what gets played, if that is switched on
  useEffect(() => {
    if (!lib.options.addPlayedToLibrary || !playback.isPlaying || !current)
      return;
    if (current.path.startsWith('url:')) return;
    lib.addToLibrary([current.path]);
  }, [lib, lib.options.addPlayedToLibrary, playback.isPlaying, current]);

  /* ---- opening files --------------------------------------------------- */

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
        pl.setOpenedPlaylist({ name, path: node.path });
      setPlaylistName(name);
      setCurrentId(null);
      wantPlayRef.current = true;
      vfs.addRecentDocument(node.path);
      return;
    }
    const known = lib.rawLibrary.some(
      t => t.path.toLowerCase() === node.path.toLowerCase(),
    );
    const title = node.name.replace(/\.[^.]+$/, '');
    if (!known)
      info.addSessionTrack({
        path: node.path,
        name: node.name,
        title,
        kind: mediaKind(node.name),
      });
    // Opening a file plays that file: it does not join the library, and it
    // does not drag the rest of the library into Now Playing with it
    setOpened({ label: title, paths: [node.path] });
    setPlaylistName(title);
    setCurrentId(node.path);
    wantPlayRef.current = true;
    vfs.addRecentDocument(node.path);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFile, vfs.initialized, lib.rawLibrary]);

  /** Play a path from the file system, exactly as opening it from Explorer. */
  const openPath = useCallback(path => {
    if (!path) return;
    openedRef.current = null; // let the open effect run again for this path
    setOpenedFile(path);
  }, []);

  const chooseFile = useCallback(() => {
    setFileDialog({ mode: 'open', onPick: path => openPath(path) });
  }, [openPath]);

  /** File > Open URL: anything the browser can fetch will play. */
  const openUrl = useCallback(async () => {
    const url = await prompt(
      'Enter the URL of the media file you want to play:',
      'http://',
      'Open URL',
    );
    if (!url || !/^https?:\/\//i.test(url.trim())) return;
    const { path, title } = info.addUrlTrack(url.trim());
    setOpened({ label: title, paths: [path] });
    setPlaylistName(title);
    setCurrentId(path);
    wantPlayRef.current = true;
  }, [prompt, info, wantPlayRef]);

  const onDrop = async e => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f =>
      MEDIA_EXTENSIONS.test(f.name),
    );
    if (!files.length) return;
    const paths = await info.addDroppedFiles(files);
    setCurrentId(paths[0]);
    wantPlayRef.current = true;
  };

  /* ---- the screen ------------------------------------------------------ */

  const canvasRef = useRef(null);
  const screenRef = useRef(null);
  const nowPlayingRef = useRef(null);
  // The divider between the video and the playlist is draggable, as it is
  // in the real player
  const playlistPane = useSplitter({
    key: 'wmp.playlist',
    initial: PLAYLIST_W,
    edge: 'end',
    boundsRef: nowPlayingRef,
  });
  const viz = useVisualization({
    vfs,
    task,
    visualization,
    canvasRef,
    analyserRef: playback.analyserRef,
    isPlaying: playback.isPlaying,
  });
  const artUrl = useAlbumArt({
    vfs,
    current,
    tags: info.tags,
    createdUrls: info.createdUrls,
  });

  /* The pulldown under the video picks a visualization or album art; the
     real button opens this list rather than stepping through it */
  const openVizMenu = event => {
    setVizMenu({
      x: event.clientX,
      y: event.clientY,
      items: buildVizMenuItems(visualization),
    });
  };
  const cycleViz = delta => {
    const at = VIZ_PRESETS.indexOf(visualization);
    const next =
      (at < 0 ? 0 : at + delta + VIZ_PRESETS.length) % VIZ_PRESETS.length;
    setVisualization(VIZ_PRESETS[next]);
  };
  /** Full screen shows whatever the pane is showing, video or visualization. */
  const goFullScreen = () => {
    const el = screenRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else if (el.requestFullscreen) el.requestFullscreen();
  };

  // The skin rotates the marquee's metadata line every four seconds
  useEffect(() => {
    const timer = setInterval(
      () => setMarqueeField(f => f + 1),
      MARQUEE_PERIOD,
    );
    return () => clearInterval(timer);
  }, []);
  // RT_STRING #2070-#2075: the marquee cycles Song/Clip, Artist and Album
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
    ? SKIN.state.stopped
    : playback.isPlaying
    ? SKIN.state.playing
    : playback.currentTime > 0
    ? SKIN.state.paused
    : SKIN.state.stopped;

  /* ---- the library task ------------------------------------------------ */

  /** Tools > Search for Media Files. Reports what it filed, as the real one did. */
  const runSearch = useCallback(async () => {
    const found = searchForMedia(vfs).map(t => t.path);
    const added = lib.addToLibrary(found);
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
  }, [vfs, lib, alert]);

  // RT_STRING #1706: the player asked before it went rummaging, and this is
  // the moment it asked, the first time the Media Library is opened
  useEffect(() => {
    if (task !== 'MediaLibrary' || lib.askedToSearch || lib.libraryPaths === null)
      return;
    lib.setAskedToSearch(true);
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
  }, [task, lib, confirm, runSearch]);

  const menus = useTrackMenus({
    vfs,
    dlg,
    library,
    playlists,
    deletedPaths: lib.deletedPaths,
    storeDeleted: lib.storeDeleted,
    addToLibrary: lib.addToLibrary,
    removeFromLibrary: lib.removeFromLibrary,
    newPlaylist: pl.newPlaylist,
    renamePlaylist: pl.renamePlaylist,
    deletePlaylist: pl.deletePlaylist,
    playList,
    playTrack,
    setPropertiesPath,
  });

  /**
   * The library telling us how it is currently ordered. Only the list Now
   * Playing is already showing follows along: a sort in one branch must not
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

  const onMenuItem = text =>
    runMenuItem(text, {
      onClose,
      vfs,
      alert,
      current,
      queue,
      playback,
      options: lib.options,
      setOption: lib.setOption,
      addToLibrary: lib.addToLibrary,
      setLibraryPaths: lib.setLibraryPaths,
      newPlaylist: pl.newPlaylist,
      runSearch,
      chooseFile,
      openUrl,
      goFullScreen,
      setVisualization,
      setTask,
      setRepeatMode,
      setShuffle,
      setFileDialog,
      setPropertiesPath,
      setOptionsOpen,
      setOffline,
      setTaskbar,
      setShowPlaylist,
      setShowEqualizer,
      setVideoSize,
      setPlaylistName,
    });

  const renderTask = () => {
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
            onReorder={pl.reorder}
            onEditTags={info.editTags}
            onDeleteFromLibrary={menus.deleteFromLibrary}
            deletedTracks={deletedTracks}
            onEmptyDeleted={menus.emptyDeleted}
            onTreeMenu={menus.openTreeMenu}
            currentId={currentId}
            playlists={playlists}
            playlistTracksFor={p => playlistTracks(vfs, p.path, library)}
            onNewPlaylist={() => pl.newPlaylist()}
            onDeletePlaylist={pl.deletePlaylist}
            onTrackMenu={menus.openTrackMenu}
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

  const playlistChoices = (opened ? [opened.label] : [])
    .concat(['All Audio', 'All Clips'])
    .concat(playlists.map(p => p.name));

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
              playing: playback.isPlaying,
              shuffle,
              repeat: repeatMode,
              offline,
              muted: isMuted,
              taskbar,
              showPlaylist,
              showEqualizer,
              showTitle: lib.options.showTitleBar,
              visualization,
              videoSize,
            })}
            onClickItem={onMenuItem}
          />
        </section>
      )}

      <PlayerFrame
        taskbar={taskbar}
        setTaskbar={setTaskbar}
        menuBar={menuBar}
        setMenuBar={setMenuBar}
        shuffle={shuffle}
        setShuffle={setShuffle}
        repeatMode={repeatMode}
        setRepeatMode={setRepeatMode}
        showEqualizer={showEqualizer}
        setShowEqualizer={setShowEqualizer}
        showPlaylist={showPlaylist}
        setShowPlaylist={setShowPlaylist}
        playlistName={playlistName}
        playlistChoices={playlistChoices}
        onPickPlaylist={name => {
          setPlaylistName(name);
          setCurrentId(null);
        }}
        task={task}
        setTask={setTask}
        marquee={marquee}
        stateIcon={stateIcon}
        currentTime={playback.currentTime}
        playback={playback}
        isMuted={isMuted}
        toggleMute={toggleMute}
      >
        {/* Now Playing stays mounted behind the other tasks: the player
            keeps playing when you switch to the Media Library, so the
            media element must not be torn down */}
        <div
          style={{
            display: task === 'NowPlaying' ? 'flex' : 'none',
            flex: 1,
            minWidth: 0,
          }}
        >
          <NowPlaying
            rootRef={nowPlayingRef}
            screenRef={screenRef}
            canvasRef={canvasRef}
            current={current}
            isVideo={isVideo}
            isRemote={isRemote}
            corsDenied={corsDenied}
            mediaMode={mediaMode}
            graphed={graphed}
            videoSize={videoSize}
            showTitleBar={lib.options.showTitleBar}
            playback={playback}
            viz={viz}
            visualization={visualization}
            artUrl={artUrl}
            onVizMenu={openVizMenu}
            onCycleViz={cycleViz}
            onFullScreen={goFullScreen}
            onCorsBlocked={path =>
              setCorsBlocked(prev => ({ ...prev, [path]: true }))
            }
            alert={alert}
            showPlaylist={showPlaylist}
            playlistPane={playlistPane}
            queue={queue}
            currentId={currentId}
            playTrack={playTrack}
            openTrackMenu={menus.openTrackMenu}
            currentPlaylist={playlists.find(p => p.name === playlistName)}
            totalTime={totalTime}
          />
        </div>
        {renderTask()}
      </PlayerFrame>

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
          options={lib.options}
          onChange={lib.setOption}
          onClose={() => setOptionsOpen(false)}
        />
      )}
      {propertiesPath && (
        <PropertiesDialog
          path={propertiesPath}
          onClose={() => {
            setPropertiesPath(null);
            // Its Summary page edits the same tags the list shows
            info.setTagEdits(readAllTagEdits(vfs));
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
      {menus.menu && (
        <ContextMenu
          x={menus.menu.x}
          y={menus.menu.y}
          items={menus.menu.items}
          onAction={menus.onTrackMenuAction}
          onClose={() => menus.setMenu(null)}
        />
      )}
      {menus.treeMenu && (
        <ContextMenu
          x={menus.treeMenu.x}
          y={menus.treeMenu.y}
          items={menus.treeMenu.items}
          onAction={menus.onTreeMenuAction}
          onClose={() => menus.setTreeMenu(null)}
        />
      )}
    </div>
  );
}
