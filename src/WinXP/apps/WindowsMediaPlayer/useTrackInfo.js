// What the player knows about each file beyond its path: the tags it
// carries, the tags the user typed over them, its length, and a URL the
// media element can load. Session tracks are files opened or dropped in
// without joining the library.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { readMediaTags } from '../../../context/mediaTags';
import {
  readAllTagEdits,
  saveTagEdits,
  applyEditsTo,
} from '../../../context/tagOverrides';
import { decorate, mediaKind, trackForPath } from './library';

export function useTrackInfo({ vfs, rawLibrary, libraryPaths, deletedPaths }) {
  const [tags, setTags] = useState({});
  // Tags the user has typed over the file's own, keyed by lower-cased
  // path; null until the profile has been read
  const [tagEdits, setTagEdits] = useState(null);
  const [durations, setDurations] = useState({});
  const [urls, setUrls] = useState({});
  const [session, setSession] = useState([]);
  const createdUrls = useRef(new Set());
  const failed = useRef(new Set());

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

  // object URLs made here are revoked when the player closes
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

  // What the file says, with anything the user has typed laid over it
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

  // Everything the player knows about, dressed with tags and lengths
  const library = useMemo(
    () =>
      [...rawLibrary, ...session].map(track => ({
        ...decorate(track, effectiveTags),
        duration: durations[track.path] || 0,
        url: urls[track.path] || '',
      })),
    [rawLibrary, session, effectiveTags, durations, urls],
  );

  // ...and what has been filed in the library. An opened file is playable
  // without being either.
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

  // Tags first: only the header bytes are read, so a whole folder is cheap
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
  // background to read its duration, what the real library did on import
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

  /** A file that is not in the library, remembered while the player is open. */
  const addSessionTrack = useCallback(track => {
    setSession(prev =>
      prev.some(t => t.path === track.path) ? prev : [...prev, track],
    );
  }, []);

  /** File > Open URL: a track the browser fetches itself. Returns its path. */
  const addUrlTrack = useCallback(
    clean => {
      const name = clean.split('/').pop() || clean;
      const path = `url:/${clean}`;
      setUrls(prev => ({ ...prev, [path]: clean }));
      setTags(prev => ({ ...prev, [path]: {} }));
      setDurations(prev => ({ ...prev, [path]: 0 }));
      addSessionTrack({
        path,
        name,
        title: name.replace(/\.[^.]+$/, ''),
        kind: mediaKind(name),
      });
      return { path, title: name.replace(/\.[^.]+$/, '') };
    },
    [addSessionTrack],
  );

  /** Files dropped onto the player. Returns the paths given to them. */
  const addDroppedFiles = useCallback(async files => {
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
    return added.map(t => t.path);
  }, []);

  return {
    tags,
    tagEdits,
    setTagEdits,
    effectiveTags,
    editTags,
    library,
    libraryTracks,
    deletedTracks,
    resolveUrl,
    createdUrls,
    addSessionTrack,
    addUrlTrack,
    addDroppedFiles,
  };
}
