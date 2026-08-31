/*
 * The six feature panes behind the taskbar buttons other than Now Playing.
 *
 * Media Guide and Radio Tuner were embedded Internet Explorer views pointed
 * at WindowsMedia.com, so with no network they show exactly what they showed
 * on a disconnected XP machine: IE's own "page cannot be displayed" body.
 * Copy from CD and Copy to CD or Device show their real column layouts with
 * nothing in them, because there is no optical drive to read.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';

import { ColumnDivider, useColumns } from '../../../components/ListView';
import {
  ListScroller,
  Pane,
  PaneHeading,
  PaneBody,
  ListHeader,
  ListRow,
  Tree,
  TreeNode,
} from './panes';
import { formatTime, orUnknown } from './library';
import { LIBRARY_EDITABLE } from '../../../context/tagOverrides';

const Toolbar = styled.div`
  flex: none;
  display: flex;
  align-items: center;
  height: 24px;
  padding: 0 6px;
  background: linear-gradient(to bottom, #3a4794 0, #1d2560 100%);
  border-bottom: 1px solid #000;
`;

const ToolButton = styled.button`
  height: 18px;
  margin-right: 8px;
  padding: 0 8px;
  border: 1px solid transparent;
  border-radius: 2px;
  background: transparent;
  font-family: inherit;
  font-size: 11px;
  color: ${({ disabled }) => (disabled ? '#7f86ad' : '#fff')};
  cursor: ${({ disabled }) => (disabled ? 'default' : 'pointer')};

  &:hover {
    border-color: ${({ disabled }) => (disabled ? 'transparent' : '#8fa0e0')};
    background: ${({ disabled }) => (disabled ? 'transparent' : '#4d5cb0')};
  }
`;

const Split = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
`;

const ListArea = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: #000;
`;

// A cell being typed into. The list is dark, so the box inverts to the
// ordinary white field the rest of Windows uses while it has the caret.
const CellInput = styled.input`
  width: 100%;
  height: 14px;
  padding: 0 1px;
  border: 1px solid #000;
  background: #fff;
  color: #000;
  font-family: inherit;
  font-size: 11px;
  outline: none;
`;

function CellEditor({ initial, onCommit, onCancel }) {
  const ref = useRef(null);
  const done = useRef(false);
  useEffect(() => {
    if (ref.current) {
      ref.current.focus();
      ref.current.select();
    }
  }, []);
  const finish = commit => {
    if (done.current) return;
    done.current = true;
    if (commit) onCommit(ref.current ? ref.current.value : initial);
    else onCancel();
  };
  return (
    <CellInput
      ref={ref}
      defaultValue={initial}
      spellCheck={false}
      onClick={e => e.stopPropagation()}
      onDoubleClick={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
      onContextMenu={e => e.stopPropagation()}
      onBlur={() => finish(true)}
      onKeyDown={e => {
        e.stopPropagation();
        if (e.key === 'Enter') finish(true);
        else if (e.key === 'Escape') finish(false);
      }}
    />
  );
}

const Rows = styled.div`
  flex: 1;
  min-height: 0;
  overflow: auto;
`;

const Empty = styled.div`
  padding: 14px;
  font-size: 11px;
  color: #9aa0c0;
`;

/* ---- Internet Explorer's offline error body ----------------------------- */

const ErrorPage = styled.div`
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 24px 28px;
  background: #fff;
  color: #000;
  font-family: 'Times New Roman', serif;
  font-size: 13px;

  h1 {
    margin: 0 0 12px;
    font-family: Tahoma, 'Noto Sans', sans-serif;
    font-size: 16px;
  }
  p {
    margin: 0 0 10px;
  }
  ul {
    margin: 0 0 12px 0;
    padding-left: 26px;
  }
  li {
    margin-bottom: 4px;
  }
  hr {
    border: 0;
    border-top: 1px solid #ccc;
    margin: 12px 0;
  }
  .ie__footer {
    font-family: Tahoma, 'Noto Sans', sans-serif;
    font-size: 11px;
  }
`;

function CannotDisplay({ host }) {
  return (
    <ErrorPage>
      <h1>The page cannot be displayed</h1>
      <p>
        The page you are looking for is currently unavailable. The Web site
        might be experiencing technical difficulties, or you may need to adjust
        your browser settings.
      </p>
      <hr />
      <p>
        <b>Please try the following:</b>
      </p>
      <ul>
        <li>Click the Refresh button, or try again later.</li>
        <li>
          If you typed the page address in the Address bar, make sure that it is
          spelled correctly.
        </li>
        <li>
          To check your connection settings, click the <b>Tools</b> menu, and
          then click <b>Internet Options</b>. On the <b>Connections</b> tab,
          click <b>Settings</b>. The settings should match those provided by
          your local area network (LAN) administrator or Internet service
          provider (ISP).
        </li>
      </ul>
      <p className="ie__footer">
        Cannot find server or DNS Error
        <br />
        Internet Explorer
      </p>
      <p className="ie__footer" style={{ color: '#666' }}>
        {host}
      </p>
    </ErrorPage>
  );
}

export function MediaGuide() {
  return (
    <Pane>
      <CannotDisplay host="http://windowsmedia.com/mediaguide/" />
    </Pane>
  );
}

export function RadioTuner() {
  return (
    <Pane>
      <CannotDisplay host="http://windowsmedia.com/radio/" />
    </Pane>
  );
}

/* ---- Copy from CD ------------------------------------------------------- */

const CD_COLUMNS = [
  { key: 'n', label: '', width: 26 },
  { key: 'name', label: 'Track Name', width: 0 },
  { key: 'length', label: 'Length', width: 60 },
  { key: 'status', label: 'Copy Status', width: 100 },
  { key: 'artist', label: 'Artist', width: 130 },
  { key: 'genre', label: 'Genre', width: 90 },
];

export function CopyFromCD({ drive }) {
  return (
    <Pane>
      <Toolbar>
        <ToolButton disabled>Copy Music</ToolButton>
        <ToolButton disabled>Get Names</ToolButton>
        <ToolButton disabled>Album Details</ToolButton>
      </Toolbar>
      <PaneHeading>Audio CD ({drive})</PaneHeading>
      <ListHeader>
        {CD_COLUMNS.map(c => (
          <div
            key={c.label + c.key}
            style={c.width ? { width: c.width } : { flex: 1 }}
          >
            {c.label}
          </div>
        ))}
      </ListHeader>
      <Rows>
        <Empty>
          There is no audio CD in drive {drive}. Insert an audio CD to see its
          tracks here.
        </Empty>
      </Rows>
    </Pane>
  );
}

/* ---- Copy to CD or Device ----------------------------------------------- */

const CopyColumns = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
`;

const CopyHalf = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  border-right: ${({ $last }) => ($last ? '0' : '1px solid #2b3566')};
`;

export function CopyToCD({ tracks, drive }) {
  return (
    <Pane>
      <Toolbar>
        <ToolButton disabled>Copy</ToolButton>
      </Toolbar>
      <CopyColumns>
        <CopyHalf>
          <PaneHeading>Items to Copy</PaneHeading>
          <ListHeader>
            <div style={{ flex: 1 }}>Name</div>
            <div style={{ width: 60 }}>Status</div>
            <div style={{ width: 60 }}>Length</div>
          </ListHeader>
          <Rows>
            {tracks.length === 0 ? (
              <Empty>There are no items in this playlist.</Empty>
            ) : (
              tracks.map(track => (
                <ListRow key={track.id}>
                  <div style={{ flex: 1 }}>{track.title}</div>
                  <div style={{ width: 60 }}>Ready</div>
                  <div style={{ width: 60 }}>{formatTime(track.duration)}</div>
                </ListRow>
              ))
            )}
          </Rows>
        </CopyHalf>
        <CopyHalf $last>
          <PaneHeading>Items on Device ({drive})</PaneHeading>
          <ListHeader>
            <div style={{ flex: 1 }}>Name</div>
            <div style={{ width: 60 }}>Size</div>
          </ListHeader>
          <Rows>
            <Empty>
              There is no writable CD or portable device attached to this
              computer.
            </Empty>
          </Rows>
        </CopyHalf>
      </CopyColumns>
    </Pane>
  );
}

/* ---- Media Library ------------------------------------------------------ */

const TREE = [
  { id: 'root', label: 'Media Library', depth: 0 },
  { id: 'audio', label: 'Audio', depth: 1 },
  { id: 'all-audio', label: 'All Audio', depth: 2 },
  { id: 'album', label: 'Album', depth: 2 },
  { id: 'artist', label: 'Artist', depth: 2 },
  { id: 'genre', label: 'Genre', depth: 2 },
  { id: 'video', label: 'Video', depth: 1 },
  { id: 'all-clips', label: 'All Clips', depth: 2 },
  { id: 'author', label: 'Author', depth: 2 },
  { id: 'playlists', label: 'My Playlists', depth: 1 },
  { id: 'presets', label: 'Radio Tuner Presets', depth: 1 },
  { id: 'deleted', label: 'Deleted Items', depth: 1 },
];

// Fixed widths that the user can drag, and the list scrolls sideways when
// they outgrow the pane — Windows' details view never stretches a column.
const LIB_COLUMNS = [
  // Sized so the five fit the library at the window's default width
  { id: 'title', label: 'Name', width: 162 },
  { id: 'artist', label: 'Artist', width: 88 },
  { id: 'album', label: 'Album', width: 94 },
  { id: 'track', label: 'Track', width: 36 },
  { id: 'length', label: 'Length', width: 46 },
];

/** Compare two rows on one column; blanks sort last, not first. */
function compareOn(a, b, key) {
  if (key === 'track') {
    const left = Number(a.track) || Infinity;
    const right = Number(b.track) || Infinity;
    return left === right ? 0 : left - right;
  }
  if (key === 'length') return (a.duration || 0) - (b.duration || 0);
  if (key === 'title') return (a.title || '').localeCompare(b.title || '');
  return orUnknown(a[key], key).localeCompare(orUnknown(b[key], key));
}

/**
 * Sort by one column, then — always ascending, whichever way the column runs
 * — by track number and title, so the songs inside an album stay in playing
 * order instead of falling back to alphabetical.
 */
function sortTracks(rows, key, ascending) {
  const direction = ascending ? 1 : -1;
  return [...rows].sort((a, b) => {
    const primary = compareOn(a, b, key);
    if (primary) return primary * direction;
    return compareOn(a, b, 'track') || compareOn(a, b, 'title');
  });
}

export function MediaLibrary({
  tracks,
  currentId,
  onPlay,
  playlists = [],
  playlistTracksFor,
  onNewPlaylist,
  onDeletePlaylist,
  onRemoveFromPlaylist,
  onTrackMenu,
  onSearch,
  deletedTracks = [],
  onReorder,
  onEmptyDeleted,
  onEditTags,
  onDeleteFromLibrary,
  onTreeMenu,
  onOrderChange,
}) {
  const [node, setNode] = useState('all-audio');
  // Windows list-view selection: click replaces it, Ctrl toggles one row,
  // Shift takes the run between the anchor and the row clicked.
  const [selected, setSelected] = useState(() => new Set());
  // Which half of the window the toolbar's Delete button acts on: the tree
  // deletes the playlist, the list deletes the rows in it.
  const [focusPane, setFocusPane] = useState('tree');
  // { field, ids, anchor, initial } while a cell is being typed into
  const [editing, setEditing] = useState(null);
  // null means the order the branch comes in — the library's own, or a
  // playlist's — until a column header is clicked
  const [sortBy, setSortBy] = useState(null);
  const [sortAsc, setSortAsc] = useState(true);
  const anchorRef = useRef(null);
  const rowsRef = useRef(null);
  const { widths, beginResize, autoSize } = useColumns(
    'wmp.library',
    LIB_COLUMNS,
  );

  // "My Playlists" grows a child per saved playlist.
  const tree = useMemo(() => {
    const out = [];
    for (const item of TREE) {
      out.push(item);
      if (item.id === 'playlists')
        for (const p of playlists)
          out.push({
            id: `pl:${p.path}`,
            label: p.name,
            depth: 2,
            playlist: p,
          });
    }
    return out;
  }, [playlists]);

  const openPlaylist = node.startsWith('pl:')
    ? playlists.find(p => `pl:${p.path}` === node)
    : null;

  const rowsFor = id => {
    const playlist = id.startsWith('pl:')
      ? playlists.find(p => `pl:${p.path}` === id)
      : null;
    if (playlist) return playlistTracksFor ? playlistTracksFor(playlist) : [];
    if (id === 'all-clips' || id === 'author')
      return tracks.filter(t => t.kind === 'video');
    if (id === 'deleted') return deletedTracks;
    if (id === 'playlists' || id === 'presets') return [];
    if (id === 'video') return tracks.filter(t => t.kind === 'video');
    if (id === 'root') return tracks;
    return tracks.filter(t => t.kind === 'audio');
  };

  const rows = useMemo(
    () => rowsFor(node),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tracks, node, openPlaylist, playlists, deletedTracks],
  );

  // Album / Artist / Genre sort the same list by that column, which is what
  // picking those branches did before you drilled into a specific one.
  /**
   * The order a branch is listed in. Album, Artist and Genre are the same list
   * grouped by that column — what picking those branches did before you
   * drilled into one — and a playlist keeps its own order until a header is
   * clicked. Now Playing is handed this too, so what you see is what plays.
   */
  const orderFor = id => {
    const list = rowsFor(id);
    const branchKey = { album: 'album', artist: 'artist', genre: 'genre' }[id];
    const key = sortBy || branchKey;
    if (!key) return list;
    if (!sortBy && (id.startsWith('pl:') || id === 'deleted')) return list;
    return sortTracks(list, key, sortAsc);
  };

  const sorted = useMemo(
    () => orderFor(node),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, node, openPlaylist, sortBy, sortAsc],
  );

  /** What Now Playing calls this list once something in it is played. */
  const listLabel = openPlaylist
    ? openPlaylist.name
    : (tree.find(item => item.id === node) || {}).label || 'All Audio';

  // Re-sorting the branch you are looking at re-orders Now Playing with it,
  // as long as that is where the current list came from.
  useEffect(() => {
    if (onOrderChange)
      onOrderChange(
        listLabel,
        sorted.map(t => t.path),
      );
  }, [onOrderChange, listLabel, sorted]);

  /** Clicking a header sorts by it; clicking the same one again reverses. */
  const sortOn = id => {
    setEditing(null);
    if (sortBy === id) setSortAsc(v => !v);
    else {
      setSortBy(id);
      setSortAsc(true);
    }
  };

  // Rows can be dragged into a new order wherever the order is the user's:
  // a playlist, or the library's own list. The grouped views are sorted, so
  // there is nothing to rearrange there.
  const canReorder =
    !!onReorder &&
    !sortBy &&
    (!!openPlaylist || node === 'all-audio' || node === 'root');
  const dragFrom = useRef(null);

  const selectRow = (event, track) => {
    const ids = sorted.map(t => t.id);
    if (event.shiftKey && anchorRef.current != null) {
      const from = ids.indexOf(anchorRef.current);
      const to = ids.indexOf(track.id);
      if (from >= 0 && to >= 0) {
        const [a, b] = from < to ? [from, to] : [to, from];
        setSelected(new Set(ids.slice(a, b + 1)));
        return;
      }
    }
    if (event.ctrlKey || event.metaKey) {
      setSelected(prev => {
        const next = new Set(prev);
        if (next.has(track.id)) next.delete(track.id);
        else next.add(track.id);
        return next;
      });
      anchorRef.current = track.id;
      return;
    }
    setSelected(new Set([track.id]));
    anchorRef.current = track.id;
  };

  /**
   * Start typing into a column. `rows` is what the menu was raised on, so a
   * multiple selection edits that column on every row at once — the real
   * player's "Edit Selected Items".
   */
  const beginEdit = (field, rows) => {
    if (!onEditTags || !rows || !rows.length) return;
    const column = LIBRARY_EDITABLE.includes(field) ? field : 'title';
    setEditing({
      field: column,
      ids: rows.map(r => r.id),
      anchor: rows[0].id,
      initial: rows[0][column] || '',
    });
  };

  const commitEdit = value => {
    const pending = editing;
    setEditing(null);
    if (pending && onEditTags) onEditTags(pending.ids, pending.field, value);
  };

  /** Move a row one place up or down the order the user controls. */
  const moveBy = (rows, delta) => {
    if (!canReorder || !rows || rows.length !== 1) return;
    const from = sorted.findIndex(t => t.id === rows[0].id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= sorted.length) return;
    onReorder(openPlaylist, sorted[from].id, sorted[to].id);
  };

  const selectedRows = () => sorted.filter(t => selected.has(t.id));

  /** One list cell, or the edit box when this is the cell being typed into. */
  const cellFor = (track, field, text) => (
    <div data-col={field} style={{ width: widths[field] }}>
      {editing && editing.field === field && editing.anchor === track.id ? (
        <CellEditor
          initial={editing.initial}
          onCommit={commitEdit}
          onCancel={() => setEditing(null)}
        />
      ) : (
        text
      )}
    </div>
  );

  const onListKeyDown = event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
      event.preventDefault();
      setSelected(new Set(sorted.map(t => t.id)));
      return;
    }
    if (event.key === 'F2' && selected.size) {
      event.preventDefault();
      beginEdit('title', selectedRows());
    }
  };

  // The toolbar's Delete acts on whichever half was last clicked: a playlist
  // picked in the tree, or the rows picked in the list.
  const deleteTarget = () => {
    if (focusPane === 'tree') return openPlaylist ? 'playlist' : null;
    if (!selected.size) return openPlaylist ? 'playlist' : null;
    if (openPlaylist) return 'rows';
    return node === 'deleted' || !onDeleteFromLibrary ? null : 'library';
  };

  const runDelete = () => {
    const target = deleteTarget();
    if (target === 'playlist')
      onDeletePlaylist(openPlaylist).then(gone => {
        if (gone) setNode('all-audio');
      });
    else if (target === 'rows') {
      for (const track of selectedRows())
        onRemoveFromPlaylist(openPlaylist, track);
      setSelected(new Set());
    } else if (target === 'library') {
      onDeleteFromLibrary(selectedRows());
      setSelected(new Set());
    }
  };

  return (
    <Pane>
      <Toolbar>
        <ToolButton onClick={onNewPlaylist}>New playlist</ToolButton>
        <ToolButton disabled={!deleteTarget()} onClick={runDelete}>
          Delete
        </ToolButton>
        <ToolButton onClick={onSearch}>Search</ToolButton>
        {node === 'deleted' && (
          <ToolButton onClick={onEmptyDeleted} disabled={!deletedTracks.length}>
            Empty Deleted Items
          </ToolButton>
        )}
      </Toolbar>
      <Split>
        <Tree onMouseDown={() => setFocusPane('tree')}>
          {tree.map(item => (
            <TreeNode
              key={item.id}
              $depth={item.depth}
              $selected={node === item.id}
              onClick={() => {
                setNode(item.id);
                setSelected(new Set());
                setEditing(null);
              }}
              onContextMenu={e => {
                // right-clicking a branch picks it first, as Explorer does
                setFocusPane('tree');
                setEditing(null);
                if (node !== item.id) {
                  setNode(item.id);
                  setSelected(new Set());
                }
                if (onTreeMenu)
                  onTreeMenu(e, item, {
                    rows: orderFor(item.id),
                    selected:
                      node === item.id
                        ? rowsFor(item.id).filter(t => selected.has(t.id))
                        : [],
                    setNode,
                  });
              }}
            >
              {item.label}
            </TreeNode>
          ))}
        </Tree>
        <ListArea onMouseDown={() => setFocusPane('list')}>
          <ListScroller ref={rowsRef} tabIndex={0} onKeyDown={onListKeyDown}>
            <ListHeader>
              {LIB_COLUMNS.map(c => (
                <div
                  key={c.id}
                  style={{ width: widths[c.id], flex: 'none' }}
                  onClick={() => sortOn(c.id)}
                >
                  {c.label}
                  {sortBy === c.id ? (sortAsc ? ' ▲' : ' ▼') : ''}
                  <ColumnDivider
                    columnId={c.id}
                    onResize={beginResize}
                    onAutoSize={id => autoSize(id, rowsRef.current)}
                  />
                </div>
              ))}
            </ListHeader>
            {sorted.length === 0 ? (
              <Empty>
                {openPlaylist
                  ? 'This playlist is empty. Right-click a track in the library and choose Add to playlist.'
                  : node === 'deleted'
                  ? 'no deleted items'
                  : 'There are no items in this category. Use Search, or File > Add to Media Library, to add media.'}
              </Empty>
            ) : (
              sorted.map(track => (
                <ListRow
                  key={track.id}
                  $selected={selected.has(track.id) || currentId === track.id}
                  draggable={canReorder}
                  onDragStart={() => {
                    dragFrom.current = track.id;
                  }}
                  onDragOver={e => canReorder && e.preventDefault()}
                  onDrop={e => {
                    if (!canReorder) return;
                    e.preventDefault();
                    const from = dragFrom.current;
                    dragFrom.current = null;
                    if (from && from !== track.id)
                      onReorder(openPlaylist, from, track.id);
                  }}
                  onClick={e => selectRow(e, track)}
                  onDoubleClick={() => onPlay(track, sorted, listLabel)}
                  onContextMenu={e => {
                    // right-clicking outside the selection replaces it, as in
                    // Explorer; inside it, the whole selection is acted on
                    const chosen = selected.has(track.id)
                      ? sorted.filter(t => selected.has(t.id))
                      : [track];
                    if (!selected.has(track.id)) {
                      setSelected(new Set([track.id]));
                      anchorRef.current = track.id;
                    }
                    setEditing(null);
                    setFocusPane('list');
                    // Edit works on the column that was clicked, so remember it
                    const cell = e.target.closest('[data-col]');
                    if (onTrackMenu)
                      onTrackMenu(e, chosen, {
                        playlist: openPlaylist,
                        library: !openPlaylist && node !== 'deleted',
                        deleted: node === 'deleted',
                        column: cell ? cell.dataset.col : 'title',
                        canEdit: !!onEditTags && node !== 'deleted',
                        canReorder,
                        beginEdit,
                        moveBy,
                      });
                  }}
                >
                  {cellFor(track, 'title', track.title)}
                  {cellFor(track, 'artist', orUnknown(track.artist, 'artist'))}
                  {cellFor(track, 'album', orUnknown(track.album, 'album'))}
                  {cellFor(track, 'track', track.track)}
                  <div data-col="length" style={{ width: widths.length }}>
                    {formatTime(track.duration)}
                  </div>
                </ListRow>
              ))
            )}
          </ListScroller>
        </ListArea>
      </Split>
    </Pane>
  );
}

/* ---- Skin Chooser ------------------------------------------------------- */

// The skins that shipped in the box with the XP player.
const SKINS = [
  'Canvas',
  'Classic',
  'Goo',
  'Headspace',
  'Heart',
  'Optik',
  'Pyrite',
  'Radio',
  'Roundlet',
  'Rusty',
  'Toothy',
  'Windows Classic',
  'Windows XP',
];

const SkinList = styled.div`
  flex: none;
  width: 190px;
  overflow: auto;
  border-right: 1px solid #2b3566;
`;

const SkinPreview = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: #c8c8d8;
  font-size: 11px;

  .wmp__skin-frame {
    width: 240px;
    height: 150px;
    border: 1px solid #4a5aa0;
    background: #05060f;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #6f7699;
    margin-bottom: 10px;
  }
  .wmp__skin-name {
    font-weight: bold;
    color: #fff;
  }
`;

export function SkinChooser() {
  const [skin, setSkin] = useState(SKINS[1]);
  return (
    <Pane>
      <Toolbar>
        <ToolButton disabled>Apply Skin</ToolButton>
        <ToolButton disabled>More Skins</ToolButton>
        <ToolButton disabled>Delete</ToolButton>
      </Toolbar>
      <Split>
        <SkinList>
          {SKINS.map(name => (
            <TreeNode
              key={name}
              $depth={0}
              $selected={skin === name}
              onClick={() => setSkin(name)}
            >
              {name}
            </TreeNode>
          ))}
        </SkinList>
        <SkinPreview>
          <div className="wmp__skin-frame">Preview not available</div>
          <div className="wmp__skin-name">{skin}</div>
          <div>Microsoft Corporation</div>
        </SkinPreview>
      </Split>
    </Pane>
  );
}

export { PaneBody };
