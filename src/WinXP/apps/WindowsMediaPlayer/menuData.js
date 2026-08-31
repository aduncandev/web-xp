// Windows Media Player 8 menu bar. Item names, order and accelerators are
// the stock ones; anything the recreation has no hardware or network for
// (CD drives, windowsmedia.com, licences) is present and greyed, the way
// the real player greys them when the feature is unavailable.

import { ALBUM_ART, NO_VIZ, VIZ_FAMILIES } from './visualizations';

const radio = (text, current) => ({
  type: 'item',
  text,
  symbol: current === text ? 'circle' : undefined,
});

// Only the visualizations that are actually installed appear, which is how
// the real player builds this menu too.
// Built from the installed set, so the menu grows with it. A family with a
// single unnamed preset (Scope) is a plain item, like the real player's.
const vizMenu = current => [
  radio(ALBUM_ART, current),
  { type: 'separator' },
  ...VIZ_FAMILIES.map(family =>
    family.presets
      ? {
          type: 'menu',
          text: family.name,
          items: family.presets.map(preset =>
            radio(`${family.name}: ${preset}`, current),
          ),
        }
      : radio(family.name, current),
  ),
  { type: 'separator' },
  radio(NO_VIZ, current),
];

export default function buildMenus(state) {
  const {
    playing,
    shuffle,
    repeat,
    offline,
    muted,
    taskbar,
    showPlaylist,
    showTitle,
    showEqualizer,
    visualization,
    videoSize,
  } = state;
  return {
    File: [
      { type: 'item', text: 'Open...', hotkey: 'Ctrl+O' },
      { type: 'item', text: 'Open URL...', hotkey: 'Ctrl+U' },
      { type: 'item', text: 'Close', hotkey: 'Ctrl+W' },
      { type: 'separator' },
      {
        type: 'menu',
        text: 'Add to Media Library',
        items: [
          { type: 'item', text: 'Add Currently Playing Track' },
          { type: 'item', text: 'Add File or Playlist...' },
          { type: 'item', text: 'Add Current Playlist to Media Library' },
          { type: 'separator' },
          { type: 'item', text: 'Search Computer for Media Files...' },
        ],
      },
      { type: 'separator' },
      { type: 'item', text: 'New Playlist...' },
      { type: 'item', text: 'Save Media As...' },
      { type: 'separator' },
      { type: 'item', text: 'Properties' },
      { type: 'separator' },
      {
        type: 'item',
        text: 'Work Offline',
        symbol: offline ? 'check' : undefined,
      },
      { type: 'item', text: 'Exit' },
    ],
    View: [
      { type: 'item', text: 'Full Mode', hotkey: 'Ctrl+1', symbol: 'circle' },
      { type: 'item', text: 'Skin Mode', hotkey: 'Ctrl+2', disable: true },
      { type: 'separator' },
      {
        type: 'menu',
        text: 'Now Playing Tools',
        items: [
          {
            type: 'item',
            text: 'Show Title',
            symbol: showTitle ? 'check' : undefined,
          },
          {
            type: 'item',
            text: 'Show Playlist',
            symbol: showPlaylist ? 'check' : undefined,
          },
          {
            type: 'item',
            text: 'Show Equalizer & Settings',
            symbol: showEqualizer ? 'check' : undefined,
          },
        ],
      },
      {
        type: 'item',
        text: 'Taskbar',
        symbol: taskbar ? 'check' : undefined,
      },
      { type: 'separator' },
      { type: 'menu', text: 'Visualizations', items: vizMenu(visualization) },
      { type: 'separator' },
      {
        type: 'menu',
        text: 'Video Size',
        items: [
          {
            type: 'item',
            text: '50%',
            symbol: videoSize === 50 ? 'circle' : undefined,
          },
          {
            type: 'item',
            text: '100%',
            symbol: videoSize === 100 ? 'circle' : undefined,
          },
          {
            type: 'item',
            text: '200%',
            symbol: videoSize === 200 ? 'circle' : undefined,
          },
          {
            type: 'item',
            text: 'Fit to Window',
            symbol: videoSize === 0 ? 'circle' : undefined,
          },
        ],
      },
      { type: 'item', text: 'Full Screen', hotkey: 'Alt+Enter' },
      { type: 'separator' },
      { type: 'item', text: 'Statistics...' },
      { type: 'item', text: 'Refresh', hotkey: 'F5' },
    ],
    Play: [
      { type: 'item', text: playing ? 'Pause' : 'Play', hotkey: 'Ctrl+P' },
      { type: 'item', text: 'Stop', hotkey: 'Ctrl+S' },
      { type: 'separator' },
      { type: 'item', text: 'Previous', hotkey: 'Ctrl+B' },
      { type: 'item', text: 'Next', hotkey: 'Ctrl+F' },
      { type: 'item', text: 'Rewind', hotkey: 'Ctrl+Shift+B' },
      { type: 'item', text: 'Fast Forward', hotkey: 'Ctrl+Shift+F' },
      { type: 'separator' },
      {
        type: 'item',
        text: 'Shuffle',
        hotkey: 'Ctrl+H',
        symbol: shuffle ? 'check' : undefined,
      },
      {
        type: 'menu',
        text: 'Repeat',
        items: [
          {
            type: 'item',
            text: 'Repeat Off',
            symbol: repeat === 'off' ? 'circle' : undefined,
          },
          {
            type: 'item',
            text: 'Repeat Playlist',
            hotkey: 'Ctrl+T',
            symbol: repeat === 'all' ? 'circle' : undefined,
          },
          {
            type: 'item',
            text: 'Repeat Track',
            symbol: repeat === 'one' ? 'circle' : undefined,
          },
        ],
      },
      { type: 'separator' },
      {
        type: 'menu',
        text: 'Volume',
        items: [
          { type: 'item', text: 'Up' },
          { type: 'item', text: 'Down' },
          { type: 'item', text: 'Mute', symbol: muted ? 'check' : undefined },
        ],
      },
      { type: 'separator' },
      {
        type: 'menu',
        text: 'Captions',
        items: [
          { type: 'item', text: 'Off', symbol: 'circle' },
          { type: 'item', text: 'On', disable: true },
        ],
      },
      {
        type: 'menu',
        text: 'Audio and Language Tracks',
        items: [{ type: 'item', text: 'Default', symbol: 'circle' }],
      },
    ],
    Tools: [
      { type: 'item', text: 'Search for Media Files...', hotkey: 'F3' },
      { type: 'separator' },
      {
        type: 'menu',
        text: 'Licenses',
        items: [
          { type: 'item', text: 'Back Up Licenses...', disable: true },
          { type: 'item', text: 'Restore Licenses...', disable: true },
        ],
      },
      { type: 'separator' },
      { type: 'item', text: 'Options...' },
    ],
    Help: [
      { type: 'item', text: 'Contents', hotkey: 'F1', disable: true },
      { type: 'separator' },
      {
        type: 'menu',
        text: 'Windows Media Player on the Web',
        items: [
          { type: 'item', text: 'Windows Media Home Page' },
          { type: 'item', text: 'Product News' },
        ],
      },
      { type: 'item', text: 'Check for Player Updates', disable: true },
      { type: 'separator' },
      { type: 'item', text: 'About Windows Media Player' },
    ],
  };
}
