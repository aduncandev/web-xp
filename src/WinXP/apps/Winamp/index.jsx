import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';
import Webamp from 'webamp';

import { useVFS } from '../../../context/VFSContext';
import { useVolume } from '../../../context/VolumeContext';
import { SPECIAL_FOLDERS } from '../../../context/vfsConstants';
import { TASKBAR_HEIGHT } from '../../constants';

// Webamp is rendered contained (renderInto) so its skinned windows live
// INSIDE this app's window-manager entry: they stack by the app's z-index,
// clicks bubble up and focus the app, and minimize actually hides them.
// The host spans the whole desktop (the wrapper window is 0x0 at 0,0) so
// the windows still float freely, but never under the taskbar. It must not
// swallow clicks meant for the desktop; webamp's own windows re-enable
// pointer events and hit-test on their own rects.
const Host = styled.div`
  position: absolute;
  left: 0;
  top: -25px; /* cancel the window chrome's content inset */
  width: 100%;
  height: calc(100% - ${TASKBAR_HEIGHT}px); /* keep Winamp off the taskbar */
  pointer-events: none;
  #webamp {
    pointer-events: auto;
  }
`;

const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg'];

function isAudioFile(node) {
  if (!node || node.type !== 'file') return false;
  const name = node.name.toLowerCase();
  return AUDIO_EXTENSIONS.some(ext => name.endsWith(ext));
}

/** 'Artist - Title.mp3' → metaData; otherwise the base name as defaultName. */
function trackInfoFromName(name) {
  const base = name.replace(/\.[^.]+$/, '');
  const sep = base.indexOf(' - ');
  if (sep > 0) {
    return {
      metaData: {
        artist: base.slice(0, sep).trim(),
        title: base.slice(sep + 3).trim(),
      },
    };
  }
  return { defaultName: base };
}

function Winamp({ onClose, onMinimize, filePath }) {
  const vfs = useVFS();
  const ref = useRef(null);
  const webamp = useRef(null);
  const renderPromise = useRef(null);
  // Object URLs we created for VFS blobs (static sourceUrl assets are not ours)
  const ownedUrls = useRef([]);
  // Library entries: { path, track } so requested files dedupe by path
  const libraryTracks = useRef([]);
  const libraryLoaded = useRef(false);
  const tracksInPlayer = useRef(false);
  const loadedFilePath = useRef(null);
  const { effectiveVolume } = useVolume();
  const effectiveVolumeRef = useRef(effectiveVolume);
  effectiveVolumeRef.current = effectiveVolume;

  // The system mixer gates Winamp like any other app: master * Wave
  // drives webamp's volume slider (webamp has no separate pre-gain).
  useEffect(() => {
    if (!webamp.current) return;
    webamp.current.setVolume(Math.round(effectiveVolume * 100));
  }, [effectiveVolume]);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const onMinimizeRef = useRef(onMinimize);
  onMinimizeRef.current = onMinimize;

  useEffect(() => {
    const target = ref.current;
    if (!target) {
      return;
    }
    webamp.current = new Webamp({ initialTracks: [] });
    webamp.current.setVolume(Math.round(effectiveVolumeRef.current * 100));
    // Subscribe once; refs keep the handlers current across renders
    webamp.current.onClose(() => onCloseRef.current && onCloseRef.current());
    webamp.current.onMinimize(
      () => onMinimizeRef.current && onMinimizeRef.current(),
    );
    renderPromise.current = webamp.current.renderInto(target);

    return () => {
      if (webamp.current) {
        webamp.current.dispose();
        webamp.current = null;
      }
      // Audio is stopped by dispose; safe to release our blob URLs and
      // reset so a remount rebuilds the playlist from scratch
      ownedUrls.current.forEach(u => URL.revokeObjectURL(u));
      ownedUrls.current = [];
      libraryTracks.current = [];
      libraryLoaded.current = false;
      tracksInPlayer.current = false;
      loadedFilePath.current = null;
    };
  }, []);

  // Build the playlist from My Music once the filesystem is ready; when a
  // file is injected (double-clicked / re-launched), play it on top.
  useEffect(() => {
    if (!vfs.initialized) return;
    const requested = filePath || null;
    if (tracksInPlayer.current && requested === loadedFilePath.current) return;
    let cancelled = false;

    const resolveTrack = async node => {
      const url = await vfs.readFileUrl(node.path);
      if (!url) return null;
      if (url !== node.sourceUrl) ownedUrls.current.push(url);
      return { url, ...trackInfoFromName(node.name) };
    };

    (async () => {
      if (!libraryLoaded.current) {
        const files = [];
        const walk = dir => {
          for (const child of vfs.listDir(dir)) {
            if (child.type === 'folder') walk(child.path);
            else if (isAudioFile(child)) files.push(child);
          }
        };
        walk(SPECIAL_FOLDERS.MY_MUSIC);
        files.sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
        );
        const entries = [];
        for (const file of files) {
          const track = await resolveTrack(file);
          if (track) entries.push({ path: file.path.toLowerCase(), track });
        }
        if (cancelled) return;
        libraryTracks.current = entries;
        libraryLoaded.current = true;
      }

      await renderPromise.current;
      if (cancelled || !webamp.current) return;

      let queued = false;
      if (requested && requested !== loadedFilePath.current) {
        const node = vfs.findNodeCI(requested);
        if (isAudioFile(node)) {
          const key = node.path.toLowerCase();
          const inLibrary = libraryTracks.current.find(e => e.path === key);
          const head = inLibrary ? inLibrary.track : await resolveTrack(node);
          if (cancelled || !webamp.current) return;
          if (head) {
            loadedFilePath.current = requested;
            const rest = libraryTracks.current
              .filter(e => e.track !== head)
              .map(e => e.track);
            webamp.current.setTracksToPlay([head, ...rest]);
            tracksInPlayer.current = true;
            queued = true;
          }
        }
      }
      if (!queued && !tracksInPlayer.current) {
        webamp.current.appendTracks(libraryTracks.current.map(e => e.track));
        tracksInPlayer.current = true;
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vfs.initialized, filePath]);

  return <Host ref={ref} />;
}

export default Winamp;
