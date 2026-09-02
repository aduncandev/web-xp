// The menu bar's verbs. WindowDropDowns reports the clicked label, so this
// is a dispatch on text; the labels come from menuData.js.
import { ALBUM_ART, NO_VIZ, VIZ_PRESETS } from './visualizations';
import { formatTime } from './library';
import { getBaseName } from '../../../context/vfsUtils';

const lines = parts => parts.join(String.fromCharCode(10));

export function runMenuItem(text, a) {
  if (VIZ_PRESETS.includes(text) || text === NO_VIZ || text === ALBUM_ART) {
    a.setVisualization(text);
    a.setTask('NowPlaying');
    return;
  }
  const { current, playback } = a;
  const isFile = current && !current.path.startsWith('url:');
  switch (text) {
    case 'Exit':
    case 'Close':
      a.onClose();
      break;
    case 'Play':
    case 'Pause':
      playback.togglePlay();
      break;
    case 'Stop':
      playback.stop();
      break;
    case 'Previous':
      playback.step(-1);
      break;
    case 'Next':
      playback.step(1);
      break;
    case 'Rewind':
      playback.nudge(-5);
      break;
    case 'Fast Forward':
      playback.nudge(5);
      break;
    case 'Repeat Off':
      a.setRepeatMode('off');
      break;
    case 'Repeat Playlist':
      a.setRepeatMode('all');
      break;
    case 'Repeat Track':
      a.setRepeatMode('one');
      break;
    case 'Shuffle':
      a.setShuffle(v => !v);
      break;
    case 'Open...':
      a.chooseFile();
      break;
    case 'Add File or Playlist...':
      a.setFileDialog({
        mode: 'open',
        onPick: path => {
          a.addToLibrary([path]);
          a.setTask('MediaLibrary');
        },
      });
      break;
    case 'Open URL...':
      a.openUrl();
      break;
    case 'Properties':
      if (isFile) a.setPropertiesPath(current.path);
      break;
    case 'Save Media As...':
      if (isFile)
        a.setFileDialog({
          mode: 'save',
          fileName: getBaseName(current.path),
          onPick: async dest => {
            const blob = await a.vfs.readBinaryFile(current.path);
            if (blob) a.vfs.createFile(dest, blob, blob.type);
          },
        });
      break;
    case 'Options...':
      a.setOptionsOpen(true);
      break;
    case 'Work Offline':
      a.setOffline(v => !v);
      break;
    case 'Refresh':
      a.setLibraryPaths(prev => (prev ? [...prev] : prev));
      break;
    case 'About Windows Media Player':
      a.alert(
        lines([
          'Windows Media Player',
          '',
          'Version 8.00.00.4477',
          '',
          'Copyright (C) 1992-2001 Microsoft Corporation',
        ]),
        'About Windows Media Player',
        { icon: 'info' },
      );
      break;
    case 'Statistics...':
      a.alert(
        current
          ? lines([
              current.title,
              '',
              'Length: ' + formatTime(current.duration),
              'Type: ' + (current.kind === 'video' ? 'Video' : 'Audio'),
              'File: ' + current.path,
            ])
          : 'No media is currently playing.',
        'Statistics',
        { icon: 'info' },
      );
      break;
    case 'Taskbar':
      a.setTaskbar(v => !v);
      break;
    case 'Show Title':
      a.setOption('showTitleBar', !a.options.showTitleBar);
      break;
    case 'Show Playlist':
      a.setShowPlaylist(v => !v);
      break;
    case 'Show Equalizer & Settings':
      a.setShowEqualizer(v => !v);
      break;
    case 'Full Mode':
      a.setTask('NowPlaying');
      break;
    case 'Full Screen':
      a.goFullScreen();
      break;
    case '50%':
      a.setVideoSize(50);
      break;
    case '100%':
      a.setVideoSize(100);
      break;
    case '200%':
      a.setVideoSize(200);
      break;
    case 'Fit to Window':
      a.setVideoSize(0);
      break;
    case 'New Playlist...':
      a.newPlaylist().then(created => {
        if (!created) return;
        a.setTask('MediaLibrary');
        a.setPlaylistName(created.name);
      });
      break;
    case 'Search for Media Files...':
      a.runSearch();
      break;
    case 'Add Currently Playing Track':
      if (isFile) {
        const n = a.addToLibrary([current.path]);
        a.setTask('MediaLibrary');
        if (!n)
          a.alert(
            'That item is already in your Media Library.',
            'Media Library',
            {
              icon: 'info',
            },
          );
      }
      break;
    case 'Add Current Playlist to Media Library':
      a.addToLibrary(
        a.queue.filter(t => !t.path.startsWith('url:')).map(t => t.path),
      );
      a.setTask('MediaLibrary');
      break;
    case 'Windows Media Home Page':
    case 'Product News':
      a.setTask('MediaGuide');
      break;
    default:
      break;
  }
}
