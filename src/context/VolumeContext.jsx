import React, { createContext, useState, useEffect, useContext } from 'react';

const VolumeContext = createContext();

export const useVolume = () => useContext(VolumeContext);

export const VolumeProvider = ({ children }) => {
  const [volume, setVolume] = useState(() => {
    const savedVolume = localStorage.getItem('siteVolume');
    return savedVolume !== null ? JSON.parse(savedVolume) : 50;
  });

  const [isMuted, setIsMuted] = useState(() => {
    const savedMute = localStorage.getItem('siteMuted');
    return savedMute !== null ? JSON.parse(savedMute) : false;
  });

  useEffect(() => {
    localStorage.setItem('siteVolume', JSON.stringify(volume));
  }, [volume]);

  useEffect(() => {
    localStorage.setItem('siteMuted', JSON.stringify(isMuted));
  }, [isMuted]);

  const applyVolume = audio => {
    if (audio) {
      audio.volume = volume / 100;
      audio.muted = isMuted;
    }
  };

  return (
    <VolumeContext.Provider
      value={{ volume, setVolume, isMuted, setIsMuted, applyVolume }}
    >
      {children}
    </VolumeContext.Provider>
  );
};
