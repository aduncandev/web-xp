const album = 'N/A';

export const initialTracks = [
  {
    url: `${import.meta.env.BASE_URL}music/addiction.wav`,
    duration: 288,
    metaData: {
      title: 'Addiction',
      artist: 'Jogeir Liljedahl',
      album,
    },
  },
  {
    url: `${import.meta.env.BASE_URL}music/youwillknow.mp3`,
    duration: 161,
    metaData: {
      title: 'You Will Know Our Names (Definitive Edition ver.)',
      artist: 'Kenji Hiramatsu',
      album,
    },
  },
  {
    url: `${import.meta.env.BASE_URL}music/man.ogg`,
    duration: 11,
    metaData: {
      title: 'man',
      artist: 'Toby Fox',
      album,
    },
  },
  {
    url: `${import.meta.env.BASE_URL}music/robocop.mp3`,
    duration: 118,
    metaData: {
      title: 'robocop.mp3',
      artist: 'Kombat Unit',
      album,
    },
  },
  {
    url: `${import.meta.env.BASE_URL}music/MIKEtheBOARDpleasey.wav`,
    duration: 118,
    metaData: {
      title: 'MIKE, the BOARD, please!',
      artist: 'Toby Fox (but I remade it in FL)',
      album,
    },
  },
];
