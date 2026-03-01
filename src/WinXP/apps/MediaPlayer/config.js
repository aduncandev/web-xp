// --- CONFIGURATION SETTINGS ---
const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, '');

/**
 * Helper to create media objects efficiently.
 * Includes ID generation for Drag & Drop functionality.
 */
const createMedia = (type, relativePath, title, artist = '', duration = 0) => ({
  url: `${BASE_PATH}${relativePath}`,
  type,
  title,
  artist,
  duration, // Optional: The player detects this automatically now, but keeping it doesn't hurt
  // Generate a unique ID for drag-and-drop tracking
  id: Math.random()
    .toString(36)
    .substr(2, 9),
});

// --- DEFINE YOUR FOLDERS HERE ---

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

// --- EXPORT ---
// The new player expects "mediaLibrary", not "initialTracks"
export const mediaLibrary = {
  'My Music': musicTracks,
  Videos: videoTracks,
  Photos: imageTracks,
  'All Tracks': [...musicTracks, ...videoTracks, ...imageTracks],
};
