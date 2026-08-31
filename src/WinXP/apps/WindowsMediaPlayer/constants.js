/*
 * Fixed data the player shell renders from: the feature taskbar's captions
 * and tooltips, the Open dialog's filter list and a couple of skin
 * measurements. Nothing here closes over component state.
 */

/* Captions are RT_STRING #1250-#1256 and the tooltips #1257-#1263. */
export const FEATURES = [
  ['NowPlaying', 'Now\nPlaying', 'Watch currently playing media'],
  ['MediaGuide', 'Media\nGuide', 'Find media on the Internet'],
  ['CDAudio', 'Copy\nfrom CD', 'Copy and play CD Audio tracks'],
  ['MediaLibrary', 'Media\nLibrary', 'Create playlists and manage media'],
  ['RadioTuner', 'Radio\nTuner', 'Tune into streaming radio stations'],
  [
    'PortableDevice',
    'Copy to CD\nor Device',
    'Copy files to portable devices and recordable CDs',
  ],
  ['SkinViewer', 'Skin\nChooser', 'Select and apply a skin'],
];

export const CD_DRIVE = 'D:';

/* What File > Open will show, in the order the real dialog lists it. */
export const OPEN_FILTERS = [
  {
    label: 'All Media Files (*.asf;*.wm*;*.mp3;*.wav;*.mp4;*.m3u;*.avi;*.ogg)',
    extensions: [
      '.mp3',
      '.wav',
      '.ogg',
      '.oga',
      '.m4a',
      '.aac',
      '.wma',
      '.flac',
      '.mp4',
      '.webm',
      '.ogv',
      '.mkv',
      '.avi',
      '.wmv',
      '.mpg',
      '.mpeg',
      '.mov',
      '.m3u',
    ],
  },
  {
    label: 'Audio Files',
    extensions: [
      '.mp3',
      '.wav',
      '.ogg',
      '.oga',
      '.m4a',
      '.aac',
      '.wma',
      '.flac',
    ],
  },
  {
    label: 'Video Files',
    extensions: [
      '.mp4',
      '.webm',
      '.ogv',
      '.mkv',
      '.avi',
      '.wmv',
      '.mpg',
      '.mpeg',
      '.mov',
    ],
  },
  { label: 'Playlists (*.m3u)', extensions: ['.m3u'] },
  { label: 'All Files (*.*)', extensions: null },
];

export const PLAYLIST_W = 194;
export const MARQUEE_PERIOD = 4000; // the skin's own timerInterval
