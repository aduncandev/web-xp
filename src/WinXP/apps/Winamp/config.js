const album = 'N/A';

export const initialTracks = [
  {
    url: `${process.env.PUBLIC_URL}/music/addiction.wav`,
    duration: 288,
    metaData: {
      title: 'Addiction',
      artist: 'Jogeir Liljedahl',
      album,
    },
  },
  {
    url: `${process.env.PUBLIC_URL}/music/youwillknow.mp3`,
    duration: 161,
    metaData: {
      title: 'You Will Know Our Names (Definitive Edition ver.)',
      artist: 'Kenji Hiramatsu',
      album,
    },
  },
  {
    url: `${process.env.PUBLIC_URL}/music/man.ogg`,
    duration: 11,
    metaData: {
      title: 'man',
      artist: 'Toby Fox',
      album,
    },
  },
  {
    url: `${process.env.PUBLIC_URL}/music/robocop.mp3`,
    duration: 118,
    metaData: {
      title: 'robocop.mp3',
      artist: 'Kombat Unit',
      album,
    },
  },
  {
    url: `${process.env.PUBLIC_URL}/music/meowtheboard.mp3`,
    duration: 118,
    metaData: {
      title:
        'MIKE, the BOARD, please! (MeowSynth Edition) (The real mike version)',
      artist: 'Toby Fox... and uhh me I guess?',
      album,
    },
  },
];
