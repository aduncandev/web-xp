const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, '');

const createMedia = (type, relativePath, title, artist = '', duration = 0) => ({
  url: `${BASE_PATH}${relativePath}`,
  type,
  title,
  artist,
  duration,
  id: Math.random()
    .toString(36)
    .substr(2, 9),
});

const musicTracks = [
  createMedia(
    'audio',
    '/music/addiction.wav',
    'Addiction',
    'Jogeir Liljedahl',
    288,
  ),
  createMedia(
    'audio',
    '/music/youwillknow.mp3',
    'You Will Know Our Names',
    'Kenji Hiramatsu',
    161,
  ),
  createMedia(
    'audio',
    '/music/music1.wav',
    'Music 1',
    'Skillz Productions',
    118,
  ),
  createMedia(
    'audio',
    '/music/EternalDepthsOfHell.mp3',
    'Eternal Depths Of Hell',
    'Skillz Productions',
    118,
  ),
  createMedia(
    'audio',
    '/music/AudioWavesOfPainAndSuffering.mp3',
    'Audio Waves Of Pain And Suffering',
    'Skillz Productions',
    118,
  ),
  createMedia(
    'audio',
    '/music/MIKEtheBOARDpleasey.wav',
    'MIKE, the BOARD, please! (Skillz Productions Remake)',
    'Toby Fox',
    118,
  ),
  createMedia('audio', '/music/man.ogg', 'man', 'Toby Fox', 11),
  createMedia('audio', '/music/robocop.mp3', 'robocop.mp3', 'Kombat Unit', 118),
];

const videoTracks = [
  // createMedia('video', '/videos/demo.mp4', 'My Cool Video'),
];

const imageTracks = [
  // createMedia('image', '/photos/wallpaper.jpg', 'Cool Wallpaper'),
];

export const mediaLibrary = {
  'My Music': musicTracks,
  Videos: videoTracks,
  Photos: imageTracks,
  'All Tracks': [...musicTracks, ...videoTracks, ...imageTracks],
};
